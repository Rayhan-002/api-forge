from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import ExecuteRequestSerializer
from .services import execute_and_log


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

    See apps.saved_requests.views.SavedRequestExecuteView for the saved
    equivalent, which additionally applies extraction rules — both share
    the resolve/execute/log pipeline in apps.core.services.execute_and_log.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "execute"

    def post(self, request):
        serializer = ExecuteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        response_data, _result = execute_and_log(owner=request.user, payload=payload)
        response_data.setdefault("extractions", [])
        return Response(response_data)
