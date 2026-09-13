import pytest

from apps.accounts.models import User
from apps.environments.models import Environment, EnvironmentVariable
from apps.saved_requests.extraction import PathNotFound, apply_extract_rules, extract_json_value

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


class TestExtractJsonValue:
    def test_top_level_key(self):
        assert extract_json_value({"token": "abc"}, "token") == "abc"

    def test_nested_key(self):
        assert extract_json_value({"data": {"access_token": "abc"}}, "data.access_token") == "abc"

    def test_array_index(self):
        assert extract_json_value({"items": [{"id": 1}, {"id": 2}]}, "items.1.id") == 2

    def test_missing_key_raises(self):
        with pytest.raises(PathNotFound):
            extract_json_value({"token": "abc"}, "missing")

    def test_index_out_of_range_raises(self):
        with pytest.raises(PathNotFound):
            extract_json_value({"items": []}, "items.0")

    def test_indexing_into_scalar_raises(self):
        with pytest.raises(PathNotFound):
            extract_json_value({"token": "abc"}, "token.nested")


class TestApplyExtractRules:
    def test_creates_new_variable(self):
        user = create_user()
        environment = Environment.objects.create(owner=user, name="Dev")
        rules = [
            {
                "variable_name": "token",
                "source_path": "access_token",
                "target_environment": str(environment.id),
            }
        ]

        results = apply_extract_rules(
            owner=user, extract_rules=rules, response_body='{"access_token": "abc123"}'
        )

        assert results[0]["success"] is True
        variable = EnvironmentVariable.objects.get(environment=environment, key="token")
        assert variable.value == "abc123"

    def test_updates_existing_variable(self):
        user = create_user()
        environment = Environment.objects.create(owner=user, name="Dev")
        EnvironmentVariable.objects.create(environment=environment, key="token", value="old")
        rules = [
            {
                "variable_name": "token",
                "source_path": "access_token",
                "target_environment": str(environment.id),
            }
        ]

        apply_extract_rules(owner=user, extract_rules=rules, response_body='{"access_token": "new-value"}')

        variable = EnvironmentVariable.objects.get(environment=environment, key="token")
        assert variable.value == "new-value"

    def test_preserves_is_secret_flag_on_update(self):
        user = create_user()
        environment = Environment.objects.create(owner=user, name="Dev")
        EnvironmentVariable.objects.create(environment=environment, key="token", value="old", is_secret=True)
        rules = [
            {
                "variable_name": "token",
                "source_path": "access_token",
                "target_environment": str(environment.id),
            }
        ]

        apply_extract_rules(owner=user, extract_rules=rules, response_body='{"access_token": "new-value"}')

        variable = EnvironmentVariable.objects.get(environment=environment, key="token")
        assert variable.is_secret is True

    def test_reports_failure_for_invalid_json_body(self):
        user = create_user()
        environment = Environment.objects.create(owner=user, name="Dev")
        rules = [
            {
                "variable_name": "token",
                "source_path": "access_token",
                "target_environment": str(environment.id),
            }
        ]

        results = apply_extract_rules(owner=user, extract_rules=rules, response_body="not json")

        assert results[0]["success"] is False
        assert "not valid JSON" in results[0]["message"]

    def test_reports_failure_for_missing_path(self):
        user = create_user()
        environment = Environment.objects.create(owner=user, name="Dev")
        rules = [{"variable_name": "token", "source_path": "nope", "target_environment": str(environment.id)}]

        results = apply_extract_rules(
            owner=user, extract_rules=rules, response_body='{"access_token": "abc"}'
        )

        assert results[0]["success"] is False

    def test_reports_failure_for_missing_environment(self):
        user = create_user()
        rules = [
            {
                "variable_name": "token",
                "source_path": "access_token",
                "target_environment": "00000000-0000-0000-0000-000000000000",
            }
        ]

        results = apply_extract_rules(
            owner=user, extract_rules=rules, response_body='{"access_token": "abc"}'
        )

        assert results[0]["success"] is False
        assert "no longer exists" in results[0]["message"]

    def test_cannot_write_into_another_users_environment(self):
        owner = create_user(email="owner@example.com")
        stranger = create_user(email="stranger@example.com")
        strangers_env = Environment.objects.create(owner=stranger, name="Not yours")
        rules = [
            {
                "variable_name": "token",
                "source_path": "access_token",
                "target_environment": str(strangers_env.id),
            }
        ]

        results = apply_extract_rules(
            owner=owner, extract_rules=rules, response_body='{"access_token": "abc"}'
        )

        assert results[0]["success"] is False
        assert not EnvironmentVariable.objects.filter(environment=strangers_env).exists()

    def test_no_rules_returns_empty_list(self):
        user = create_user()
        assert apply_extract_rules(owner=user, extract_rules=[], response_body='{"a": 1}') == []
