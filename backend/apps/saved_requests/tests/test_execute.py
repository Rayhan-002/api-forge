from unittest.mock import patch

import pytest
from rest_framework import status

from apps.accounts.models import User
from apps.collections.models import Collection
from apps.core.errors import RequestExecutionError
from apps.core.http_client import ExecutionResult
from apps.environments.models import Environment, EnvironmentVariable
from apps.history.models import RequestHistory
from apps.saved_requests.models import SavedRequest

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


def create_saved_request(user, **kwargs):
    collection = Collection.objects.create(owner=user, name="Company API")
    defaults = {"name": "Login", "method": "POST", "url": "https://api.example.com/login"}
    defaults.update(kwargs)
    return SavedRequest.objects.create(collection=collection, **defaults)


VALID_PAYLOAD = {
    "method": "POST",
    "url": "https://api.example.com/login",
    "params": [],
    "headers": [],
    "body_type": "none",
    "body": None,
    "auth_type": "none",
    "auth_config": None,
}


def fake_result(**overrides):
    defaults = dict(
        status_code=200,
        reason_phrase="OK",
        headers={},
        body='{"token": "abc123"}',
        url="https://api.example.com/login",
        elapsed_ms=10,
        size_bytes=20,
    )
    defaults.update(overrides)
    return ExecutionResult(**defaults)


class TestSavedRequestExecuteView:
    def test_requires_authentication(self, api_client):
        saved_request = create_saved_request(create_user())
        response = api_client.post(f"/api/requests/{saved_request.id}/execute/", VALID_PAYLOAD, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cannot_execute_other_users_saved_request(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        saved_request = create_saved_request(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.post(f"/api/requests/{saved_request.id}/execute/", VALID_PAYLOAD, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_successful_execution_links_history_to_saved_request(self, api_client):
        user = create_user()
        saved_request = create_saved_request(user)
        api_client.force_authenticate(user=user)

        with patch("apps.core.services.execute_http_request", return_value=fake_result()):
            response = api_client.post(
                f"/api/requests/{saved_request.id}/execute/", VALID_PAYLOAD, format="json"
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        entry = RequestHistory.objects.get(owner=user)
        assert entry.saved_request_id == saved_request.id

    def test_no_extraction_rules_returns_empty_extractions(self, api_client):
        user = create_user()
        saved_request = create_saved_request(user)
        api_client.force_authenticate(user=user)

        with patch("apps.core.services.execute_http_request", return_value=fake_result()):
            response = api_client.post(
                f"/api/requests/{saved_request.id}/execute/", VALID_PAYLOAD, format="json"
            )

        assert response.data["extractions"] == []

    def test_successful_execution_applies_extract_rules(self, api_client):
        user = create_user()
        environment = Environment.objects.create(owner=user, name="Dev")
        saved_request = create_saved_request(
            user,
            extract_rules=[
                {"variable_name": "token", "source_path": "token", "target_environment": str(environment.id)}
            ],
        )
        api_client.force_authenticate(user=user)

        with patch("apps.core.services.execute_http_request", return_value=fake_result()):
            response = api_client.post(
                f"/api/requests/{saved_request.id}/execute/", VALID_PAYLOAD, format="json"
            )

        assert response.data["extractions"] == [
            {
                "variable_name": "token",
                "target_environment": str(environment.id),
                "success": True,
                "message": "Set token in Dev.",
            }
        ]
        assert EnvironmentVariable.objects.get(environment=environment, key="token").value == "abc123"

    def test_failed_execution_does_not_apply_extract_rules(self, api_client):
        user = create_user()
        environment = Environment.objects.create(owner=user, name="Dev")
        saved_request = create_saved_request(
            user,
            extract_rules=[
                {"variable_name": "token", "source_path": "token", "target_environment": str(environment.id)}
            ],
        )
        api_client.force_authenticate(user=user)

        with patch(
            "apps.core.services.execute_http_request",
            side_effect=RequestExecutionError("timeout", "Connection timed out."),
        ):
            response = api_client.post(
                f"/api/requests/{saved_request.id}/execute/", VALID_PAYLOAD, format="json"
            )

        assert response.data["success"] is False
        assert response.data["extractions"] == []
        assert not EnvironmentVariable.objects.filter(environment=environment).exists()

    def test_extraction_failure_does_not_fail_the_request(self, api_client):
        user = create_user()
        environment = Environment.objects.create(owner=user, name="Dev")
        saved_request = create_saved_request(
            user,
            extract_rules=[
                {
                    "variable_name": "missing",
                    "source_path": "does.not.exist",
                    "target_environment": str(environment.id),
                }
            ],
        )
        api_client.force_authenticate(user=user)

        with patch("apps.core.services.execute_http_request", return_value=fake_result()):
            response = api_client.post(
                f"/api/requests/{saved_request.id}/execute/", VALID_PAYLOAD, format="json"
            )

        assert response.data["success"] is True
        assert response.data["extractions"][0]["success"] is False
