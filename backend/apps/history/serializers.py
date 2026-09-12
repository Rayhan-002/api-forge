from rest_framework import serializers

from .models import RequestHistory


class RequestHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RequestHistory
        fields = [
            "id",
            "saved_request",
            "method",
            "url",
            "status_code",
            "response_time_ms",
            "response_size_bytes",
            "success",
            "error_message",
            "request_snapshot",
            "response_snapshot",
            "executed_at",
        ]
        read_only_fields = fields
