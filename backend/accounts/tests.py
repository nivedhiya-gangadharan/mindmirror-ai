from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AccountsAPITests(APITestCase):
    def setUp(self):
        self.register_url = reverse("register")
        self.login_url = reverse("login")
        self.me_url = reverse("current_user")
        self.user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "securepassword123"
        }

    def test_register_user_success(self):
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["email"], "test@example.com")
        self.assertNotIn("password", response.data)
        self.assertTrue(User.objects.filter(username="testuser").exists())

    def test_login_user_success(self):
        User.objects.create_user(**self.user_data)
        response = self.client.post(self.login_url, {
            "username": "testuser",
            "password": "securepassword123"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_me_endpoint_unauthenticated(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_authenticated(self):
        user = User.objects.create_user(**self.user_data)
        self.client.force_authenticate(user=user)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], user.id)
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["email"], "test@example.com")
        self.assertIn("date_joined", response.data)
        self.assertNotIn("password", response.data)

    def test_patch_me_update_name_and_place(self):
        user = User.objects.create_user(**self.user_data)
        self.client.force_authenticate(user=user)
        response = self.client.patch(self.me_url, {
            "first_name": "Eleanor",
            "last_name": "Vance",
            "place": "San Francisco, CA",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.first_name, "Eleanor")
        self.assertEqual(user.last_name, "Vance")
        self.assertEqual(user.profile.place, "San Francisco, CA")

    def test_photo_upload_and_delete(self):
        import io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile

        user = User.objects.create_user(**self.user_data)
        self.client.force_authenticate(user=user)

        # Generate a 10x10 test image
        img = Image.new("RGB", (10, 10), color="pink")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        uploaded = SimpleUploadedFile("avatar.png", buffer.read(), content_type="image/png")

        photo_url = reverse("profile_photo")
        response = self.client.post(photo_url, {"photo": uploaded}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("photo", response.data)
        user.refresh_from_db()
        self.assertTrue(bool(user.profile.photo))

        # Delete photo
        del_resp = self.client.delete(photo_url)
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertFalse(bool(user.profile.photo))

    def test_change_password_wrong_current(self):
        user = User.objects.create_user(**self.user_data)
        self.client.force_authenticate(user=user)
        url = reverse("change_password")
        response = self.client.post(url, {
            "current_password": "wrongpassword",
            "new_password": "AValidNewPassword987!",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("current_password", response.data)

    def test_change_password_weak_new(self):
        user = User.objects.create_user(**self.user_data)
        self.client.force_authenticate(user=user)
        url = reverse("change_password")
        # Too short password (< 8 chars)
        response = self.client.post(url, {
            "current_password": "securepassword123",
            "new_password": "123",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.data)

    def test_change_password_success(self):
        user = User.objects.create_user(**self.user_data)
        self.client.force_authenticate(user=user)
        url = reverse("change_password")
        response = self.client.post(url, {
            "current_password": "securepassword123",
            "new_password": "SuperBrandNewSecurePass999!",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("SuperBrandNewSecurePass999!"))

