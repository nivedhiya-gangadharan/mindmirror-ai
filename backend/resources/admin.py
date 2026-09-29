from django.contrib import admin
from .models import Resource


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "resource_type", "category", "is_published", "created_by", "created_at")
    list_filter = ("resource_type", "category", "is_published")
    search_fields = ("title", "description", "url")
