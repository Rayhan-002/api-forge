from rest_framework import serializers

from .models import TestAssertion
from .services import REQUIRED_CONFIG_KEYS


class TestAssertionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestAssertion
        fields = ["id", "name", "type", "config", "order", "created_at", "updated_at"]
        read_only_fields = ["id", "order", "created_at", "updated_at"]

    def validate(self, attrs):
        assertion_type = attrs.get("type", getattr(self.instance, "type", None))
        config = attrs.get("config", getattr(self.instance, "config", {}) or {})

        required = REQUIRED_CONFIG_KEYS.get(assertion_type, [])
        missing = [key for key in required if key not in config]
        if missing:
            raise serializers.ValidationError(
                {"config": f"Missing required field(s) for '{assertion_type}': {', '.join(missing)}."}
            )
        return attrs
