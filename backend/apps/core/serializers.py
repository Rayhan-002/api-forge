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


class ExecuteResponseSerializer(serializers.Serializer):
    """
    Documents the response shape of the execute-family endpoints for
    OpenAPI only — never used for real (de)serialization, since
    apps.core.services.execute_and_log builds this dict directly. A
    success:true response uses status_code..size_bytes; a success:false
    response uses error_type/error_message instead — always HTTP 200
    either way, since a well-formed call to *this* endpoint always
    succeeds even when the *target* request doesn't. extractions and
    test_results are only ever non-empty for the saved-request endpoint.
    """

    success = serializers.BooleanField()
    status_code = serializers.IntegerField(required=False)
    reason_phrase = serializers.CharField(required=False)
    headers = serializers.DictField(child=serializers.CharField(), required=False)
    body = serializers.CharField(required=False, allow_blank=True)
    url = serializers.CharField(required=False)
    elapsed_ms = serializers.IntegerField(required=False)
    size_bytes = serializers.IntegerField(required=False)
    error_type = serializers.CharField(required=False)
    error_message = serializers.CharField(required=False)
    extractions = serializers.ListField(child=serializers.DictField(), required=False)
    test_results = serializers.ListField(child=serializers.DictField(), required=False)


class RecentActivityEntrySerializer(serializers.Serializer):
    """Documentation-only — see DashboardSummaryView."""

    id = serializers.UUIDField()
    method = serializers.CharField()
    url = serializers.CharField()
    status_code = serializers.IntegerField(allow_null=True)
    success = serializers.BooleanField()
    executed_at = serializers.DateTimeField()
    saved_request_id = serializers.UUIDField(allow_null=True)
    saved_request_name = serializers.CharField(allow_null=True)


class DashboardCountsSerializer(serializers.Serializer):
    collections = serializers.IntegerField()
    saved_requests = serializers.IntegerField()
    environments = serializers.IntegerField()
    history_entries = serializers.IntegerField()


class TestSummarySerializer(serializers.Serializer):
    total = serializers.IntegerField()
    passed = serializers.IntegerField()


class DashboardSummarySerializer(serializers.Serializer):
    """Documents GET /api/dashboard/summary/'s response shape for OpenAPI only."""

    counts = DashboardCountsSerializer()
    recent_activity = RecentActivityEntrySerializer(many=True)
    test_summary = TestSummarySerializer()
