from datetime import date, time, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Profile
from doctors.models import Doctor, Availability


class Command(BaseCommand):
    help = "Seed demo providers across all specializations with date-range availability"

    def handle(self, *args, **options):
        providers_data = [
            {
                "username": "dr_elena",
                "first_name": "Elena",
                "last_name": "Rostova",
                "email": "elena.rostova@mindmirror.ai",
                "title": "Clinical Psychologist, Ph.D.",
                "specialization": "Anxiety & Stress",
                "bio": "Specializing in cognitive behavioral therapy (CBT), panic reduction, and evidence-based anxiety management techniques.",
            },
            {
                "username": "dr_marcus",
                "first_name": "Marcus",
                "last_name": "Vance",
                "email": "marcus.vance@mindmirror.ai",
                "title": "Licensed Marriage & Family Therapist",
                "specialization": "Relationships",
                "bio": "Guiding individuals, couples, and families through interpersonal conflict, emotional boundaries, and healthy communication.",
            },
            {
                "username": "dr_maya",
                "first_name": "Maya",
                "last_name": "Lin",
                "email": "maya.lin@mindmirror.ai",
                "title": "Psychiatrist, M.D.",
                "specialization": "Depression",
                "bio": "Integrative psychiatric assessment and compassionate talk therapy dedicated to navigating depressive episodes and building resilience.",
            },
            {
                "username": "dr_samuel",
                "first_name": "Samuel",
                "last_name": "Reed",
                "email": "samuel.reed@mindmirror.ai",
                "title": "Trauma & PTSD Specialist, Psy.D.",
                "specialization": "Trauma Recovery",
                "bio": "Trauma-informed psychotherapist helping survivors process past trauma, flashbacks, and regain grounding and inner safety.",
            },
            {
                "username": "dr_sarah",
                "first_name": "Sarah",
                "last_name": "Jenkins",
                "email": "sarah.jenkins@mindmirror.ai",
                "title": "Mental Health Counselor, LMHC",
                "specialization": "General",
                "bio": "Mindfulness-based therapy and solution-focused counseling for life transitions, stress management, and emotional well-being.",
            },
        ]

        today = date.today()
        from_d = today - timedelta(days=7)
        to_d = today + timedelta(days=90)

        created_count = 0
        for p in providers_data:
            user, created = User.objects.get_or_create(
                username=p["username"],
                defaults={
                    "first_name": p["first_name"],
                    "last_name": p["last_name"],
                    "email": p["email"],
                    "is_staff": True,
                }
            )
            if created or not user.has_usable_password():
                user.set_password("doctor123")
                user.save()

            profile, _ = Profile.objects.get_or_create(user=user)
            profile.role = "provider"
            profile.title = p["title"]
            profile.specialization = p["specialization"]
            profile.bio = p["bio"]
            profile.save()

            # Ensure Doctor record exists
            doctor, _ = Doctor.objects.get_or_create(user=user)

            # Create date-range availability windows
            Availability.objects.get_or_create(
                doctor=doctor,
                from_date=from_d,
                to_date=to_d,
                start_time=time(9, 0),
                end_time=time(12, 0),
            )
            Availability.objects.get_or_create(
                doctor=doctor,
                from_date=from_d,
                to_date=to_d,
                start_time=time(13, 0),
                end_time=time(17, 0),
            )
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} demo providers with date-range availability!"))
