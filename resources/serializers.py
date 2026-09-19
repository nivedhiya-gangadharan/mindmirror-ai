from rest_framework import serializers
from accounts.constants import SPECIALIZATION_CHOICES
from .models import Resource


class ResourceSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True
    )
    category = serializers.ChoiceField(
        choices=SPECIALIZATION_CHOICES
    )

    class Meta:
        model = Resource
        fields = [
            "id",
            "title",
            "description",
            "resource_type",
            "url",
            "category",
            "is_published",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_by_username",
            "created_at",
        ]
