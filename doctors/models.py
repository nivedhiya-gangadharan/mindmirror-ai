from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Doctor(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="doctor_profile"
    )

    def __str__(self):
        name = f"{self.user.first_name} {self.user.last_name}".strip()
        return f"Dr. {name or self.user.username}"


class Availability(models.Model):
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name="availabilities"
    )
    from_date = models.DateField()
    to_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        ordering = ["from_date", "start_time"]
        unique_together = ["doctor", "from_date", "to_date", "start_time", "end_time"]

    def __str__(self):
        return f"{self.doctor}: {self.from_date} to {self.to_date} ({self.start_time} - {self.end_time})"


@receiver(post_save, sender=User)
def create_doctor_for_provider(sender, instance, created, **kwargs):
    """Automatically ensure a Doctor profile exists for provider users."""
    if hasattr(instance, "profile") and instance.profile.role == "provider":
        Doctor.objects.get_or_create(user=instance)


@receiver(post_save, sender="accounts.Profile")
def create_doctor_for_provider_profile(sender, instance, created, **kwargs):
    """Automatically ensure a Doctor profile exists when a profile is created/updated as provider."""
    if instance.role == "provider":
        Doctor.objects.get_or_create(user=instance.user)
