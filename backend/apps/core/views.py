from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.environments.services import get_active_variables
from apps.history.services import record_history

from .errors import RequestExecutionError
from .http_client import execute_http_request
from .serializers import ExecuteRequestSerializer
from .variables import resolve_payload


class ExecuteView(APIView):
    """
    Executes an ad-hoc (unsaved) HTTP request on the caller's behalf.

    Always returns 200 for a well-formed call to *this* endpoint — a
    malformed payload is a normal DRF 400, but once the payload is valid,
    whether the *target* request succeeded or failed (timeout, DNS error,
    blocked URL, undefined variable, ...) is reported in the response body
    via `success`, not via this endpoint's own status code.

    `{{variable}}` placeholders are resolved against the caller's active
    environment (if any) immediately before execution. History always logs
    the *unresolved* template, never the resolved values — if a variable
    holds a secret, the resolved request could contain it in plaintext
    (e.g. a custom header redaction wouldn't know to cover), whereas the
    literal `{{token}}` text is always safe to store. See apps.core.variables
    and apps.history.services for the two halves of this.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "execute"

    def post(self, request):
        serializer = ExecuteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        try:
            variables = get_active_variables(request.user)
            resolved = resolve_payload(payload, variables)
            result = execute_http_request(
                method=resolved["method"],
                url=resolved["url"],
                params=resolved["params"],
                headers=resolved["headers"],
                body_type=resolved["body_type"],
                body=resolved["body"],
                auth_type=resolved["auth_type"],
                auth_config=resolved["auth_config"],
            )
        except RequestExecutionError as exc:
            record_history(owner=request.user, request_data=payload, success=False, error_message=exc.message)
            return Response({"success": False, "error_type": exc.error_type, "error_message": exc.message})

        record_history(owner=request.user, request_data=payload, success=True, result=result)

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
