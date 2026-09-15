import re
import os
from .crisis_config import (
    CRISIS_KEYWORDS_AND_PHRASES,
    CONCERN_CATEGORY_KEYWORDS,
    CONSECUTIVE_NEGATIVE_THRESHOLD,
    NEGATIVE_CONFIDENCE_THRESHOLD,
    CRISIS_RESOURCES,
)

# Shared specialist domains corresponding to accounts.constants.SPECIALIZATIONS
SPECIALIZATION_CANDIDATE_LABELS = [
    "Anxiety & Stress",
    "Relationships",
    "Depression",
    "Trauma Recovery",
]

_zero_shot_classifier = None


def get_zero_shot_classifier():
    """
    Optionally load the HuggingFace zero-shot classification pipeline when enabled
    via USE_ZERO_SHOT_CLASSIFIER=1 or when pre-cached.
    """
    global _zero_shot_classifier
    if _zero_shot_classifier is None:
        try:
            if os.environ.get("USE_ZERO_SHOT_CLASSIFIER", "false").lower() in ("1", "true", "yes"):
                from transformers import pipeline
                # Prefer fast distilbart-mnli-12-3 or fallback to facebook/bart-large-mnli
                model_name = os.environ.get("ZERO_SHOT_MODEL", "valhalla/distilbart-mnli-12-3")
                _zero_shot_classifier = pipeline("zero-shot-classification", model=model_name)
            else:
                _zero_shot_classifier = False
        except Exception:
            _zero_shot_classifier = False
    return _zero_shot_classifier if _zero_shot_classifier is not False else None


def classify_category_keywords(text):
    """
    Keyword & word-stem/prefix category scoring.
    Generic valence words (hate, sad, angry, upset, mad) are excluded from the
    keyword lists so topic matching is driven strictly by subject matter.
    """
    normalized_text = text.lower()
    category_scores = {}

    for category, keywords in CONCERN_CATEGORY_KEYWORDS.items():
        count = 0
        for kw in keywords:
            # Word boundary at start with stem/prefix matching allows plurals & inflections
            pattern = r"\b" + re.escape(kw)
            matches = re.findall(pattern, normalized_text)
            if matches:
                count += len(matches)
        if count > 0:
            category_scores[category] = count

    if category_scores:
        best_category = max(category_scores.items(), key=lambda x: x[1])[0]
        return best_category, category_scores[best_category]

    return None, 0


def classify_specialization(text, confidence_threshold=0.4):
    """
    Categorize text into a specialist domain using zero-shot classification
    if configured, or the expanded keyword/stem classifier.
    """
    classifier = get_zero_shot_classifier()
    if classifier:
        try:
            res = classifier(
                text,
                candidate_labels=SPECIALIZATION_CANDIDATE_LABELS,
                multi_label=False,
            )
            top_label = res["labels"][0]
            top_score = res["scores"][0]
            if top_score >= confidence_threshold:
                return top_label
            return "General"
        except Exception:
            pass

    # High-accuracy keyword & stem classification
    best_category, score = classify_category_keywords(text)
    if best_category:
        return best_category

    return None


def assess_risk(text, user=None):
    """
    Multi-tier risk and support routing engine:
    1. Crisis-tier: Matches safety-critical phrases indicating self-harm or acute crisis.
    2. Concern-tier: Categorizes distress themes into shared specialist domains (Anxiety & Stress, Relationships, Depression, Trauma Recovery).
    3. Trend signal: Detects sustained emotional decline across N consecutive negative journal entries.
    """
    if not text or not text.strip():
        return {
            "severity": "none",
            "matched_specialization": None,
            "reason": None,
            "resources": [],
        }

    normalized_text = text.lower()

    # Layer 1: Crisis-Tier Keyword / Phrase Detection
    for phrase in CRISIS_KEYWORDS_AND_PHRASES:
        pattern = r"\b" + re.escape(phrase)
        if re.search(pattern, normalized_text):
            return {
                "severity": "crisis",
                "matched_specialization": "General",
                "reason": f"crisis_expression: '{phrase}'",
                "resources": CRISIS_RESOURCES,
            }

    # Layer 2: Concern Category Classification (keywords + stem matching / zero-shot)
    matched_cat = classify_specialization(text)
    if matched_cat:
        return {
            "severity": "concern",
            "matched_specialization": matched_cat,
            "reason": f"topic_signals: {matched_cat}",
            "resources": [],
        }

    # Layer 3: Consecutive Negative Entries Trend Signal
    if user and user.is_authenticated:
        try:
            from journals.models import JournalEntry
            recent_entries = list(
                JournalEntry.objects.filter(user=user)
                .order_by("-created_at")[:CONSECUTIVE_NEGATIVE_THRESHOLD]
            )

            if len(recent_entries) >= CONSECUTIVE_NEGATIVE_THRESHOLD:
                all_high_neg = all(
                    e.sentiment == "NEGATIVE" and (e.confidence or 0) >= NEGATIVE_CONFIDENCE_THRESHOLD
                    for e in recent_entries
                )
                if all_high_neg:
                    # Check if recent entries have any category signals before falling back to General
                    recent_text = " ".join(e.content or "" for e in recent_entries)
                    trend_cat = classify_specialization(recent_text) or "General"

                    return {
                        "severity": "concern",
                        "matched_specialization": trend_cat,
                        "reason": f"{CONSECUTIVE_NEGATIVE_THRESHOLD} consecutive high-confidence negative entries",
                        "resources": [],
                    }
        except Exception:
            pass

    return {
        "severity": "none",
        "matched_specialization": None,
        "reason": None,
        "resources": [],
    }
