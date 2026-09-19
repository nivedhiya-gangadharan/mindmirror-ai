from django.db import models
from django.contrib.auth.models import User

from accounts.constants import SPECIALIZATIONS


class Resource(models.Model):
    RESOURCE_TYPES = [
        ("video", "Video"),
        ("article", "Article"),
        ("audio", "Audio"),
        ("exercise", "Exercise"),
    ]

    title = models.CharField(
        max_length=200
    )
    description = models.TextField(
        blank=True
    )
    resource_type = models.CharField(
        max_length=20,
        choices=RESOURCE_TYPES
    )
    url = models.URLField(
        help_text="Direct link to external content (YouTube, article, audio, etc.)"
    )
    category = models.CharField(
        max_length=50,
        choices=SPECIALIZATIONS,
        help_text="Category corresponding to wellness/specialization area"
    )
    is_published = models.BooleanField(
        default=True
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="resources"
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.resource_type} - {self.category})"
