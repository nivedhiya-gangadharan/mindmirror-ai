from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import JournalEntry
from .serializers import JournalEntrySerializer
from analysis.views import analyze_sentiment
from analysis.risk import assess_risk
from analysis.models import Alert


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return JournalEntry.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        content = serializer.validated_data.get("content", "")
        user = self.request.user

        # 1. Sentiment analysis
        analysis_result = analyze_sentiment(content)

        # 2. Save journal entry
        entry = serializer.save(
            user=user,
            sentiment=analysis_result["sentiment"],
            confidence=analysis_result["confidence"],
        )

        # 3. Risk assessment — run after save so consecutive-entry trend check
        #    can include this entry.
        risk = assess_risk(content, user=user)
        self._maybe_create_alert(user, entry, risk)

    def perform_update(self, serializer):
        content = serializer.validated_data.get(
            "content",
            serializer.instance.content
        )
        user = self.request.user

        # Re-analyze sentiment for updated content
        analysis_result = analyze_sentiment(content)

        entry = serializer.save(
            sentiment=analysis_result["sentiment"],
            confidence=analysis_result["confidence"],
        )

        risk = assess_risk(content, user=user)
        self._maybe_create_alert(user, entry, risk)

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    @staticmethod
    def _maybe_create_alert(user, entry, risk):
        """
        Persist an Alert record for concern/crisis signals.
        Avoids duplicate alerts for the same journal entry.
        """
        severity = risk.get("severity", "none")
        if severity not in ("concern", "crisis"):
            return

        Alert.objects.update_or_create(
            journal_entry=entry,
            defaults={
                "patient": user,
                "severity": severity,
                "matched_specialization": risk.get("matched_specialization") or "",
                "status": "active",
            },
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Attach `risk_assessment` to the single-entry response.
        """
        response = super().retrieve(request, *args, **kwargs)
        return response

    def create(self, request, *args, **kwargs):
        """
        Augment the CREATE response with risk_assessment data so Journal.jsx
        can show crisis modals / concern banners immediately.
        """
        response = super().create(request, *args, **kwargs)

        if response.status_code == 201:
            content = request.data.get("content", "")
            risk = assess_risk(content, user=request.user)
            response.data["risk_assessment"] = risk

        return response

    def update(self, request, *args, **kwargs):
        """
        Augment the UPDATE response with risk_assessment data.
        """
        response = super().update(request, *args, **kwargs)

        if response.status_code == 200:
            content = request.data.get("content", "")
            risk = assess_risk(content, user=request.user)
            response.data["risk_assessment"] = risk

        return response

    def partial_update(self, request, *args, **kwargs):
        """
        Augment the PARTIAL_UPDATE response with risk_assessment data.
        """
        response = super().partial_update(request, *args, **kwargs)

        if response.status_code == 200:
            content = request.data.get("content", "")
            risk = assess_risk(content, user=request.user)
            response.data["risk_assessment"] = risk

        return response
