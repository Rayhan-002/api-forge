import uuid

from django.db import models

from apps.history.models import RequestHistory
from apps.saved_requests.models import SavedRequest

TYPE_CHOICES = [
    ("status_code", "Status code equals"),
    ("response_time_lt", "Response time less than"),
    ("header_exists", "Header exists"),
    ("header_equals", "Header equals"),
    ("json_field_exists", "JSON field exists"),
    ("json_field_equals", "JSON field equals"),
    ("body_contains", "Body contains"),
]


class TestAssertion(models.Model):
    # Not a pytest test class — it just happens to start with "Test".
    __test__ = False

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    saved_request = models.ForeignKey(SavedRequest, related_name="assertions", on_delete=models.CASCADE)
    name = models.CharField(max_length=255, blank=True, default="")
    type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    # Shape depends on `type` — see apps.testing.services.REQUIRED_CONFIG_KEYS
    # and evaluate_assertion(). e.g. status_code: {"expected": 200},
    # json_field_equals: {"path": "user.id", "expected": 42}.
    config = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]
        indexes = [models.Index(fields=["saved_request", "order"])]

    @property
    def owner(self):
        return self.saved_request.owner

    def __str__(self):
        return self.name or self.type


class TestResult(models.Model):
    __test__ = False

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    history = models.ForeignKey(RequestHistory, related_name="test_results", on_delete=models.CASCADE)
    # Nullable + a name snapshot: a result stays meaningful even if the
    # assertion that produced it is later edited or deleted.
    assertion = models.ForeignKey(
        TestAssertion, related_name="results", on_delete=models.SET_NULL, null=True, blank=True
    )
    assertion_name = models.CharField(max_length=255)
    passed = models.BooleanField()
    actual_value = models.TextField(blank=True, default="")
    message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.assertion_name}: {'PASS' if self.passed else 'FAIL'}"
