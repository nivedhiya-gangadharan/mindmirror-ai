from django.core.management.base import BaseCommand
from analysis.models import Alert
from analysis.risk import assess_risk


class Command(BaseCommand):
    help = "Reprocess existing active alerts against corrected category classifier"

    def handle(self, *args, **options):
        active_alerts = Alert.objects.filter(status="active", journal_entry__isnull=False).select_related("patient", "journal_entry")
        updated_count = 0
        total = active_alerts.count()
        self.stdout.write(f"Scanning {total} active alerts with journal entries...")

        for alert in active_alerts:
            content = alert.journal_entry.content or ""
            assessment = assess_risk(content, user=alert.patient)
            new_spec = assessment.get("matched_specialization")
            if new_spec and new_spec != alert.matched_specialization:
                old_spec = alert.matched_specialization
                alert.matched_specialization = new_spec
                alert.save(update_fields=["matched_specialization"])
                updated_count += 1
                self.stdout.write(
                    f"Updated Alert #{alert.id} (patient: {alert.patient.username}): "
                    f"'{old_spec}' -> '{new_spec}' (entry: '{content[:50]}')"
                )

        self.stdout.write(self.style.SUCCESS(f"Done! Reprocessed alerts. Updated {updated_count} of {total} active alerts."))
