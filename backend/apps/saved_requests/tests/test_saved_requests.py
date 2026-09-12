import pytest
from rest_framework import status

from apps.accounts.models import User
from apps.collections.models import Collection
from apps.saved_requests.models import SavedRequest

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


def create_collection(owner, name="Company API"):
    return Collection.objects.create(owner=owner, name=name)


def create_saved_request(collection, name="Login", **kwargs):
    return SavedRequest.objects.create(collection=collection, name=name, **kwargs)


class TestCollectionRequestsList:
    def test_requires_authentication(self, api_client):
        collection = create_collection(create_user())
        response = api_client.get(f"/api/collections/{collection.id}/requests/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cannot_list_requests_in_other_users_collection(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        collection = create_collection(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.get(f"/api/collections/{collection.id}/requests/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_request_in_collection(self, api_client):
        user = create_user()
        collection = create_collection(user)
        api_client.force_authenticate(user=user)

        response = api_client.post(
            f"/api/collections/{collection.id}/requests/",
            {"name": "Login", "method": "POST", "url": "https://api.example.com/login"},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["collection"] == collection.id
        assert SavedRequest.objects.filter(collection=collection, name="Login").exists()

    def test_new_requests_get_incrementing_order(self, api_client):
        user = create_user()
        collection = create_collection(user)
        api_client.force_authenticate(user=user)

        first = api_client.post(
            f"/api/collections/{collection.id}/requests/", {"name": "First"}, format="json"
        )
        second = api_client.post(
            f"/api/collections/{collection.id}/requests/", {"name": "Second"}, format="json"
        )

        assert first.data["order"] == 0
        assert second.data["order"] == 1

    def test_cannot_create_request_in_other_users_collection(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        collection = create_collection(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.post(
            f"/api/collections/{collection.id}/requests/", {"name": "Hack"}, format="json"
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert not SavedRequest.objects.filter(collection=collection).exists()


class TestSavedRequestDetail:
    def test_retrieve_own_request(self, api_client):
        user = create_user()
        collection = create_collection(user)
        saved_request = create_saved_request(collection, url="https://api.example.com/login")
        api_client.force_authenticate(user=user)

        response = api_client.get(f"/api/requests/{saved_request.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["url"] == "https://api.example.com/login"

    def test_cannot_retrieve_other_users_request(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        saved_request = create_saved_request(create_collection(owner))

        api_client.force_authenticate(user=intruder)
        response = api_client.get(f"/api/requests/{saved_request.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_request_fields(self, api_client):
        user = create_user()
        saved_request = create_saved_request(create_collection(user), name="Old", method="GET")
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            f"/api/requests/{saved_request.id}/", {"name": "New", "method": "POST"}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        saved_request.refresh_from_db()
        assert saved_request.name == "New"
        assert saved_request.method == "POST"

    def test_cannot_reparent_via_update_payload(self, api_client):
        user = create_user()
        original_collection = create_collection(user, name="Original")
        other_collection = create_collection(user, name="Other")
        saved_request = create_saved_request(original_collection)
        api_client.force_authenticate(user=user)

        response = api_client.patch(
            f"/api/requests/{saved_request.id}/", {"collection": str(other_collection.id)}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        saved_request.refresh_from_db()
        assert saved_request.collection_id == original_collection.id

    def test_cannot_update_other_users_request(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        saved_request = create_saved_request(create_collection(owner), name="Original")

        api_client.force_authenticate(user=intruder)
        response = api_client.patch(f"/api/requests/{saved_request.id}/", {"name": "Hijacked"}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        saved_request.refresh_from_db()
        assert saved_request.name == "Original"

    def test_delete_request(self, api_client):
        user = create_user()
        saved_request = create_saved_request(create_collection(user))
        api_client.force_authenticate(user=user)

        response = api_client.delete(f"/api/requests/{saved_request.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not SavedRequest.objects.filter(id=saved_request.id).exists()

    def test_cannot_delete_other_users_request(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        saved_request = create_saved_request(create_collection(owner))

        api_client.force_authenticate(user=intruder)
        response = api_client.delete(f"/api/requests/{saved_request.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert SavedRequest.objects.filter(id=saved_request.id).exists()


class TestSavedRequestMove:
    def test_move_to_own_collection(self, api_client):
        user = create_user()
        source = create_collection(user, name="Source")
        target = create_collection(user, name="Target")
        target.requests.create(name="Existing")
        saved_request = create_saved_request(source, name="Login")
        api_client.force_authenticate(user=user)

        response = api_client.post(f"/api/requests/{saved_request.id}/move/", {"collection": str(target.id)})

        assert response.status_code == status.HTTP_200_OK
        saved_request.refresh_from_db()
        assert saved_request.collection_id == target.id
        assert saved_request.order == 1  # appended after the existing request

    def test_cannot_move_into_another_users_collection(self, api_client):
        user = create_user(email="user@example.com")
        stranger = create_user(email="stranger@example.com")
        source = create_collection(user, name="Source")
        strangers_collection = create_collection(stranger, name="Not yours")
        saved_request = create_saved_request(source)
        api_client.force_authenticate(user=user)

        response = api_client.post(
            f"/api/requests/{saved_request.id}/move/", {"collection": str(strangers_collection.id)}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        saved_request.refresh_from_db()
        assert saved_request.collection_id == source.id

    def test_cannot_move_another_users_request(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        source = create_collection(owner, name="Source")
        intruder_collection = create_collection(intruder, name="Intruder's")
        saved_request = create_saved_request(source)

        api_client.force_authenticate(user=intruder)
        response = api_client.post(
            f"/api/requests/{saved_request.id}/move/", {"collection": str(intruder_collection.id)}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        saved_request.refresh_from_db()
        assert saved_request.collection_id == source.id
