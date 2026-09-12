import pytest
from rest_framework import status

from apps.accounts.models import User
from apps.core.http_client import ExecutionResult
from apps.history.models import RequestHistory
from apps.history.services import record_history

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


BASE_REQUEST_DATA = {
    "method": "GET",
    "url": "https://api.example.com/users",
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
        headers={"content-type": "application/json"},
        body='{"ok": true}',
        url="https://api.example.com/users",
        elapsed_ms=42,
        size_bytes=13,
    )
    defaults.update(overrides)
    return ExecutionResult(**defaults)


class TestRecordHistoryRedaction:
    def test_redacts_authorization_header(self):
        user = create_user()
        data = {
            **BASE_REQUEST_DATA,
            "headers": [{"key": "Authorization", "value": "Bearer real-secret", "enabled": True}],
        }

        entry = record_history(owner=user, request_data=data, success=True, result=fake_result())

        assert entry.request_snapshot["headers"][0]["value"] == "••••"

    def test_leaves_non_sensitive_headers_untouched(self):
        user = create_user()
        data = {
            **BASE_REQUEST_DATA,
            "headers": [{"key": "X-Trace-Id", "value": "abc123", "enabled": True}],
        }

        entry = record_history(owner=user, request_data=data, success=True, result=fake_result())

        assert entry.request_snapshot["headers"][0]["value"] == "abc123"

    def test_redacts_bearer_token_in_auth_config(self):
        user = create_user()
        data = {**BASE_REQUEST_DATA, "auth_type": "bearer", "auth_config": {"token": "real-secret"}}

        entry = record_history(owner=user, request_data=data, success=True, result=fake_result())

        assert entry.request_snapshot["auth_config"]["token"] == "••••"

    def test_does_not_redact_a_variable_template_in_auth_config(self):
        """
        A `{{token}}` reference doesn't itself contain a secret — the real
        value only exists after apps.core.variables resolves it, which
        happens after this snapshot is already written. Redacting the
        template would break restoring the request from history for no
        security benefit.
        """
        user = create_user()
        data = {**BASE_REQUEST_DATA, "auth_type": "bearer", "auth_config": {"token": "{{token}}"}}

        entry = record_history(owner=user, request_data=data, success=True, result=fake_result())

        assert entry.request_snapshot["auth_config"]["token"] == "{{token}}"

    def test_does_not_redact_a_variable_template_in_a_sensitive_header(self):
        user = create_user()
        data = {
            **BASE_REQUEST_DATA,
            "headers": [{"key": "Authorization", "value": "Bearer {{token}}", "enabled": True}],
        }

        entry = record_history(owner=user, request_data=data, success=True, result=fake_result())

        assert entry.request_snapshot["headers"][0]["value"] == "Bearer {{token}}"

    def test_redacts_basic_password_but_not_username(self):
        user = create_user()
        data = {
            **BASE_REQUEST_DATA,
            "auth_type": "basic",
            "auth_config": {"username": "alice", "password": "real-secret"},
        }

        entry = record_history(owner=user, request_data=data, success=True, result=fake_result())

        assert entry.request_snapshot["auth_config"]["username"] == "alice"
        assert entry.request_snapshot["auth_config"]["password"] == "••••"

    def test_redacts_api_key_value(self):
        user = create_user()
        data = {
            **BASE_REQUEST_DATA,
            "auth_type": "api_key",
            "auth_config": {"key_name": "X-Api-Key", "key_value": "real-secret", "add_to": "header"},
        }

        entry = record_history(owner=user, request_data=data, success=True, result=fake_result())

        assert entry.request_snapshot["auth_config"]["key_name"] == "X-Api-Key"
        assert entry.request_snapshot["auth_config"]["key_value"] == "••••"


