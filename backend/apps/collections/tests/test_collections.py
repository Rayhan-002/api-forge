import pytest
from rest_framework import status

from apps.accounts.models import User
from apps.collections.models import Collection

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


def create_collection(owner, name="Company API", **kwargs):
    return Collection.objects.create(owner=owner, name=name, **kwargs)


class TestCollectionList:
    def test_requires_authentication(self, api_client):
        response = api_client.get("/api/collections/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_lists_only_own_collections(self, api_client):
        owner = create_user(email="owner@example.com")
        other = create_user(email="other@example.com")
        create_collection(owner, name="Mine")
        create_collection(other, name="Not mine")

        api_client.force_authenticate(user=owner)
        response = api_client.get("/api/collections/")

        assert response.status_code == status.HTTP_200_OK
        names = [c["name"] for c in response.data["results"]]
        assert names == ["Mine"]

    def test_create_collection(self, api_client):
        user = create_user()
        api_client.force_authenticate(user=user)

        response = api_client.post("/api/collections/", {"name": "Company API", "description": "Prod"})

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Company API"
        assert response.data["request_count"] == 0
        collection = Collection.objects.get(id=response.data["id"])
        assert collection.owner == user

    def test_request_count_reflects_saved_requests(self, api_client):
        user = create_user()
        collection = create_collection(user)
        collection.requests.create(name="Login", method="POST")
        collection.requests.create(name="Get Users", method="GET")

        api_client.force_authenticate(user=user)
        response = api_client.get("/api/collections/")

        assert response.data["results"][0]["request_count"] == 2


class TestCollectionDetail:
    def test_retrieve_own_collection(self, api_client):
        user = create_user()
        collection = create_collection(user)
        api_client.force_authenticate(user=user)

        response = api_client.get(f"/api/collections/{collection.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Company API"

    def test_cannot_retrieve_other_users_collection(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        collection = create_collection(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.get(f"/api/collections/{collection.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_rename_collection(self, api_client):
        user = create_user()
        collection = create_collection(user, name="Old Name")
        api_client.force_authenticate(user=user)

        response = api_client.patch(f"/api/collections/{collection.id}/", {"name": "New Name"})

        assert response.status_code == status.HTTP_200_OK
        collection.refresh_from_db()
        assert collection.name == "New Name"

    def test_cannot_rename_other_users_collection(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        collection = create_collection(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.patch(f"/api/collections/{collection.id}/", {"name": "Hijacked"})

        assert response.status_code == status.HTTP_404_NOT_FOUND
        collection.refresh_from_db()
        assert collection.name == "Company API"

    def test_delete_collection_cascades_to_requests(self, api_client):
        user = create_user()
        collection = create_collection(user)
        saved_request = collection.requests.create(name="Login", method="POST")
        api_client.force_authenticate(user=user)

        response = api_client.delete(f"/api/collections/{collection.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Collection.objects.filter(id=collection.id).exists()
        assert not type(saved_request).objects.filter(id=saved_request.id).exists()

    def test_cannot_delete_other_users_collection(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        collection = create_collection(owner)

        api_client.force_authenticate(user=intruder)
        response = api_client.delete(f"/api/collections/{collection.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Collection.objects.filter(id=collection.id).exists()
