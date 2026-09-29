from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from analysis.views import analyze_sentiment
from analysis.risk import assess_risk
from journals.models import JournalEntry
from analysis.models import Alert


class AnalysisUnitAndAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="analyzer_user",
            email="analyzer@example.com",
            password="securepassword123"
        )
        self.mood_summary_url = reverse("mood-summary")

    def test_analyze_sentiment_positive(self):
        result = analyze_sentiment("I am having a wonderful, happy day!")
        self.assertEqual(result["sentiment"], "POSITIVE")
        self.assertGreater(result["confidence"], 50.0)

    def test_analyze_sentiment_negative(self):
        result = analyze_sentiment("I am feeling terrible and exhausted.")
        self.assertEqual(result["sentiment"], "NEGATIVE")
        self.assertGreater(result["confidence"], 50.0)

    def test_analyze_sentiment_long_text_safety(self):
        # Long text exceeding 512 tokens
        long_text = "This is a great, uplifting journal entry filled with hope and joy. " * 100
        result = analyze_sentiment(long_text)
        self.assertIn(result["sentiment"], ["POSITIVE", "NEGATIVE", "NEUTRAL"])
        self.assertIsInstance(result["confidence"], float)

    def test_analyze_sentiment_empty_text(self):
        result = analyze_sentiment("")
        self.assertEqual(result["sentiment"], "NEUTRAL")
        self.assertEqual(result["confidence"], 0.0)

    def test_mood_summary_unauthenticated(self):
        response = self.client.get(self.mood_summary_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_mood_summary_authenticated(self):
        self.client.force_authenticate(user=self.user)
        JournalEntry.objects.create(
            user=self.user,
            title="Good Day",
            content="Great day",
            sentiment="POSITIVE",
            confidence=95.5
        )
        JournalEntry.objects.create(
            user=self.user,
            title="Rough Day",
            content="Sad day",
            sentiment="NEGATIVE",
            confidence=85.5
        )

        response = self.client.get(self.mood_summary_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_entries"], 2)
        self.assertEqual(response.data["positive_entries"], 1)
        self.assertEqual(response.data["negative_entries"], 1)
        self.assertEqual(response.data["average_confidence"], 90.5)


class RiskAssessmentCategoryMatchingTests(APITestCase):
    def test_hate_my_partner_classifies_as_relationships(self):
        """'hate my partner' should classify as Relationships, not Anxiety & Stress."""
        result = assess_risk("hate my partner")
        self.assertEqual(result["severity"], "concern")
        self.assertEqual(result["matched_specialization"], "Relationships")

    def test_im_stressed_classifies_as_anxiety_and_stress(self):
        """'im stressed' should classify as Anxiety & Stress, not Relationships."""
        result = assess_risk("im stressed")
        self.assertEqual(result["severity"], "concern")
        self.assertEqual(result["matched_specialization"], "Anxiety & Stress")

    def test_stem_matching_relationships_and_trauma(self):
        """Stem/word-prefix matches plural and inflected words (e.g. partners, nightmares)."""
        res_rel = assess_risk("I keep having disagreements with my partners")
        self.assertEqual(res_rel["matched_specialization"], "Relationships")

        res_trauma = assess_risk("I am having terrible nightmares every night")
        self.assertEqual(res_trauma["matched_specialization"], "Trauma Recovery")

        res_anxiety = assess_risk("I have severe anxiety before work")
        self.assertEqual(res_anxiety["matched_specialization"], "Anxiety & Stress")

        res_dep = assess_risk("I feel completely hopeless and worthless")
        self.assertEqual(res_dep["matched_specialization"], "Depression")


class MyAlertsAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username="patient_one",
            email="p1@example.com",
            password="securepassword123"
        )
        self.user2 = User.objects.create_user(
            username="patient_two",
            email="p2@example.com",
            password="securepassword123"
        )
        self.my_alerts_url = reverse("my-alerts")

    def test_my_alerts_unauthenticated(self):
        response = self.client.get(self.my_alerts_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_my_alerts_filters_resolved_and_other_patients(self):
        # Active alerts for user 1
        Alert.objects.create(
            patient=self.user1,
            severity="concern",
            matched_specialization="Anxiety & Stress",
            status="active"
        )
        Alert.objects.create(
            patient=self.user1,
            severity="concern",
            matched_specialization="Depression",
            status="active"
        )
        Alert.objects.create(
            patient=self.user1,
            severity="concern",
            matched_specialization="Trauma Recovery",
            status="resolved"
        )

        # Alert for user 2 (should not be returned)
        Alert.objects.create(
            patient=self.user2,
            severity="crisis",
            matched_specialization="General",
            status="active"
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.my_alerts_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        specs = [item["matched_specialization"] for item in response.data]
        self.assertIn("Anxiety & Stress", specs)
        self.assertIn("Depression", specs)
        self.assertNotIn("Trauma Recovery", specs)
        self.assertNotIn("General", specs)

        first = response.data[0]
        self.assertIn("id", first)
        self.assertIn("severity", first)
        self.assertEqual(first["status"], "active")
        self.assertIn("matched_specialization", first)
        self.assertIn("created_at", first)


class InsightsAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="insights_user",
            email="insights@example.com",
            password="securepassword123"
        )
        self.insights_url = reverse("insights")

    def test_insights_unauthenticated(self):
        response = self.client.get(self.insights_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_insights_authenticated_empty(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.insights_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["range_days"], 30)
        self.assertEqual(response.data["total_entries"], 0)
        self.assertEqual(response.data["streak_days"], 0)
        self.assertIn("headlines", response.data)
        self.assertGreaterEqual(len(response.data["headlines"]), 2)
        self.assertIn("distribution", response.data)
        self.assertIn("trend_series", response.data)
        self.assertEqual(len(response.data["trend_series"]), 30)

    def test_insights_with_entries_and_streak(self):
        from django.utils import timezone
        from datetime import timedelta
        self.client.force_authenticate(user=self.user)

        today = timezone.now()
        yesterday = today - timedelta(days=1)
        two_days_ago = today - timedelta(days=2)

        e1 = JournalEntry.objects.create(
            user=self.user,
            title="Today Entry",
            content="Today was peaceful and joyful",
            sentiment="POSITIVE",
            confidence=95.0,
        )
        JournalEntry.objects.filter(id=e1.id).update(created_at=today)

        e2 = JournalEntry.objects.create(
            user=self.user,
            title="Yesterday Entry",
            content="Feeling hopeful",
            sentiment="POSITIVE",
            confidence=88.0,
        )
        JournalEntry.objects.filter(id=e2.id).update(created_at=yesterday)

        e3 = JournalEntry.objects.create(
            user=self.user,
            title="Two Days Ago Entry",
            content="Had a tough moment",
            sentiment="NEGATIVE",
            confidence=80.0,
        )
        JournalEntry.objects.filter(id=e3.id).update(created_at=two_days_ago)

        response = self.client.get(f"{self.insights_url}?range=7")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["range_days"], 7)
        self.assertEqual(response.data["total_entries"], 3)
        self.assertEqual(response.data["distribution"]["positive"], 2)
        self.assertEqual(response.data["distribution"]["negative"], 1)
        self.assertEqual(response.data["streak_days"], 3)
        self.assertGreaterEqual(len(response.data["headlines"]), 2)
        self.assertLessEqual(len(response.data["headlines"]), 4)