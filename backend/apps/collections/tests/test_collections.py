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


class TestSubfolders:
    def test_create_subfolder_with_parent(self, api_client):
        user = create_user()
        parent = create_collection(user, name="Parent")
        api_client.force_authenticate(user=user)

        response = api_client.post(
            "/api/collections/", {"name": "Child", "parent": str(parent.id)}, format="json"
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["parent"] == parent.id

    def test_create_top_level_collection_has_null_parent(self, api_client):
        user = create_user()
        api_client.force_authenticate(user=user)

        response = api_client.post("/api/collections/", {"name": "Root"})

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["parent"] is None

    def test_cannot_create_subfolder_under_another_users_collection(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        parent = create_collection(owner, name="Owner's")
        api_client.force_authenticate(user=intruder)

        response = api_client.post("/api/collections/", {"name": "Sneaky child", "parent": str(parent.id)})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reparent_collection(self, api_client):
        user = create_user()
        a = create_collection(user, name="A")
        b = create_collection(user, name="B")
        api_client.force_authenticate(user=user)

        response = api_client.patch(f"/api/collections/{a.id}/", {"parent": str(b.id)})

        assert response.status_code == status.HTTP_200_OK
        a.refresh_from_db()
        assert a.parent_id == b.id

    def test_reparent_to_root_by_clearing_parent(self, api_client):
        user = create_user()
        parent = create_collection(user, name="Parent")
        child = create_collection(user, name="Child", parent=parent)
        api_client.force_authenticate(user=user)

        response = api_client.patch(f"/api/collections/{child.id}/", {"parent": None}, format="json")

        assert response.status_code == status.HTTP_200_OK
        child.refresh_from_db()
        assert child.parent_id is None

    def test_cannot_set_collection_as_its_own_parent(self, api_client):
        user = create_user()
        a = create_collection(user, name="A")
        api_client.force_authenticate(user=user)

        response = api_client.patch(f"/api/collections/{a.id}/", {"parent": str(a.id)})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_move_collection_into_its_own_descendant(self, api_client):
        user = create_user()
        grandparent = create_collection(user, name="Grandparent")
        parent = create_collection(user, name="Parent", parent=grandparent)
        child = create_collection(user, name="Child", parent=parent)
        api_client.force_authenticate(user=user)

        response = api_client.patch(f"/api/collections/{grandparent.id}/", {"parent": str(child.id)})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        grandparent.refresh_from_db()
        assert grandparent.parent_id is None

    def test_cannot_reparent_under_another_users_collection(self, api_client):
        owner = create_user(email="owner@example.com")
        intruder = create_user(email="intruder@example.com")
        mine = create_collection(intruder, name="Mine")
        theirs = create_collection(owner, name="Theirs")
        api_client.force_authenticate(user=intruder)

        response = api_client.patch(f"/api/collections/{mine.id}/", {"parent": str(theirs.id)})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_deleting_folder_cascades_to_subfolders_and_their_requests(self, api_client):
        user = create_user()
        parent = create_collection(user, name="Parent")
        child = create_collection(user, name="Child", parent=parent)
        saved_request = child.requests.create(name="Login", method="POST")
        api_client.force_authenticate(user=user)

        response = api_client.delete(f"/api/collections/{parent.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Collection.objects.filter(id=child.id).exists()
        assert not type(saved_request).objects.filter(id=saved_request.id).exists()

    def test_saved_request_can_be_moved_into_a_subfolder(self, api_client):
        user = create_user()
        parent = create_collection(user, name="Parent")
        subfolder = create_collection(user, name="Subfolder", parent=parent)
        other = create_collection(user, name="Other")
        saved_request = other.requests.create(name="Login", method="POST")
        api_client.force_authenticate(user=user)

        response = api_client.post(
            f"/api/requests/{saved_request.id}/move/", {"collection": str(subfolder.id)}
        )

        assert response.status_code == status.HTTP_200_OK
        saved_request.refresh_from_db()
        assert saved_request.collection_id == subfolder.id
