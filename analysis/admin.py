from django.contrib import admin
from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "severity", "matched_specialization", "status", "created_at")
    list_filter = ("severity", "status")
    search_fields = ("patient__username",)
    ordering = ("-created_at",)
    readonly_fields = ("patient", "journal_entry", "severity", "matched_specialization", "created_at")
