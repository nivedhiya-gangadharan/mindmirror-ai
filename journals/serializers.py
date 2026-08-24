from rest_framework import serializers
from .models import JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry

        fields = [
            "id",
            "user",
            "title",
            "content",
            "sentiment",
            "confidence",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "sentiment",
            "confidence",
            "created_at",
            "updated_at",
        ]