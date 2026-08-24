from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import JournalEntry
from .serializers import JournalEntrySerializer
from analysis.views import analyze_sentiment


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return JournalEntry.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        # Get journal content
        content = serializer.validated_data["content"]

        # Analyze journal using AI
        analysis_result = analyze_sentiment(content)

        # Save journal entry and AI analysis
        serializer.save(
            user=self.request.user,
            sentiment=analysis_result["sentiment"],
            confidence=analysis_result["confidence"]
        )