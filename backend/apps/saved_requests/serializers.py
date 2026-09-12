from rest_framework import serializers

from apps.core.serializers import KeyValueSerializer

from .models import SavedRequest


class SavedRequestListSerializer(serializers.ModelSerializer):
    """Lightweight shape for sidebar/collection listings — no body/headers payload."""

    class Meta:
        model = SavedRequest
        fields = ["id", "collection", "name", "method", "order", "updated_at"]
        read_only_fields = fields


class SavedRequestSerializer(serializers.ModelSerializer):
    params = KeyValueSerializer(many=True, required=False, default=list)
    headers = KeyValueSerializer(many=True, required=False, default=list)

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


class MoveRequestSerializer(serializers.Serializer):
    collection = serializers.UUIDField()
