from datetime import datetime, date, timedelta
from collections import defaultdict
from transformers import pipeline

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.contrib.auth.models import User
from django.utils import timezone

from journals.models import JournalEntry
from .models import Alert

# ==============================================================================
# COMPLIANCE NOTICE: Alert data is only accessible to providers assigned to the
# patient (or admins). In a production deployment, add fine-grained permission
# checks and audit logging for every alert read/write.
# ==============================================================================


# Load pretrained sentiment analysis model (loaded once at startup)
sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
)


def analyze_sentiment(text):
    """
    Analyze text and return sentiment label and confidence score.
    Safely handles long text up to the model's maximum sequence length.
    """
    if not text or not text.strip():
        return {"sentiment": "NEUTRAL", "confidence": 0.0}

    try:
        result = sentiment_analyzer(
            text,
            truncation=True,
            max_length=512,
        )[0]
        return {
            "sentiment": result["label"],
            "confidence": round(float(result["score"]) * 100, 2),
        }
    except Exception:
        return {"sentiment": "NEUTRAL", "confidence": 0.0}


# ---------------------------------------------------------------------------
# Patient-facing: Mood analytics summary + per-entry chart data (legacy/simple)
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mood_summary(request):
    """
    Returns aggregate mood statistics and a per-entry time-series list
    for backwards-compatibility.
    """
    entries = JournalEntry.objects.filter(user=request.user).order_by("created_at")

    total_entries = entries.count()
    positive_entries = entries.filter(sentiment="POSITIVE").count()
    negative_entries = entries.filter(sentiment="NEGATIVE").count()

    if total_entries > 0:
        total_confidence = sum(float(e.confidence or 0) for e in entries)
        average_confidence = round(total_confidence / total_entries, 2)
    else:
        average_confidence = 0.0

    chart_data = []
    for entry in entries.order_by("-created_at")[:30]:
        sentiment_score = (
            1 if entry.sentiment == "POSITIVE"
            else -1 if entry.sentiment == "NEGATIVE"
            else 0
        )
        chart_data.append({
            "date": entry.created_at.strftime("%b %d"),
            "sentiment_score": sentiment_score,
            "confidence": float(entry.confidence or 0),
            "title": entry.title,
        })

    chart_data.reverse()

    return Response({
        "total_entries": total_entries,
        "positive_entries": positive_entries,
        "negative_entries": negative_entries,
        "average_confidence": average_confidence,
        "chart_data": chart_data,
    })


def _calculate_streak(user):
    """
    Calculate the current consecutive-day journaling streak ending today or yesterday.
    """
    entries = JournalEntry.objects.filter(user=user).order_by("-created_at")
    if not entries.exists():
        return 0

    distinct_dates = sorted(
        {e.created_at.date() for e in entries},
        reverse=True
    )
    if not distinct_dates:
        return 0

    today = timezone.localdate() if hasattr(timezone, "localdate") else date.today()
    yesterday = today - timedelta(days=1)

    # Streak must connect to today or yesterday
    if distinct_dates[0] not in (today, yesterday):
        return 0

    streak = 1
    current_date = distinct_dates[0]
    for d in distinct_dates[1:]:
        if d == current_date - timedelta(days=1):
            streak += 1
            current_date = d
        else:
            break

    return streak


