from datetime import datetime, time, timedelta
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Appointment
from .serializers import AppointmentSerializer
from doctors.models import Availability, Doctor
from doctors.serializers import AvailabilitySerializer


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    CRUD for appointments:
    - Patients see appointments where they are the patient.
    - Providers see appointments where they are the provider.
    - Patients can cancel their appointments.
    - Providers can confirm, complete, or cancel appointments.
    """
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user.profile, "role", "patient") if hasattr(user, "profile") else "patient"

        if role == "provider":
            qs = Appointment.objects.filter(provider=user).select_related(
                "patient", "provider", "provider__profile"
            )
        else:
            qs = Appointment.objects.filter(patient=user).select_related(
                "patient", "provider", "provider__profile"
            )

        # Optional date filter for provider dashboard (e.g. ?date=today or ?date=2026-09-08)
        date_param = self.request.query_params.get("date")
        if date_param:
            if date_param == "today":
                qs = qs.filter(date=datetime.now().date())
            else:
                try:
                    target_date = datetime.strptime(date_param, "%Y-%m-%d").date()
                    qs = qs.filter(date=target_date)
                except ValueError:
                    pass

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        return qs

    def perform_create(self, serializer):
        appointment = serializer.save(patient=self.request.user)
        # Auto-resolve matching active alerts for this patient
        provider = appointment.provider
        provider_spec = getattr(getattr(provider, "profile", None), "specialization", None)
        if provider_spec:
            from analysis.models import Alert
            Alert.objects.filter(
                patient=self.request.user,
                matched_specialization__iexact=provider_spec.strip(),
                status="active",
            ).update(status="resolved")

    def partial_update(self, request, *args, **kwargs):
        appointment = self.get_object()
        user = request.user
        role = getattr(user.profile, "role", "patient") if hasattr(user, "profile") else "patient"
        new_status = request.data.get("status")

        # Permissions check for status changes
        if new_status:
            if role == "patient":
                if new_status != "cancelled":
                    return Response(
                        {"detail": "Patients can only cancel appointments."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif role == "provider":
                if new_status not in ["pending", "confirmed", "completed", "cancelled"]:
                    return Response(
                        {"detail": "Invalid status value."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        return super().partial_update(request, *args, **kwargs)


class ProviderAvailabilityView(APIView):
    """
    Compute free time slots for a specific provider on a given date.
    Endpoint: GET /api/appointments/providers/<provider_id>/availability/?date=YYYY-MM-DD
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, provider_id):
        provider = get_object_or_404(User, id=provider_id)
        if not hasattr(provider, "profile") or provider.profile.role != "provider":
            return Response(
                {"detail": "User is not a provider."},
                status=status.HTTP_400_BAD_REQUEST
            )

        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"detail": "date query parameter is required (format: YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )

        doctor_obj = getattr(provider, "doctor_profile", None)
        if not doctor_obj:
            doctor_obj, _ = Doctor.objects.get_or_create(user=provider)

        has_configured_availability = Availability.objects.filter(doctor=doctor_obj).exists()

        availabilities = Availability.objects.filter(
            doctor=doctor_obj,
            from_date__lte=target_date,
            to_date__gte=target_date,
        ).order_by("start_time")

        intervals = []
        for slot in availabilities:
            cur_dt = datetime.combine(target_date, slot.start_time)
            end_dt = datetime.combine(target_date, slot.end_time)
            while cur_dt + timedelta(hours=1) <= end_dt:
                slot_interval = (cur_dt.time(), (cur_dt + timedelta(hours=1)).time())
                if slot_interval not in intervals:
                    intervals.append(slot_interval)
                cur_dt += timedelta(hours=1)

        intervals.sort(key=lambda x: x[0])

        # Subtract existing confirmed or pending appointments
        booked_appointments = Appointment.objects.filter(
            provider=provider,
            date=target_date,
            status__in=["pending", "confirmed"]
        ).values_list("start_time", "end_time")

        available_slots = []
        for s_time, e_time in intervals:
            is_booked = any(
                not (e_time <= b_start or s_time >= b_end)
                for b_start, b_end in booked_appointments
            )
            if not is_booked:
                s_fmt = s_time.strftime("%I:%M %p").lstrip("0")
                e_fmt = e_time.strftime("%I:%M %p").lstrip("0")
                available_slots.append({
                    "start_time": s_time.strftime("%H:%M:%S"),
                    "end_time": e_time.strftime("%H:%M:%S"),
                    "label": f"{s_fmt} - {e_fmt}",
                })

        return Response({
            "provider_id": provider.id,
            "provider_name": f"{provider.first_name} {provider.last_name}".strip() or provider.username,
            "date": str(target_date),
            "weekday": target_date.weekday(),
            "has_configured_availability": has_configured_availability,
            "has_date_availability": len(availabilities) > 0,
            "slots": available_slots,
            "available_slots": available_slots,
        })


