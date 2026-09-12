import pytest
from rest_framework import status

from apps.accounts.models import User
from apps.environments.models import Environment, EnvironmentVariable
from apps.environments.services import get_active_variables

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


def create_environment(owner, name="Development", **kwargs):
    return Environment.objects.create(owner=owner, name=name, **kwargs)


class TestEnvironmentList:
    def test_requires_authentication(self, api_client):
        response = api_client.get("/api/environments/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_lists_only_own_environments(self, api_client):
        owner = create_user(email="owner@example.com")
        other = create_user(email="other@example.com")
        create_environment(owner, name="Mine")
        create_environment(other, name="Not mine")

        api_client.force_authenticate(user=owner)
        response = api_client.get("/api/environments/")

        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Mine"

    def test_create_environment(self, api_client):
        user = create_user()
        api_client.force_authenticate(user=user)

        response = api_client.post("/api/environments/", {"name": "Development"})

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["is_active"] is False
        assert response.data["variable_count"] == 0

    def test_cannot_create_duplicate_name_for_same_owner(self, api_client):
        user = create_user()
        create_environment(user, name="Development")
        api_client.force_authenticate(user=user)

        response = api_client.post("/api/environments/", {"name": "Development"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_same_name_allowed_for_different_owners(self, api_client):
        create_environment(create_user(email="a@example.com"), name="Development")
        user_b = create_user(email="b@example.com")
        api_client.force_authenticate(user=user_b)

        response = api_client.post("/api/environments/", {"name": "Development"})

        assert response.status_code == status.HTTP_201_CREATED


class TestEnvironmentDetail:
    def test_cannot_retrieve_other_users_environment(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        environment = create_environment(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.get(f"/api/environments/{environment.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_rename_environment(self, api_client):
        user = create_user()
        environment = create_environment(user, name="Old")
        api_client.force_authenticate(user=user)

        response = api_client.patch(f"/api/environments/{environment.id}/", {"name": "New"})

        assert response.status_code == status.HTTP_200_OK
        environment.refresh_from_db()
        assert environment.name == "New"

    def test_delete_environment_cascades_to_variables(self, api_client):
        user = create_user()
        environment = create_environment(user)
        variable = EnvironmentVariable.objects.create(environment=environment, key="base_url", value="x")
        api_client.force_authenticate(user=user)

        response = api_client.delete(f"/api/environments/{environment.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not EnvironmentVariable.objects.filter(id=variable.id).exists()


class TestEnvironmentActivation:
    def test_activating_one_deactivates_others(self, api_client):
        user = create_user()
        env_a = create_environment(user, name="A", is_active=True)
        env_b = create_environment(user, name="B")
        api_client.force_authenticate(user=user)

        response = api_client.post(f"/api/environments/{env_b.id}/activate/")

        assert response.status_code == status.HTTP_200_OK
        env_a.refresh_from_db()
        env_b.refresh_from_db()
        assert env_a.is_active is False
        assert env_b.is_active is True

    def test_cannot_activate_other_users_environment(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        environment = create_environment(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.post(f"/api/environments/{environment.id}/activate/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_deactivate_all(self, api_client):
        user = create_user()
        environment = create_environment(user, is_active=True)
        api_client.force_authenticate(user=user)

        response = api_client.post("/api/environments/deactivate/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        environment.refresh_from_db()
        assert environment.is_active is False

    def test_deactivate_only_affects_caller(self, api_client):
        owner = create_user(email="owner@example.com")
        other = create_user(email="other@example.com")
        owner_env = create_environment(owner, is_active=True)
        other_env = create_environment(other, name="Other", is_active=True)

        api_client.force_authenticate(user=owner)
        api_client.post("/api/environments/deactivate/")

        owner_env.refresh_from_db()
        other_env.refresh_from_db()
        assert owner_env.is_active is False
        assert other_env.is_active is True


class TestEnvironmentVariables:
    def test_cannot_list_variables_in_other_users_environment(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        environment = create_environment(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.get(f"/api/environments/{environment.id}/variables/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_variable(self, api_client):
        user = create_user()
        environment = create_environment(user)
        api_client.force_authenticate(user=user)

        response = api_client.post(
            f"/api/environments/{environment.id}/variables/",
            {"key": "base_url", "value": "https://api.example.com"},
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["value"] == "https://api.example.com"

    def test_rejects_invalid_key_characters(self, api_client):
        user = create_user()
        environment = create_environment(user)
        api_client.force_authenticate(user=user)

        response = api_client.post(
            f"/api/environments/{environment.id}/variables/", {"key": "base url!", "value": "x"}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_create_duplicate_key_in_same_environment(self, api_client):
        user = create_user()
        environment = create_environment(user)
        EnvironmentVariable.objects.create(environment=environment, key="base_url", value="x")
        api_client.force_authenticate(user=user)

        response = api_client.post(
            f"/api/environments/{environment.id}/variables/", {"key": "base_url", "value": "y"}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_same_key_allowed_in_different_environments(self, api_client):
        user = create_user()
        env_a = create_environment(user, name="A")
        env_b = create_environment(user, name="B")
        EnvironmentVariable.objects.create(environment=env_a, key="base_url", value="x")
        api_client.force_authenticate(user=user)

        response = api_client.post(
            f"/api/environments/{env_b.id}/variables/", {"key": "base_url", "value": "y"}
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_secret_value_is_masked_in_responses(self, api_client):
        user = create_user()
        environment = create_environment(user)
        variable = EnvironmentVariable.objects.create(
            environment=environment, key="token", value="real-secret", is_secret=True
        )
        api_client.force_authenticate(user=user)

        response = api_client.get(f"/api/environments/{environment.id}/variables/{variable.id}/")

        assert response.data["value"] == "••••"

    def test_non_secret_value_is_returned_in_full(self, api_client):
        user = create_user()
        environment = create_environment(user)
        variable = EnvironmentVariable.objects.create(environment=environment, key="base_url", value="x")
        api_client.force_authenticate(user=user)

        response = api_client.get(f"/api/environments/{environment.id}/variables/{variable.id}/")

        assert response.data["value"] == "x"

    def test_updating_secret_value_actually_changes_it(self, api_client):
        user = create_user()
        environment = create_environment(user)
        variable = EnvironmentVariable.objects.create(
            environment=environment, key="token", value="old-secret", is_secret=True
        )
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            f"/api/environments/{environment.id}/variables/{variable.id}/", {"value": "new-secret"}
        )

        assert response.status_code == status.HTTP_200_OK
        variable.refresh_from_db()
        assert variable.value == "new-secret"

    def test_omitting_value_on_patch_leaves_secret_unchanged(self, api_client):
        user = create_user()
        environment = create_environment(user)
        variable = EnvironmentVariable.objects.create(
            environment=environment, key="token", value="unchanged-secret", is_secret=True
        )
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            f"/api/environments/{environment.id}/variables/{variable.id}/", {"enabled": False}
        )

        assert response.status_code == status.HTTP_200_OK
        variable.refresh_from_db()
        assert variable.value == "unchanged-secret"
        assert variable.enabled is False

    def test_cannot_update_other_users_variable(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        environment = create_environment(owner)
        variable = EnvironmentVariable.objects.create(environment=environment, key="base_url", value="x")

        api_client.force_authenticate(user=intruder)
        response = api_client.patch(
            f"/api/environments/{environment.id}/variables/{variable.id}/", {"value": "hijacked"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_variable(self, api_client):
        user = create_user()
        environment = create_environment(user)
        variable = EnvironmentVariable.objects.create(environment=environment, key="base_url", value="x")
        api_client.force_authenticate(user=user)

        response = api_client.delete(f"/api/environments/{environment.id}/variables/{variable.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not EnvironmentVariable.objects.filter(id=variable.id).exists()


class TestGetActiveVariables:
    def test_returns_empty_dict_when_no_active_environment(self):
        user = create_user()
        assert get_active_variables(user) == {}

    def test_returns_enabled_variables_from_active_environment(self):
        user = create_user()
        environment = create_environment(user, is_active=True)
        EnvironmentVariable.objects.create(
            environment=environment, key="base_url", value="https://api.example.com"
        )
        EnvironmentVariable.objects.create(environment=environment, key="off", value="nope", enabled=False)

        variables = get_active_variables(user)

        assert variables == {"base_url": "https://api.example.com"}

    def test_ignores_inactive_environments(self):
        user = create_user()
        environment = create_environment(user, is_active=False)
        EnvironmentVariable.objects.create(environment=environment, key="base_url", value="x")

        assert get_active_variables(user) == {}