# ---------------------------------------------------------------------------
# Phase 4: Non-clinical patient insights endpoint
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def insights(request):
    """
    GET /api/analysis/insights/?range=7|30|90
    Returns:
    - day-by-day trend series for a line/area chart
    - distribution breakdown (positive, negative, mixed_neutral)
    - current journaling streak (consecutive days)
    - 2-4 plain-language headline strings generated server-side
    - percent change versus previous period of same length
    """
    range_param = request.query_params.get("range", "30")
    try:
        days = int(range_param)
        if days not in (7, 30, 90):
            days = 30
    except (ValueError, TypeError):
        days = 30

    today = timezone.localdate() if hasattr(timezone, "localdate") else date.today()
    start_date = today - timedelta(days=days - 1)
    prev_start_date = start_date - timedelta(days=days)
    prev_end_date = start_date - timedelta(days=1)

    user = request.user

    # Current period entries
    current_entries = list(
        JournalEntry.objects.filter(
            user=user,
            created_at__date__gte=start_date,
            created_at__date__lte=today
        ).order_by("created_at")
    )

    # Previous period entries for comparison
    prev_entries = list(
        JournalEntry.objects.filter(
            user=user,
            created_at__date__gte=prev_start_date,
            created_at__date__lte=prev_end_date
        )
    )

    total_current = len(current_entries)
    total_prev = len(prev_entries)

    # Percent change versus previous period of same length
    if total_prev > 0:
        percent_change = round(((total_current - total_prev) / total_prev) * 100, 1)
    elif total_current > 0:
        percent_change = 100.0
    else:
        percent_change = 0.0

    # Classify sentiments (bucket low-confidence < 60% as mixed/neutral per prompt decision)
    positive_count = 0
    negative_count = 0
    mixed_count = 0

    day_entries_map = defaultdict(list)

    for entry in current_entries:
        c_date = entry.created_at.date()
        conf = float(entry.confidence or 0.0)
        sent = entry.sentiment

        if conf < 60.0 or sent == "NEUTRAL":
            mixed_count += 1
            score = 0
            label = "Mixed"
        elif sent == "POSITIVE":
            positive_count += 1
            score = 1
            label = "Positive"
        else:
            negative_count += 1
            score = -1
            label = "Negative"

        day_entries_map[c_date].append({
            "score": score,
            "confidence": conf,
            "title": entry.title or "Journal Entry",
            "sentiment": sent,
            "label": label,
        })

    # Day-by-day trend series across full date range
    trend_series = []
    curr = start_date
    while curr <= today:
        date_label = curr.strftime("%b %d")
        entries_on_day = day_entries_map.get(curr, [])
        if entries_on_day:
            avg_score = round(sum(e["score"] for e in entries_on_day) / len(entries_on_day), 2)
            avg_conf = round(sum(e["confidence"] for e in entries_on_day) / len(entries_on_day), 1)
            primary_label = (
                "Positive" if avg_score > 0.3
                else "Negative" if avg_score < -0.3
                else "Mixed"
            )
            trend_series.append({
                "date": date_label,
                "full_date": curr.isoformat(),
                "sentiment_score": avg_score,
                "confidence": avg_conf,
                "entry_count": len(entries_on_day),
                "label": primary_label,
                "has_entry": True,
            })
        else:
            trend_series.append({
                "date": date_label,
                "full_date": curr.isoformat(),
                "sentiment_score": None,
                "confidence": None,
                "entry_count": 0,
                "label": "No entry",
                "has_entry": False,
            })
        curr += timedelta(days=1)

    streak = _calculate_streak(user)

    # Generate 2-4 plain-language headline strings server-side
    headlines = []

    # 1. Streak / activity headline
    if streak >= 3:
        headlines.append(f"You've journaled {streak} days in a row.")
    elif total_current > 0:
        entry_word = "entry" if total_current == 1 else "entries"
        headlines.append(f"You've recorded {total_current} journal {entry_word} over the last {days} days.")
    else:
        headlines.append(f"No reflections recorded yet in the last {days} days.")

    # 2. Emotional trend headline
    if total_current > 0:
        pos_ratio = (positive_count / total_current) * 100
        neg_ratio = (negative_count / total_current) * 100

        if pos_ratio >= 60:
            headlines.append(f"Your mood has trended upward and mostly positive over the last {days} days.")
        elif neg_ratio >= 60:
            headlines.append("You've navigated some heavier days recently — giving those feelings space is a healthy step.")
        else:
            headlines.append("Your reflections show a steady, natural balance of emotions.")

    # 3. Period comparison headline
    if total_prev > 0:
        if percent_change > 0:
            headlines.append(f"Your journaling activity is up {abs(percent_change):.0f}% compared to the prior {days} days.")
        elif percent_change < 0:
            headlines.append(f"Your journaling activity is down {abs(percent_change):.0f}% compared to the prior {days} days.")
        else:
            headlines.append(f"Your journaling frequency was steady with the prior {days} days.")
    elif total_current > 0:
        headlines.append("You're building momentum in your self-reflection journey.")

    # 4. Mindful takeaway
    if total_current >= 4:
        headlines.append("Consistent journaling helps reveal meaningful personal insights over time.")
    elif total_current > 0:
        headlines.append("Each entry helps build an authentic picture of your emotional landscape.")

    headlines = headlines[:4]
    if len(headlines) < 2 and total_current == 0:
        headlines.append("Writing just a few sentences each day is an encouraging way to track how you feel.")

    # Most common mood summary for stat card
    if total_current == 0:
        mood_summary_text = "No entries yet"
    elif positive_count >= negative_count and positive_count >= mixed_count:
        mood_summary_text = "Mostly Positive"
    elif negative_count > positive_count and negative_count >= mixed_count:
        mood_summary_text = "Processing Heavy Days"
    else:
        mood_summary_text = "Balanced & Reflective"

    return Response({
        "range_days": days,
        "total_entries": total_current,
        "previous_period_entries": total_prev,
        "percent_change": percent_change,
        "streak_days": streak,
        "mood_summary_text": mood_summary_text,
        "distribution": {
            "positive": positive_count,
            "negative": negative_count,
            "mixed_neutral": mixed_count,
            "total": total_current,
            "note": "The sentiment model evaluates positive and negative reflections; entries with low confidence are grouped as mixed."
        },
        "headlines": headlines,
        "trend_series": trend_series,
    })


# ---------------------------------------------------------------------------
# Provider-facing: Alerts feed (read own patients' alerts)
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def alert_list(request):
    """
    Returns all alerts for the authenticated provider's patient panel.
    For v1 simplicity, providers see all alerts; production would filter
    by provider-patient assignment.
    """
    user = request.user

    if hasattr(user, "profile") and user.profile.role == "provider":
        alerts = Alert.objects.filter(status="active").order_by("-created_at")
    else:
        alerts = Alert.objects.filter(patient=user).order_by("-created_at")

    data = [
        {
            "id": a.id,
            "severity": a.severity,
            "status": a.status,
            "matched_specialization": a.matched_specialization,
            "patient_username": a.patient.username,
            "patient_full_name": f"{a.patient.first_name} {a.patient.last_name}".strip() or a.patient.username,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]
    return Response(data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def alert_update(request, pk):
    """
    Allows a provider to acknowledge or resolve an alert.
    """
    try:
        alert = Alert.objects.get(pk=pk)
    except Alert.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get("status")
    if new_status in dict(Alert.STATUS_CHOICES):
        alert.status = new_status
        alert.save()
        return Response({"id": alert.id, "status": alert.status})

    return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Patient-facing: Unresolved alerts for specialist suggestions
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_alerts(request):
    """
    Returns the logged-in patient's own alerts where status != "resolved".
    Used by the patient UI to surface matched specialist suggestions.
    """
    alerts = Alert.objects.filter(
        patient=request.user
    ).exclude(status="resolved").order_by("-created_at")

    data = [
        {
            "id": a.id,
            "severity": a.severity,
            "status": a.status,
            "matched_specialization": a.matched_specialization,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]
    return Response(data)