class MyAvailabilityViewSet(viewsets.ModelViewSet):
    """
    Allows logged-in providers to view, add, and delete their date-range availability.
    Filtered by request.user.doctor_profile.
    """
    serializer_class = AvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_doctor_profile(self, user):
        doctor = getattr(user, "doctor_profile", None)
        if not doctor:
            doctor, _ = Doctor.objects.get_or_create(user=user)
        return doctor

    def get_queryset(self):
        doctor = self._get_doctor_profile(self.request.user)
        return Availability.objects.filter(doctor=doctor)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doctor = self._get_doctor_profile(request.user)

        from_date = serializer.validated_data["from_date"]
        to_date = serializer.validated_data["to_date"]
        start_time = serializer.validated_data["start_time"]
        end_time = serializer.validated_data["end_time"]

        # Prevent duplicate entries
        existing = Availability.objects.filter(
            doctor=doctor,
            from_date=from_date,
            to_date=to_date,
            start_time=start_time,
            end_time=end_time,
        ).first()

        if existing:
            return Response(self.get_serializer(existing).data, status=status.HTTP_200_OK)

        instance = serializer.save(doctor=doctor)
        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        doctor = self._get_doctor_profile(self.request.user)
        serializer.save(doctor=doctor)


class AvailableSlotsView(APIView):
    """
    Compute available time slots for a specific doctor on a given date.
    Endpoint: GET /api/appointments/available-slots/?doctor=<doctor_id>&date=<YYYY-MM-DD>
    Checks whether date falls within any Availability entry's [from_date, to_date] range (inclusive).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        doctor_param = (
            request.query_params.get("doctor")
            or request.query_params.get("doctor_id")
            or request.query_params.get("provider_id")
            or request.query_params.get("provider")
        )
        date_param = request.query_params.get("date")

        if not doctor_param and not date_param:
            return Response(
                {"error": "Both 'doctor' and 'date' query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not doctor_param:
            return Response(
                {"error": "'doctor' parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not date_param:
            return Response(
                {"error": "'date' parameter is required (format: YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            doctor_id = int(doctor_param)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid doctor ID. Must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            doctor = User.objects.get(id=doctor_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Doctor not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not hasattr(doctor, "profile") or doctor.profile.role != "provider":
            return Response(
                {"error": "User is not a provider."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_date = datetime.strptime(date_param, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        weekday = target_date.weekday()

        # Resolve doctor profile
        doctor_obj = getattr(doctor, "doctor_profile", None)
        if not doctor_obj:
            doctor_obj, _ = Doctor.objects.get_or_create(user=doctor)

        # Check whether doctor has any configured availability windows at all
        has_configured_availability = Availability.objects.filter(doctor=doctor_obj).exists()

        # Check whether target_date falls within any Availability entry's [from_date, to_date] range (inclusive)
        availabilities = Availability.objects.filter(
            doctor=doctor_obj,
            from_date__lte=target_date,
            to_date__gte=target_date,
        ).order_by("start_time")

        has_date_availability = availabilities.exists()

        intervals = []
        for slot in availabilities:
            cur_dt = datetime.combine(target_date, slot.start_time)
            end_dt = datetime.combine(target_date, slot.end_time)
            while cur_dt + timedelta(hours=1) <= end_dt:
                slot_interval = (cur_dt.time(), (cur_dt + timedelta(hours=1)).time())
                if slot_interval not in intervals:
                    intervals.append(slot_interval)
                cur_dt += timedelta(hours=1)

        intervals.sort(key=lambda x: x[0])

        # Subtract existing confirmed or pending appointments
        booked_appointments = Appointment.objects.filter(
            provider=doctor,
            date=target_date,
            status__in=["pending", "confirmed"],
        ).values_list("start_time", "end_time")

        available_slots = []
        for s_time, e_time in intervals:
            is_booked = any(
                not (e_time <= b_start or s_time >= b_end)
                for b_start, b_end in booked_appointments
            )
            if not is_booked:
                s_fmt = s_time.strftime("%I:%M %p").lstrip("0")
                e_fmt = e_time.strftime("%I:%M %p").lstrip("0")
                available_slots.append({
                    "start_time": s_time.strftime("%H:%M:%S"),
                    "end_time": e_time.strftime("%H:%M:%S"),
                    "label": f"{s_fmt} - {e_fmt}",
                })

        return Response({
            "doctor": doctor.id,
            "doctor_name": f"{doctor.first_name} {doctor.last_name}".strip() or doctor.username,
            "provider_id": doctor.id,
            "provider_name": f"{doctor.first_name} {doctor.last_name}".strip() or doctor.username,
            "date": str(target_date),
            "weekday": weekday,
            "has_configured_availability": has_configured_availability,
            "has_date_availability": has_date_availability,
            "available_slots": available_slots,
            "slots": available_slots,
        })