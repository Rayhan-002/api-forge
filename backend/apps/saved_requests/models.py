import uuid

from django.db import models

from apps.collections.models import Collection

METHOD_CHOICES = [(m, m) for m in ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]]
BODY_TYPE_CHOICES = [(t, t) for t in ["none", "raw", "json", "form-urlencoded", "multipart"]]
AUTH_TYPE_CHOICES = [(t, t) for t in ["none", "bearer", "basic", "api_key"]]


class SavedRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    collection = models.ForeignKey(Collection, related_name="requests", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    method = models.CharField(max_length=10, choices=METHOD_CHOICES, default="GET")
    url = models.TextField(blank=True, default="")
    params = models.JSONField(default=list, blank=True)
    headers = models.JSONField(default=list, blank=True)
    body_type = models.CharField(max_length=20, choices=BODY_TYPE_CHOICES, default="none")
    body = models.JSONField(default=None, null=True, blank=True)
    auth_type = models.CharField(max_length=20, choices=AUTH_TYPE_CHOICES, default="none")
    auth_config = models.JSONField(default=None, null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    # Auto-extraction rules applied after a successful execute — wired up in
    # Phase 7 (request chaining); the field exists now so the schema is
    # stable and saved requests don't need a later migration to gain it.
    extract_rules = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]
        indexes = [models.Index(fields=["collection", "order"])]

    @property
    def owner(self):
        return self.collection.owner

    def __str__(self):
        return self.name
