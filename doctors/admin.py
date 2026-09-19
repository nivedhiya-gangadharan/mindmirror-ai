from django.contrib import admin
from .models import Doctor, Availability

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ["user"]
    search_fields = ["user__username", "user__first_name", "user__last_name", "user__email"]

@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ["id", "doctor", "from_date", "to_date", "start_time", "end_time"]
    list_filter = ["doctor", "from_date", "to_date"]
    ordering = ["from_date", "start_time"]
