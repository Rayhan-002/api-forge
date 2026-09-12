import pytest

from apps.core.errors import RequestExecutionError
from apps.core.variables import resolve_payload

BASE_PAYLOAD = {
    "method": "GET",
    "url": "https://api.example.com/users",
    "params": [],
    "headers": [],
    "body_type": "none",
    "body": None,
    "auth_type": "none",
    "auth_config": None,
}


class TestResolvePayload:
    def test_substitutes_in_url(self):
        payload = {**BASE_PAYLOAD, "url": "{{base_url}}/users"}

        resolved = resolve_payload(payload, {"base_url": "https://api.example.com"})

        assert resolved["url"] == "https://api.example.com/users"

    def test_substitutes_in_params_and_headers(self):
        payload = {
            **BASE_PAYLOAD,
            "params": [{"key": "id", "value": "{{user_id}}", "enabled": True}],
            "headers": [{"key": "X-Trace", "value": "{{trace_id}}", "enabled": True}],
        }

        resolved = resolve_payload(payload, {"user_id": "42", "trace_id": "abc"})

        assert resolved["params"][0]["value"] == "42"
        assert resolved["headers"][0]["value"] == "abc"

    def test_substitutes_in_raw_body(self):
        payload = {**BASE_PAYLOAD, "body_type": "json", "body": '{"name": "{{name}}"}'}

        resolved = resolve_payload(payload, {"name": "Ada"})

        assert resolved["body"] == '{"name": "Ada"}'

    def test_substitutes_in_form_body_rows(self):
        payload = {
            **BASE_PAYLOAD,
            "body_type": "form-urlencoded",
            "body": [{"key": "username", "value": "{{username}}", "enabled": True}],
        }

        resolved = resolve_payload(payload, {"username": "alice"})

        assert resolved["body"][0]["value"] == "alice"

    def test_substitutes_in_auth_config(self):
        payload = {**BASE_PAYLOAD, "auth_type": "bearer", "auth_config": {"token": "{{token}}"}}

        resolved = resolve_payload(payload, {"token": "real-token"})

        assert resolved["auth_config"]["token"] == "real-token"

    def test_leaves_text_without_variables_unchanged(self):
        resolved = resolve_payload(BASE_PAYLOAD, {})
        assert resolved["url"] == BASE_PAYLOAD["url"]

    def test_raises_on_unresolved_variable(self):
        payload = {**BASE_PAYLOAD, "url": "{{base_url}}/users"}

        with pytest.raises(RequestExecutionError) as exc_info:
            resolve_payload(payload, {})

        assert exc_info.value.error_type == "unresolved_variable"
        assert "base_url" in exc_info.value.message

    def test_reports_every_unresolved_variable_at_once(self):
        payload = {
            **BASE_PAYLOAD,
            "url": "{{base_url}}/users",
            "headers": [{"key": "Authorization", "value": "Bearer {{token}}", "enabled": True}],
        }

        with pytest.raises(RequestExecutionError) as exc_info:
            resolve_payload(payload, {})

        assert "base_url" in exc_info.value.message
        assert "token" in exc_info.value.message
