from django.db import models
from django.contrib.auth.models import User
from doctors.models import Availability


class Appointment(models.Model):
    COUNSELING_TYPES = [
        ("in_person", "In-Person Session"),
    ]
    COUNSELING_TYPE_CHOICES = COUNSELING_TYPES

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="patient_appointments"
    )
    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="provider_appointments"
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    counseling_type = models.CharField(
        max_length=20,
        choices=COUNSELING_TYPES,
        default="in_person"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )
    notes = models.TextField(
        blank=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["date", "start_time"]

    def __str__(self):
        return f"{self.patient.username} with {self.provider.username} on {self.date} ({self.status})"


class AvailabilitySlot(Availability):
    class Meta:
        proxy = True
        app_label = "appointments"
        verbose_name = "Availability slot"
        verbose_name_plural = "Availability slots"
