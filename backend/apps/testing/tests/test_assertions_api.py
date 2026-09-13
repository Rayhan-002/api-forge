import pytest
from rest_framework import status

from apps.accounts.models import User
from apps.collections.models import Collection
from apps.saved_requests.models import SavedRequest
from apps.testing.models import TestAssertion

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


def create_saved_request(user, **kwargs):
    collection = Collection.objects.create(owner=user, name="Company API")
    defaults = {"name": "Get Users", "method": "GET", "url": "https://api.example.com/users"}
    defaults.update(kwargs)
    return SavedRequest.objects.create(collection=collection, **defaults)


class TestAssertionList:
    def test_requires_authentication(self, api_client):
        saved_request = create_saved_request(create_user())
        response = api_client.get(f"/api/requests/{saved_request.id}/tests/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cannot_list_assertions_on_other_users_request(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        saved_request = create_saved_request(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.get(f"/api/requests/{saved_request.id}/tests/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_assertion(self, api_client):
        user = create_user()
        saved_request = create_saved_request(user)
        api_client.force_authenticate(user=user)

        response = api_client.post(
            f"/api/requests/{saved_request.id}/tests/",
            {"type": "status_code", "config": {"expected": 200}},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert TestAssertion.objects.filter(saved_request=saved_request, type="status_code").exists()

    def test_new_assertions_get_incrementing_order(self, api_client):
        user = create_user()
        saved_request = create_saved_request(user)
        api_client.force_authenticate(user=user)

        first = api_client.post(
            f"/api/requests/{saved_request.id}/tests/",
            {"type": "status_code", "config": {"expected": 200}},
            format="json",
        )
        second = api_client.post(
            f"/api/requests/{saved_request.id}/tests/",
            {"type": "body_contains", "config": {"expected": "ok"}},
            format="json",
        )

        assert first.data["order"] == 0
        assert second.data["order"] == 1

    def test_rejects_missing_required_config_key(self, api_client):
        user = create_user()
        saved_request = create_saved_request(user)
        api_client.force_authenticate(user=user)

        response = api_client.post(
            f"/api/requests/{saved_request.id}/tests/", {"type": "status_code", "config": {}}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_header_equals_missing_expected(self, api_client):
        user = create_user()
        saved_request = create_saved_request(user)
        api_client.force_authenticate(user=user)

        response = api_client.post(
            f"/api/requests/{saved_request.id}/tests/",
            {"type": "header_equals", "config": {"header_name": "Content-Type"}},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_create_assertion_on_other_users_request(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        saved_request = create_saved_request(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.post(
            f"/api/requests/{saved_request.id}/tests/",
            {"type": "status_code", "config": {"expected": 200}},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert not TestAssertion.objects.filter(saved_request=saved_request).exists()


class TestAssertionDetail:
    def test_update_assertion(self, api_client):
        user = create_user()
        saved_request = create_saved_request(user)
        assertion = TestAssertion.objects.create(
            saved_request=saved_request, type="status_code", config={"expected": 200}
        )
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            f"/api/tests/{assertion.id}/", {"config": {"expected": 201}}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assertion.refresh_from_db()
        assert assertion.config == {"expected": 201}

    def test_cannot_update_other_users_assertion(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        saved_request = create_saved_request(owner)
        assertion = TestAssertion.objects.create(
            saved_request=saved_request, type="status_code", config={"expected": 200}
        )

        api_client.force_authenticate(user=intruder)
        response = api_client.patch(
            f"/api/tests/{assertion.id}/", {"config": {"expected": 201}}, format="json"
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_assertion(self, api_client):
        user = create_user()
        saved_request = create_saved_request(user)
        assertion = TestAssertion.objects.create(
            saved_request=saved_request, type="status_code", config={"expected": 200}
        )
        api_client.force_authenticate(user=user)

        response = api_client.delete(f"/api/tests/{assertion.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not TestAssertion.objects.filter(id=assertion.id).exists()

    def test_cannot_delete_other_users_assertion(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        saved_request = create_saved_request(owner)
        assertion = TestAssertion.objects.create(
            saved_request=saved_request, type="status_code", config={"expected": 200}
        )

        api_client.force_authenticate(user=intruder)
        response = api_client.delete(f"/api/tests/{assertion.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert TestAssertion.objects.filter(id=assertion.id).exists()
