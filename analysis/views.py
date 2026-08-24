from transformers import pipeline

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from journals.models import JournalEntry


# Load pretrained sentiment analysis model
sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
)


def analyze_sentiment(text):
    """
    Analyze text and return sentiment label and confidence score.
    """

    result = sentiment_analyzer(text)[0]

    return {
        "sentiment": result["label"],
        "confidence": round(float(result["score"]) * 100, 2)
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mood_summary(request):
    entries = JournalEntry.objects.filter(user=request.user)

    total_entries = entries.count()
    positive_entries = entries.filter(sentiment="POSITIVE").count()
    negative_entries = entries.filter(sentiment="NEGATIVE").count()

    if total_entries > 0:
        total_confidence = sum(
            float(entry.confidence or 0)
            for entry in entries
        )
        average_confidence = total_confidence / total_entries
    else:
        average_confidence = 0

    return Response({
        "total_entries": total_entries,
        "positive_entries": positive_entries,
        "negative_entries": negative_entries,
        "average_confidence": round(average_confidence, 2),
    })