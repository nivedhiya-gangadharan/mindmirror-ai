from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .constants import SPECIALIZATIONS


class Profile(models.Model):
    ROLE_CHOICES = [
        ("patient", "Patient"),
        ("provider", "Provider"),
    ]

    STATUS_CHOICES = [
        ("approved", "Approved"),
        ("pending", "Pending"),
        ("rejected", "Rejected"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="patient"
    )
    title = models.CharField(
        max_length=100,
        blank=True,
        help_text="e.g. Clinical Psychologist, Psychiatrist, Marriage & Family Therapist"
    )
    specialization = models.CharField(
        max_length=50,
        choices=SPECIALIZATIONS,
        blank=True,
        help_text="Provider specialization area"
    )
    bio = models.TextField(
        blank=True
    )
    verification_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="approved",
        help_text="Verification status for providers"
    )
    license_or_credential_info = models.TextField(
        blank=True,
        help_text="Free text: license #, qualifications, years practicing"
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason if application is rejected"
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.user.username} ({self.role} - {self.verification_status})"


@receiver(post_save, sender=User)
def create_or_save_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)
    elif hasattr(instance, "profile"):
        instance.profile.save()
