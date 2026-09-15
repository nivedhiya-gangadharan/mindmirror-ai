from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from journals.models import JournalEntry


class JournalEntryAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username="user1",
            email="user1@example.com",
            password="password123"
        )
        self.user2 = User.objects.create_user(
            username="user2",
            email="user2@example.com",
            password="password123"
        )
        self.list_url = reverse("journal-list")

    def test_create_journal_entry_with_sentiment_analysis(self):
        self.client.force_authenticate(user=self.user1)
        data = {
            "title": "A Great Morning",
            "content": "I woke up feeling super energized, excited, and grateful!"
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "A Great Morning")
        self.assertEqual(response.data["sentiment"], "POSITIVE")
        self.assertIsNotNone(response.data["confidence"])
        self.assertEqual(response.data["user"], self.user1.id)

    def test_create_journal_entry_with_long_text(self):
        self.client.force_authenticate(user=self.user1)
        long_content = "Today was an absolutely joyful and productive day. " * 120
        data = {
            "title": "Long Reflection",
            "content": long_content
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn(response.data["sentiment"], ["POSITIVE", "NEGATIVE", "NEUTRAL"])

    def test_update_journal_entry_reanalyzes_sentiment(self):
        self.client.force_authenticate(user=self.user1)
        # First create a positive entry
        create_resp = self.client.post(self.list_url, {
            "title": "Initial Entry",
            "content": "Everything is wonderful, awesome, and going great!"
        })
        entry_id = create_resp.data["id"]
        self.assertEqual(create_resp.data["sentiment"], "POSITIVE")

        # Now update to negative content
        detail_url = reverse("journal-detail", kwargs={"pk": entry_id})
        update_resp = self.client.put(detail_url, {
            "title": "Updated Entry",
            "content": "Everything fell apart, I feel terrible and miserable."
        })
        self.assertEqual(update_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(update_resp.data["sentiment"], "NEGATIVE")
        self.assertIsNotNone(update_resp.data["confidence"])

    def test_user_cannot_access_other_users_entries(self):
        # Create entry belonging to user1
        entry = JournalEntry.objects.create(
            user=self.user1,
            title="Private Thoughts",
            content="User 1 thoughts",
            sentiment="POSITIVE",
            confidence=90.0
        )

        # User2 tries to access user1's entry
        self.client.force_authenticate(user=self.user2)
        detail_url = reverse("journal-detail", kwargs={"pk": entry.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # User2 list should be empty
        list_resp = self.client.get(self.list_url)
        self.assertEqual(len(list_resp.data), 0)

