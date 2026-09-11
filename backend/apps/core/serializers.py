from rest_framework import serializers

METHOD_CHOICES = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
BODY_TYPE_CHOICES = ["none", "raw", "json", "form-urlencoded", "multipart"]
AUTH_TYPE_CHOICES = ["none", "bearer", "basic", "api_key"]


class KeyValueSerializer(serializers.Serializer):
    key = serializers.CharField(allow_blank=True)
    value = serializers.CharField(allow_blank=True, required=False, default="")
    enabled = serializers.BooleanField(default=True)


class ExecuteRequestSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=METHOD_CHOICES)
    url = serializers.CharField(max_length=4096)
    params = KeyValueSerializer(many=True, required=False, default=list)
    headers = KeyValueSerializer(many=True, required=False, default=list)
    body_type = serializers.ChoiceField(choices=BODY_TYPE_CHOICES, default="none")
    body = serializers.JSONField(required=False, allow_null=True, default=None)
    auth_type = serializers.ChoiceField(choices=AUTH_TYPE_CHOICES, default="none")
    auth_config = serializers.JSONField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        body_type = attrs.get("body_type")
        body = attrs.get("body")

        if body is not None:
            if body_type in ("raw", "json") and not isinstance(body, str):
                raise serializers.ValidationError({"body": "Must be a string for this body type."})
            if body_type in ("form-urlencoded", "multipart") and not isinstance(body, list):
                raise serializers.ValidationError(
                    {"body": "Must be a list of key/value pairs for this body type."}
                )

        return attrs
