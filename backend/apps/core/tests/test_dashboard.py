from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import User
from apps.collections.models import Collection
from apps.environments.models import Environment
from apps.history.models import RequestHistory
from apps.testing.models import TestAssertion, TestResult

pytestmark = pytest.mark.django_db


def create_user(email="user@example.com", password="StrongPass123"):
    return User.objects.create_user(email=email, password=password)


def create_history(owner, saved_request=None, method="GET", url="https://api.example.com", success=True):
    return RequestHistory.objects.create(
        owner=owner,
        saved_request=saved_request,
        method=method,
        url=url,
        status_code=200 if success else None,
        success=success,
        request_snapshot={},
    )


class TestDashboardSummary:
    def test_requires_authentication(self, api_client):
        response = api_client.get("/api/dashboard/summary/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_counts_reflect_only_the_caller_own_resources(self, api_client):
        owner = create_user(email="owner@example.com")
        other = create_user(email="other@example.com")

        collection = Collection.objects.create(owner=owner, name="Mine")
        collection.requests.create(name="Login", method="POST")
        collection.requests.create(name="Get Users", method="GET")
        Environment.objects.create(owner=owner, name="Dev")
        create_history(owner)
        create_history(owner)

        other_collection = Collection.objects.create(owner=other, name="Not mine")
        other_collection.requests.create(name="Ping", method="GET")
        Environment.objects.create(owner=other, name="Prod")
        create_history(other)

        api_client.force_authenticate(user=owner)
        response = api_client.get("/api/dashboard/summary/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["counts"] == {
            "collections": 1,
            "saved_requests": 2,
            "environments": 1,
            "history_entries": 2,
        }

    def test_recent_activity_ordered_most_recent_first_and_capped(self, api_client):
        user = create_user()
        api_client.force_authenticate(user=user)
        # Force strictly increasing timestamps — auto_now_add captures
        # wall-clock time, and ten back-to-back creates aren't guaranteed to
        # land on distinct values at whatever precision the DB stores.
        base = timezone.now()
        for i in range(10):
            entry = create_history(user, url=f"https://api.example.com/{i}")
            RequestHistory.objects.filter(pk=entry.pk).update(executed_at=base + timedelta(seconds=i))

        response = api_client.get("/api/dashboard/summary/")

        activity = response.data["recent_activity"]
        assert len(activity) == 8
        assert activity[0]["url"] == "https://api.example.com/9"
        assert activity[-1]["url"] == "https://api.example.com/2"

    def test_recent_activity_includes_saved_request_name_when_linked(self, api_client):
        user = create_user()
        collection = Collection.objects.create(owner=user, name="Mine")
        saved_request = collection.requests.create(name="Get Users", method="GET")
        api_client.force_authenticate(user=user)

        create_history(user, saved_request=saved_request, url="https://api.example.com/linked")
        create_history(user, saved_request=None, url="https://api.example.com/unlinked")

        response = api_client.get("/api/dashboard/summary/")

        # Matched by URL rather than list position — two entries created back
        # to back in a test can land with the same auto_now_add timestamp,
        # so relative ordering between them isn't guaranteed.
        activity = {entry["url"]: entry for entry in response.data["recent_activity"]}
        assert activity["https://api.example.com/linked"]["saved_request_name"] == "Get Users"
        assert activity["https://api.example.com/linked"]["saved_request_id"] == saved_request.id
        assert activity["https://api.example.com/unlinked"]["saved_request_name"] is None

    def test_recent_activity_excludes_other_users_history(self, api_client):
        owner = create_user(email="owner@example.com")
        other = create_user(email="other@example.com")
        create_history(other)
        api_client.force_authenticate(user=owner)

        response = api_client.get("/api/dashboard/summary/")

        assert response.data["recent_activity"] == []

    def test_test_summary_counts_pass_and_fail(self, api_client):
        user = create_user()
        collection = Collection.objects.create(owner=user, name="Mine")
        saved_request = collection.requests.create(name="Get Users", method="GET")
        assertion = TestAssertion.objects.create(
            saved_request=saved_request, type="status_code", config={"expected": 200}
        )
        history = create_history(user, saved_request=saved_request)
        TestResult.objects.create(
            history=history, assertion=assertion, assertion_name="status_code == 200", passed=True
        )
        TestResult.objects.create(
            history=history, assertion=assertion, assertion_name="status_code == 200", passed=False
        )

        api_client.force_authenticate(user=user)
        response = api_client.get("/api/dashboard/summary/")

        assert response.data["test_summary"] == {"total": 2, "passed": 1}

    def test_empty_state_for_a_brand_new_user(self, api_client):
        user = create_user()
        api_client.force_authenticate(user=user)

        response = api_client.get("/api/dashboard/summary/")

        assert response.data["counts"] == {
            "collections": 0,
            "saved_requests": 0,
            "environments": 0,
            "history_entries": 0,
        }
        assert response.data["recent_activity"] == []
        assert response.data["test_summary"] == {"total": 0, "passed": 0}
