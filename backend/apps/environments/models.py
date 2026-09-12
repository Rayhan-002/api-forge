import uuid

from django.conf import settings
from django.db import models


class Environment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="environments", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    # Only one environment per owner may be active at a time — enforced in
    # services.activate_environment(), not at the DB level (a partial
    # unique index would work in Postgres but adds friction for a rule
    # this simple to enforce in application code).
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["owner", "name"], name="unique_environment_name_per_owner"),
        ]

    def __str__(self):
        return self.name


class EnvironmentVariable(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    environment = models.ForeignKey(Environment, related_name="variables", on_delete=models.CASCADE)
    key = models.CharField(max_length=255)
    value = models.TextField(blank=True, default="")
    # Secret values are never returned in plaintext by the API once set —
    # see EnvironmentVariableSerializer. There is deliberately no "reveal"
    # endpoint; update-in-place is how you change a secret, same as a
    # password field.
    is_secret = models.BooleanField(default=False)
    enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["key"]
        constraints = [
            models.UniqueConstraint(
                fields=["environment", "key"], name="unique_variable_key_per_environment"
            ),
        ]

    @property
    def owner(self):
        return self.environment.owner

    def __str__(self):
        return self.key
