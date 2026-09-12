import uuid

from django.conf import settings
from django.db import models

from apps.saved_requests.models import SavedRequest


class RequestHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="history_entries", on_delete=models.CASCADE
    )
    saved_request = models.ForeignKey(
        SavedRequest, related_name="history_entries", on_delete=models.SET_NULL, null=True, blank=True
    )
    method = models.CharField(max_length=10)
    url = models.TextField()
    status_code = models.PositiveIntegerField(null=True, blank=True)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    response_size_bytes = models.PositiveIntegerField(null=True, blank=True)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, default="")
    # Secret-bearing fields (Authorization-like headers, auth_config
    # token/password/key_value) are masked before this is ever written —
    # see apps.history.services._redact_*. Response body is intentionally
    # not stored here (restore only needs the request side); response
    # headers are kept since they're small and occasionally useful context.
    request_snapshot = models.JSONField(default=dict)
    response_snapshot = models.JSONField(default=None, null=True, blank=True)
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-executed_at"]
        indexes = [models.Index(fields=["owner", "-executed_at"])]
        verbose_name_plural = "request history"

    def __str__(self):
        return f"{self.method} {self.url}"
