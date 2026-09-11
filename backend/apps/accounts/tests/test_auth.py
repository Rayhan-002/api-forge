import pytest
from rest_framework import status

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


class TestRegister:
    def test_register_creates_user_and_returns_tokens(self, api_client):
        response = api_client.post(
            "/api/auth/register/",
            {
                "email": "new@example.com",
                "password": "StrongPass123",
                "password_confirm": "StrongPass123",
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert "access" in response.data
        assert response.data["user"]["email"] == "new@example.com"
        assert User.objects.filter(email="new@example.com").exists()
        assert response.cookies["refresh_token"]["httponly"]

    def test_register_rejects_duplicate_email(self, api_client):
        create_user(email="dup@example.com")
        response = api_client.post(
            "/api/auth/register/",
            {
                "email": "dup@example.com",
                "password": "StrongPass123",
                "password_confirm": "StrongPass123",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_rejects_mismatched_passwords(self, api_client):
        response = api_client.post(
            "/api/auth/register/",
            {
                "email": "x@example.com",
                "password": "StrongPass123",
                "password_confirm": "Other123456",
            },
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not User.objects.filter(email="x@example.com").exists()

    def test_register_rejects_weak_password(self, api_client):
        response = api_client.post(
            "/api/auth/register/",
            {"email": "weak@example.com", "password": "12345678", "password_confirm": "12345678"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestLogin:
    def test_login_succeeds_with_correct_credentials(self, api_client):
        create_user(email="login@example.com", password="StrongPass123")
        response = api_client.post(
            "/api/auth/login/", {"email": "login@example.com", "password": "StrongPass123"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh_token" in response.cookies

    def test_login_rejects_wrong_password(self, api_client):
        create_user(email="login2@example.com", password="StrongPass123")
        response = api_client.post(
            "/api/auth/login/", {"email": "login2@example.com", "password": "WrongPass1"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_rejects_unknown_email(self, api_client):
        response = api_client.post(
            "/api/auth/login/", {"email": "nouser@example.com", "password": "whatever123"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestMe:
    def test_me_requires_authentication(self, api_client):
        response = api_client.get("/api/auth/me/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_returns_current_user(self, api_client):
        user = create_user(email="me@example.com", password="StrongPass123")
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/auth/me/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == "me@example.com"

    def test_me_never_exposes_password(self, api_client):
        user = create_user(email="nopass@example.com", password="StrongPass123")
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/auth/me/")
        assert "password" not in response.data


class TestRefresh:
    def test_refresh_without_cookie_fails(self, api_client):
        response = api_client.post("/api/auth/refresh/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_rotates_token(self, api_client):
        create_user(email="refresh@example.com", password="StrongPass123")
        login_response = api_client.post(
            "/api/auth/login/", {"email": "refresh@example.com", "password": "StrongPass123"}
        )
        old_refresh_cookie = login_response.cookies["refresh_token"].value

        refresh_response = api_client.post("/api/auth/refresh/")
        assert refresh_response.status_code == status.HTTP_200_OK
        assert "access" in refresh_response.data
        new_refresh_cookie = refresh_response.cookies["refresh_token"].value
        assert new_refresh_cookie != old_refresh_cookie

    def test_reusing_a_rotated_refresh_token_is_rejected(self, api_client):
        create_user(email="reuse@example.com", password="StrongPass123")
        login_response = api_client.post(
            "/api/auth/login/", {"email": "reuse@example.com", "password": "StrongPass123"}
        )
        old_refresh_cookie = login_response.cookies["refresh_token"].value

        first_refresh = api_client.post("/api/auth/refresh/")
        assert first_refresh.status_code == status.HTTP_200_OK

        api_client.cookies["refresh_token"] = old_refresh_cookie
        second_refresh = api_client.post("/api/auth/refresh/")
        assert second_refresh.status_code == status.HTTP_401_UNAUTHORIZED


class TestLogout:
    def test_logout_requires_authentication(self, api_client):
        response = api_client.post("/api/auth/logout/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_clears_cookie_and_invalidates_refresh_token(self, api_client):
        user = create_user(email="logout@example.com", password="StrongPass123")
        login_response = api_client.post(
            "/api/auth/login/", {"email": "logout@example.com", "password": "StrongPass123"}
        )
        old_refresh_cookie = login_response.cookies["refresh_token"].value

        api_client.force_authenticate(user=user)
        logout_response = api_client.post("/api/auth/logout/")
        assert logout_response.status_code == status.HTTP_200_OK
        assert logout_response.cookies["refresh_token"].value == ""

        api_client.cookies["refresh_token"] = old_refresh_cookie
        refresh_response = api_client.post("/api/auth/refresh/")
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED
