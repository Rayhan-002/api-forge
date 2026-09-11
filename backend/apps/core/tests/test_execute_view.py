from unittest.mock import patch

import pytest
from rest_framework import status

from apps.accounts.models import User
from apps.core.errors import RequestExecutionError
from apps.core.http_client import ExecutionResult

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


VALID_PAYLOAD = {
    "method": "GET",
    "url": "https://api.example.com/users",
    "params": [],
    "headers": [],
    "body_type": "none",
    "body": None,
    "auth_type": "none",
    "auth_config": None,
}


class TestExecuteView:
    def test_requires_authentication(self, api_client):
        response = api_client.post("/api/execute/", VALID_PAYLOAD, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rejects_malformed_payload(self, api_client):
        user = create_user()
        api_client.force_authenticate(user=user)

        response = api_client.post("/api/execute/", {"url": "https://api.example.com"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_returns_success_shape_on_successful_execution(self, api_client):
        user = create_user()
        api_client.force_authenticate(user=user)

        fake_result = ExecutionResult(
            status_code=200,
            reason_phrase="OK",
            headers={"content-type": "application/json"},
            body='{"ok": true}',
            url="https://api.example.com/users",
            elapsed_ms=42,
            size_bytes=12,
        )

        with patch("apps.core.views.execute_http_request", return_value=fake_result):
            response = api_client.post("/api/execute/", VALID_PAYLOAD, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["status_code"] == 200
        assert response.data["elapsed_ms"] == 42

    def test_returns_controlled_failure_shape(self, api_client):
        user = create_user()
        api_client.force_authenticate(user=user)

        with patch(
            "apps.core.views.execute_http_request",
            side_effect=RequestExecutionError("timeout", "Connection timed out."),
        ):
            response = api_client.post("/api/execute/", VALID_PAYLOAD, format="json")

        # The call to *our* API succeeded; the target request failed.
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is False
        assert response.data["error_type"] == "timeout"
