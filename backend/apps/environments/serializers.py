from rest_framework import serializers

from .models import Environment, EnvironmentVariable

MASKED_VALUE = "••••"
KEY_PATTERN = r"^[A-Za-z0-9_.-]+$"
KEY_ERROR_MESSAGE = (
    "Keys may only contain letters, numbers, underscores, hyphens, and dots "
    "(so they can be referenced as {{key}})."
)


class EnvironmentSerializer(serializers.ModelSerializer):
    # Populated via .annotate(variable_count=Count("variables")) in the view.
    variable_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Environment
        fields = ["id", "name", "is_active", "variable_count", "created_at", "updated_at"]
        read_only_fields = ["id", "is_active", "variable_count", "created_at", "updated_at"]


class EnvironmentVariableSerializer(serializers.ModelSerializer):
    key = serializers.RegexField(KEY_PATTERN, max_length=255, error_messages={"invalid": KEY_ERROR_MESSAGE})

    class Meta:
        model = EnvironmentVariable
        fields = ["id", "key", "value", "is_secret", "enabled"]
        read_only_fields = ["id"]

    def to_representation(self, instance):
        # Secret values are never sent back in plaintext once set — the
        # client omits `value` entirely in a PATCH to leave it unchanged,
        # same UX as a password field.
        data = super().to_representation(instance)
        if instance.is_secret and instance.value:
            data["value"] = MASKED_VALUE
        return data
