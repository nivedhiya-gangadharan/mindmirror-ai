from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from resources.models import Resource


class ResourceAPITests(APITestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            username="patient_user",
            email="patient@example.com",
            password="password123"
        )
        self.admin = User.objects.create_superuser(
            username="admin_user",
            email="admin@example.com",
            password="password123"
        )
        self.list_url = reverse("resource-list")

        # Create 1 published and 1 draft resource
        self.published_resource = Resource.objects.create(
            title="Guided Meditation for Stress",
            description="A gentle 10-minute mindfulness exercise.",
            resource_type="exercise",
            url="https://example.com/meditation",
            category="Anxiety & Stress",
            is_published=True,
            created_by=self.admin
        )
        self.draft_resource = Resource.objects.create(
            title="Internal Provider Guidelines",
            description="Draft notes not for public release.",
            resource_type="article",
            url="https://example.com/draft",
            category="General",
            is_published=False,
            created_by=self.admin
        )

    def test_unauthenticated_cannot_access_resources(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patient_only_sees_published_resources(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Guided Meditation for Stress")

    def test_admin_sees_all_resources_including_drafts(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_patient_cannot_create_resource(self):
        self.client.force_authenticate(user=self.patient)
        data = {
            "title": "Unauthorized Resource",
            "resource_type": "article",
            "url": "https://example.com/unauth",
            "category": "Depression",
            "is_published": True
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_and_delete_resource(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            "title": "Healthy Sleep Habits",
            "description": "Evidence-based tips for better sleep hygiene.",
            "resource_type": "article",
            "url": "https://example.com/sleep",
            "category": "Anxiety & Stress",
            "is_published": True
        }
        create_resp = self.client.post(self.list_url, data)
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        new_id = create_resp.data["id"]

        # Now delete
        detail_url = reverse("resource-detail", kwargs={"pk": new_id})
        delete_resp = self.client.delete(detail_url)
        self.assertEqual(delete_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Resource.objects.filter(id=new_id).exists())

    def test_filter_by_category_and_type(self):
        self.client.force_authenticate(user=self.patient)
        res_cat = self.client.get(f"{self.list_url}?category=Anxiety%20%26%20Stress")
        self.assertEqual(len(res_cat.data), 1)

        res_wrong_cat = self.client.get(f"{self.list_url}?category=Trauma%20Recovery")
        self.assertEqual(len(res_wrong_cat.data), 0)

        res_type = self.client.get(f"{self.list_url}?type=exercise")
        self.assertEqual(len(res_type.data), 1)
