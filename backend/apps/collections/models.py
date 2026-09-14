import uuid

from django.conf import settings
from django.db import models


class Collection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="collections", on_delete=models.CASCADE)
    # A null parent is a top-level collection; a set parent makes this a
    # subfolder of another collection. Subfolders are just Collections, so
    # every existing request/collection endpoint already works on them
    # unchanged. CASCADE means deleting a folder deletes its subfolders too
    # (and, transitively, their saved requests via SavedRequest.collection).
    parent = models.ForeignKey(
        "self", related_name="children", null=True, blank=True, on_delete=models.CASCADE
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["owner"]), models.Index(fields=["parent"])]

    def __str__(self):
        return self.name
