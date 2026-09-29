from datetime import date
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Appointment
from doctors.models import Availability
from doctors.serializers import AvailabilitySerializer

# Alias for backward compatibility
AvailabilitySlotSerializer = AvailabilitySerializer


class AppointmentSerializer(serializers.ModelSerializer):
    patient_username = serializers.CharField(source="patient.username", read_only=True)
    patient_full_name = serializers.SerializerMethodField(read_only=True)
    provider_username = serializers.CharField(source="provider.username", read_only=True)
    provider_full_name = serializers.SerializerMethodField(read_only=True)
    provider_title = serializers.CharField(source="provider.profile.title", read_only=True)
    provider_specialization = serializers.CharField(source="provider.profile.specialization", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "patient_username",
            "patient_full_name",
            "provider",
            "provider_username",
            "provider_full_name",
            "provider_title",
            "provider_specialization",
            "date",
            "start_time",
            "end_time",
            "counseling_type",
            "status",
            "notes",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "patient",
            "patient_username",
            "patient_full_name",
            "provider_username",
            "provider_full_name",
            "provider_title",
            "provider_specialization",
            "created_at",
        ]

    def get_patient_full_name(self, obj):
        name = f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return name if name else obj.patient.username

    def get_provider_full_name(self, obj):
        name = f"{obj.provider.first_name} {obj.provider.last_name}".strip()
        return name if name else obj.provider.username

    def to_internal_value(self, data):
        if hasattr(data, "copy"):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)
        if "provider_id" in data and "provider" not in data:
            data["provider"] = data["provider_id"]
        elif "doctor_id" in data and "provider" not in data:
            data["provider"] = data["doctor_id"]
        elif "doctor" in data and "provider" not in data:
            data["provider"] = data["doctor"]
        return super().to_internal_value(data)

    def validate_provider(self, value):
        if not hasattr(value, "profile") or value.profile.role != "provider":
            raise serializers.ValidationError("Selected user is not registered as a mental health provider.")
        return value

    def validate(self, attrs):
        # Validate date is not in the past
        booking_date = attrs.get("date")
        if booking_date and booking_date < date.today():
            raise serializers.ValidationError({"date": "Appointment date cannot be in the past."})

        # Validate start_time < end_time
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({"start_time": "Start time must be before end time."})

        # Conflict check for provider
        provider = attrs.get("provider") or (self.instance.provider if self.instance else None)
        target_date = booking_date or (self.instance.date if self.instance else None)
        target_start = start_time or (self.instance.start_time if self.instance else None)
        target_end = end_time or (self.instance.end_time if self.instance else None)

        if provider and target_date and target_start and target_end:
            conflicts = Appointment.objects.filter(
                provider=provider,
                date=target_date,
                status__in=["pending", "confirmed"],
                start_time__lt=target_end,
                end_time__gt=target_start,
            )
            if self.instance:
                conflicts = conflicts.exclude(pk=self.instance.pk)

            if conflicts.exists():
                raise serializers.ValidationError(
                    {"start_time": "This time slot has already been booked for this provider."}
                )

        return attrs
