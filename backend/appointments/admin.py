from django.contrib import admin
from .models import Appointment, AvailabilitySlot


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "provider", "date", "start_time", "end_time", "counseling_type", "status", "created_at")
    list_filter = ("status", "counseling_type", "date")
    search_fields = ("patient__username", "provider__username", "notes")


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ["id", "doctor", "from_date", "to_date", "start_time", "end_time"]
    list_filter = ["doctor", "from_date", "to_date"]
    ordering = ["from_date", "start_time"]
