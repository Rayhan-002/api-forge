from rest_framework import serializers

from apps.core.serializers import KeyValueSerializer
from apps.environments.models import Environment
from apps.environments.serializers import KEY_ERROR_MESSAGE, KEY_PATTERN

from .models import SavedRequest


class SavedRequestListSerializer(serializers.ModelSerializer):
    """Lightweight shape for sidebar/collection listings — no body/headers payload."""

    class Meta:
        model = SavedRequest
        fields = ["id", "collection", "name", "method", "order", "updated_at"]
        read_only_fields = fields


class ExtractRuleSerializer(serializers.Serializer):
    # Reuses the environment-variable key pattern since a rule's output
    # *becomes* an EnvironmentVariable key.
    variable_name = serializers.RegexField(
        KEY_PATTERN, max_length=255, error_messages={"invalid": KEY_ERROR_MESSAGE}
    )
    source_path = serializers.CharField(max_length=500)
    target_environment = serializers.UUIDField()


class SavedRequestSerializer(serializers.ModelSerializer):
    params = KeyValueSerializer(many=True, required=False, default=list)
    headers = KeyValueSerializer(many=True, required=False, default=list)
    extract_rules = ExtractRuleSerializer(many=True, required=False, default=list)

    class Meta:
        model = SavedRequest
        fields = [
            "id",
            "collection",
            "name",
            "method",
            "url",
            "params",
            "headers",
            "body_type",
            "body",
            "auth_type",
            "auth_config",
            "order",
            "extract_rules",
            "created_at",
            "updated_at",
        ]
        # `collection` and `order` are only ever set by the server (from the
        # URL, or by the dedicated move endpoint) — never accepted from the
        # client body, so a request can't be re-parented by a crafted payload.
        read_only_fields = ["id", "collection", "order", "created_at", "updated_at"]

    def validate(self, attrs):
        body_type = attrs.get("body_type", getattr(self.instance, "body_type", "none"))
        body = attrs.get("body", serializers.empty)

        if body is not serializers.empty and body is not None:
            if body_type in ("raw", "json") and not isinstance(body, str):
                raise serializers.ValidationError({"body": "Must be a string for this body type."})
            if body_type in ("form-urlencoded", "multipart") and not isinstance(body, list):
                raise serializers.ValidationError(
                    {"body": "Must be a list of key/value pairs for this body type."}
                )

        return attrs

    def validate_extract_rules(self, rules):
        # UUIDField validates to a real uuid.UUID, which the extract_rules
        # JSONField can't serialize — normalize to str for storage.
        rules = [{**rule, "target_environment": str(rule["target_environment"])} for rule in rules]

        request = self.context.get("request")
        if request and rules:
            environment_ids = {rule["target_environment"] for rule in rules}
            owned_ids = set(
                str(pk)
                for pk in Environment.objects.filter(owner=request.user, id__in=environment_ids).values_list(
                    "id", flat=True
                )
            )
            missing = environment_ids - owned_ids
            if missing:
                raise serializers.ValidationError(
                    f"Target environment(s) not found: {', '.join(sorted(missing))}."
                )
        return rules


class MoveRequestSerializer(serializers.Serializer):
    collection = serializers.UUIDField()
