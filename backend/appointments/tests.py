from datetime import datetime, date, timedelta, time
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Profile
from appointments.models import Appointment
from doctors.models import Doctor, Availability
from analysis.models import Alert


class AvailableSlotsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create doctor/provider user
        self.doctor_user = User.objects.create_user(
            username="dr_smith",
            email="drsmith@example.com",
            password="password123",
            first_name="John",
            last_name="Smith"
        )
        self.doctor_profile, _ = Profile.objects.get_or_create(user=self.doctor_user)
        self.doctor_profile.role = "provider"
        self.doctor_profile.verification_status = "approved"
        self.doctor_profile.title = "Clinical Psychologist"
        self.doctor_profile.specialization = "Anxiety & Stress"
        self.doctor_profile.save()

        # Create Doctor record and Availability date-range window
        self.doctor_record, _ = Doctor.objects.get_or_create(user=self.doctor_user)
        self.availability = Availability.objects.create(
            doctor=self.doctor_record,
            from_date=date(2026, 9, 1),
            to_date=date(2026, 9, 30),
            start_time=time(9, 0),
            end_time=time(17, 0),
        )

        # Create unconfigured doctor/provider user
        self.unconfigured_doctor = User.objects.create_user(
            username="dr_unconfigured",
            email="unconf@example.com",
            password="password123"
        )
        p, _ = Profile.objects.get_or_create(user=self.unconfigured_doctor)
        p.role = "provider"
        p.verification_status = "approved"
        p.specialization = "General"
        p.save()

        # Create regular patient user
        self.patient_user = User.objects.create_user(
            username="patient_jane",
            email="jane@example.com",
            password="password123",
            first_name="Jane",
            last_name="Doe"
        )
        self.patient_profile, _ = Profile.objects.get_or_create(user=self.patient_user)
        self.patient_profile.role = "patient"
        self.patient_profile.save()

        self.client.force_authenticate(user=self.patient_user)

    def test_missing_both_parameters(self):
        """GET without doctor and date should return 400 with clear message."""
        response = self.client.get("/api/appointments/available-slots/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("Both 'doctor' and 'date'", response.data["error"])

    def test_missing_doctor_parameter(self):
        """GET with date only should return 400 specifying doctor is required."""
        response = self.client.get("/api/appointments/available-slots/?date=2026-09-21")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("doctor", response.data["error"])

    def test_missing_date_parameter(self):
        """GET with doctor only should return 400 specifying date is required."""
        response = self.client.get(f"/api/appointments/available-slots/?doctor={self.doctor_user.id}")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("date", response.data["error"])

    def test_invalid_doctor_id(self):
        """GET with non-integer doctor ID should return 400."""
        response = self.client.get("/api/appointments/available-slots/?doctor=abc&date=2026-09-21")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_doctor_not_found(self):
        """GET with non-existent doctor ID should return 404."""
        response = self.client.get("/api/appointments/available-slots/?doctor=99999&date=2026-09-21")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    def test_user_is_not_provider(self):
        """GET with a patient user ID as doctor should return 400."""
        response = self.client.get(f"/api/appointments/available-slots/?doctor={self.patient_user.id}&date=2026-09-21")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("provider", response.data["error"])

    def test_invalid_date_format(self):
        """GET with non-YYYY-MM-DD date should return 400."""
        response = self.client.get(f"/api/appointments/available-slots/?doctor={self.doctor_user.id}&date=21-09-2026")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("format", response.data["error"])

    def test_valid_doctor_and_date_slots(self):
        """GET with valid doctor on a date within range should return available_slots array and has_configured_availability=True."""
        response = self.client.get(f"/api/appointments/available-slots/?doctor={self.doctor_user.id}&date=2026-09-21")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("has_configured_availability"))
        self.assertTrue(response.data.get("has_date_availability"))
        self.assertIn("available_slots", response.data)
        slots = response.data["available_slots"]
        self.assertIsInstance(slots, list)
        self.assertGreater(len(slots), 0)
        first_slot = slots[0]
        self.assertIn("start_time", first_slot)
        self.assertIn("end_time", first_slot)
        self.assertIn("label", first_slot)

    def test_unconfigured_doctor_availability_status(self):
        """GET for a doctor with no configured availability returns has_configured_availability=False."""
        response = self.client.get(f"/api/appointments/available-slots/?doctor={self.unconfigured_doctor.id}&date=2026-09-21")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get("has_configured_availability"))
        self.assertEqual(response.data.get("available_slots"), [])

    def test_date_outside_availability_range(self):
        """GET with date outside availability range should return empty slots but has_configured_availability=True."""
        response = self.client.get(f"/api/appointments/available-slots/?doctor={self.doctor_user.id}&date=2026-10-15")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("has_configured_availability"))
        self.assertFalse(response.data.get("has_date_availability"))
        self.assertEqual(response.data["available_slots"], [])

    def test_booked_slots_excluded(self):
        """Existing confirmed or pending appointments are excluded from available_slots."""
        # Book 09:00 - 10:00 on 2026-09-21
        Appointment.objects.create(
            patient=self.patient_user,
            provider=self.doctor_user,
            date=date(2026, 9, 21),
            start_time=time(9, 0),
            end_time=time(10, 0),
            status="confirmed",
        )

        response = self.client.get(f"/api/appointments/available-slots/?doctor={self.doctor_user.id}&date=2026-09-21")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slots = response.data["available_slots"]
        slot_starts = [s["start_time"] for s in slots]
        self.assertNotIn("09:00:00", slot_starts)
        self.assertIn("10:00:00", slot_starts)

    def test_appointment_booking_endpoint(self):
        """POST /api/appointments/book/ and /api/appointments/ create appointments cleanly."""
        booking_data = {
            "doctor": self.doctor_user.id,
            "date": "2026-09-22",
            "start_time": "14:00:00",
            "end_time": "15:00:00",
            "counseling_type": "in_person",
            "notes": "Introductory session",
        }
        res = self.client.post("/api/appointments/book/", booking_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["provider"], self.doctor_user.id)
        self.assertEqual(res.data["date"], "2026-09-22")

    def test_booking_appointment_auto_resolves_matching_alerts(self):
        """When a patient books an appointment matching an active alert's specialization, the alert resolves automatically."""
        # Active alert matching doctor's specialization "Anxiety & Stress"
        alert_matching = Alert.objects.create(
            patient=self.patient_user,
            severity="concern",
            matched_specialization="Anxiety & Stress",
            status="active"
        )
        # Active alert for a different specialization "Depression"
        alert_other = Alert.objects.create(
            patient=self.patient_user,
            severity="concern",
            matched_specialization="Depression",
            status="active"
        )

        booking_data = {
            "doctor": self.doctor_user.id,
            "date": "2026-09-23",
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "counseling_type": "in_person",
        }
        res = self.client.post("/api/appointments/", booking_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        alert_matching.refresh_from_db()
        alert_other.refresh_from_db()

        self.assertEqual(alert_matching.status, "resolved")
        self.assertEqual(alert_other.status, "active")