class TestRecordHistoryOutcome:
    def test_success_stores_status_and_timing(self):
        user = create_user()

        entry = record_history(
            owner=user, request_data=BASE_REQUEST_DATA, success=True, result=fake_result(status_code=201)
        )

        assert entry.success is True
        assert entry.status_code == 201
        assert entry.response_time_ms == 42
        assert entry.response_size_bytes == 13
        assert entry.response_snapshot == {"headers": {"content-type": "application/json"}}

    def test_failure_stores_error_with_no_status_code(self):
        user = create_user()

        entry = record_history(
            owner=user, request_data=BASE_REQUEST_DATA, success=False, error_message="Connection timed out."
        )

        assert entry.success is False
        assert entry.status_code is None
        assert entry.error_message == "Connection timed out."
        assert entry.response_snapshot is None


class TestHistoryList:
    def test_requires_authentication(self, api_client):
        response = api_client.get("/api/history/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_lists_only_own_history(self, api_client):
        owner = create_user(email="owner@example.com")
        other = create_user(email="other@example.com")
        record_history(owner=owner, request_data=BASE_REQUEST_DATA, success=True, result=fake_result())
        record_history(owner=other, request_data=BASE_REQUEST_DATA, success=True, result=fake_result())

        api_client.force_authenticate(user=owner)
        response = api_client.get("/api/history/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_filter_by_method(self, api_client):
        user = create_user()
        record_history(
            owner=user,
            request_data={**BASE_REQUEST_DATA, "method": "GET"},
            success=True,
            result=fake_result(),
        )
        record_history(
            owner=user,
            request_data={**BASE_REQUEST_DATA, "method": "POST"},
            success=True,
            result=fake_result(),
        )

        api_client.force_authenticate(user=user)
        response = api_client.get("/api/history/?method=post")

        assert response.data["count"] == 1
        assert response.data["results"][0]["method"] == "POST"

    def test_filter_by_success(self, api_client):
        user = create_user()
        record_history(owner=user, request_data=BASE_REQUEST_DATA, success=True, result=fake_result())
        record_history(owner=user, request_data=BASE_REQUEST_DATA, success=False, error_message="Timed out.")

        api_client.force_authenticate(user=user)
        response = api_client.get("/api/history/?success=false")

        assert response.data["count"] == 1
        assert response.data["results"][0]["success"] is False


class TestHistoryDetailAndDelete:
    def test_retrieve_own_entry(self, api_client):
        user = create_user()
        entry = record_history(owner=user, request_data=BASE_REQUEST_DATA, success=True, result=fake_result())
        api_client.force_authenticate(user=user)

        response = api_client.get(f"/api/history/{entry.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["url"] == BASE_REQUEST_DATA["url"]

    def test_cannot_retrieve_other_users_entry(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        entry = record_history(
            owner=owner, request_data=BASE_REQUEST_DATA, success=True, result=fake_result()
        )

        api_client.force_authenticate(user=intruder)
        response = api_client.get(f"/api/history/{entry.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_own_entry(self, api_client):
        user = create_user()
        entry = record_history(owner=user, request_data=BASE_REQUEST_DATA, success=True, result=fake_result())
        api_client.force_authenticate(user=user)

        response = api_client.delete(f"/api/history/{entry.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not RequestHistory.objects.filter(id=entry.id).exists()

    def test_cannot_delete_other_users_entry(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        entry = record_history(
            owner=owner, request_data=BASE_REQUEST_DATA, success=True, result=fake_result()
        )

        api_client.force_authenticate(user=intruder)
        response = api_client.delete(f"/api/history/{entry.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert RequestHistory.objects.filter(id=entry.id).exists()


class TestHistoryClear:
    def test_requires_authentication(self, api_client):
        response = api_client.delete("/api/history/clear/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_clears_only_own_history(self, api_client):
        owner = create_user(email="owner@example.com")
        other = create_user(email="other@example.com")
        record_history(owner=owner, request_data=BASE_REQUEST_DATA, success=True, result=fake_result())
        record_history(owner=other, request_data=BASE_REQUEST_DATA, success=True, result=fake_result())

        api_client.force_authenticate(user=owner)
        response = api_client.delete("/api/history/clear/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not RequestHistory.objects.filter(owner=owner).exists()
        assert RequestHistory.objects.filter(owner=other).exists()
