from datetime import date, time
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Profile
from doctors.models import Doctor, Availability


class DoctorAvailabilityAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Doctor 1
        self.doc1_user = User.objects.create_user(
            username="dr_one",
            email="drone@example.com",
            password="pass"
        )
        self.doc1_profile, _ = Profile.objects.get_or_create(user=self.doc1_user)
        self.doc1_profile.role = "provider"
        self.doc1_profile.save()
        self.doc1, _ = Doctor.objects.get_or_create(user=self.doc1_user)

        # Doctor 2
        self.doc2_user = User.objects.create_user(
            username="dr_two",
            email="drtwo@example.com",
            password="pass"
        )
        self.doc2_profile, _ = Profile.objects.get_or_create(user=self.doc2_user)
        self.doc2_profile.role = "provider"
        self.doc2_profile.save()
        self.doc2, _ = Doctor.objects.get_or_create(user=self.doc2_user)

    def test_list_own_availability(self):
        """Doctor only sees their own availability entries."""
        Availability.objects.create(
            doctor=self.doc1,
            from_date=date(2026, 9, 15),
            to_date=date(2026, 9, 20),
            start_time=time(9, 0),
            end_time=time(12, 0),
        )
        Availability.objects.create(
            doctor=self.doc2,
            from_date=date(2026, 9, 15),
            to_date=date(2026, 9, 20),
            start_time=time(13, 0),
            end_time=time(17, 0),
        )

        self.client.force_authenticate(user=self.doc1_user)
        response = self.client.get("/api/doctors/availability/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["doctor"], self.doc1.pk)

    def test_create_and_delete_availability(self):
        """Doctor can create a new date-range availability entry and delete it."""
        self.client.force_authenticate(user=self.doc1_user)

        payload = {
            "from_date": "2026-09-15",
            "to_date": "2026-09-20",
            "start_time": "09:00:00",
            "end_time": "12:00:00",
        }
        res = self.client.post("/api/doctors/availability/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        slot_id = res.data["id"]

        # Duplicate submission does not create a second identical record
        res_dup = self.client.post("/api/doctors/availability/", payload, format="json")
        self.assertEqual(res_dup.status_code, status.HTTP_200_OK)
        self.assertEqual(Availability.objects.filter(doctor=self.doc1).count(), 1)

        # Delete slot
        del_res = self.client.delete(f"/api/doctors/availability/{slot_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Availability.objects.filter(doctor=self.doc1).count(), 0)

    def test_validation_errors(self):
        """Invalid date ranges or times return 400."""
        self.client.force_authenticate(user=self.doc1_user)

        # To date earlier than From date
        res = self.client.post("/api/doctors/availability/", {
            "from_date": "2026-09-25",
            "to_date": "2026-09-20",
            "start_time": "09:00:00",
            "end_time": "12:00:00",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # End time earlier than Start time
        res2 = self.client.post("/api/doctors/availability/", {
            "from_date": "2026-09-15",
            "to_date": "2026-09-20",
            "start_time": "14:00:00",
            "end_time": "12:00:00",
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
