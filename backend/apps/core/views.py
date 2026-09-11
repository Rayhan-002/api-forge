from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .errors import RequestExecutionError
from .http_client import execute_http_request
from .serializers import ExecuteRequestSerializer


class ExecuteView(APIView):
    """
    Executes an ad-hoc (unsaved) HTTP request on the caller's behalf.

    Always returns 200 for a well-formed call to *this* endpoint — a
    malformed payload is a normal DRF 400, but once the payload is valid,
    whether the *target* request succeeded or failed (timeout, DNS error,
    blocked URL, ...) is reported in the response body via `success`, not
    via this endpoint's own status code.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "execute"

    def post(self, request):
        serializer = ExecuteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        try:
            result = execute_http_request(
                method=payload["method"],
                url=payload["url"],
                params=payload["params"],
                headers=payload["headers"],
                body_type=payload["body_type"],
                body=payload["body"],
                auth_type=payload["auth_type"],
                auth_config=payload["auth_config"],
            )
        except RequestExecutionError as exc:
            return Response({"success": False, "error_type": exc.error_type, "error_message": exc.message})

        return Response(
            {
                "success": True,
                "status_code": result.status_code,
                "reason_phrase": result.reason_phrase,
                "headers": result.headers,
                "body": result.body,
                "url": result.url,
                "elapsed_ms": result.elapsed_ms,
                "size_bytes": result.size_bytes,
            }
        )
