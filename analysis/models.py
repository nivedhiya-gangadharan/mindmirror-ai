from django.db import models
from django.contrib.auth.models import User
from journals.models import JournalEntry

# ==============================================================================
# COMPLIANCE & PRIVACY NOTICE (HIPAA / GDPR / Clinical Governance):
# In clinical operations, presenting patient-identifiable mental health alerts
# to healthcare providers requires explicit, informed opt-in consent from the
# patient. Alert visibility must enforce strict role-based access control,
# encryption in transit and at rest, and comprehensive audit logging.
# ==============================================================================


class Alert(models.Model):
    SEVERITY_CHOICES = [
        ("concern", "Concern"),
        ("crisis", "Crisis"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("resolved", "Resolved"),
    ]

    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="risk_alerts"
    )
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="risk_alerts",
        null=True,
        blank=True
    )
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default="concern"
    )
    matched_specialization = models.CharField(
        max_length=100,
        blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active"
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.severity.upper()}] Alert for {self.patient.username} ({self.status})"