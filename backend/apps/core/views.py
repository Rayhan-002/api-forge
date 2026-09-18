from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.collections.models import Collection
from apps.environments.models import Environment
from apps.history.models import RequestHistory
from apps.saved_requests.models import SavedRequest
from apps.testing.models import TestResult

from .serializers import ExecuteRequestSerializer
from .services import execute_and_log

RECENT_ACTIVITY_LIMIT = 8


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
    equivalent, which additionally applies extraction rules and runs test
    assertions — both share the resolve/execute/log pipeline in
    apps.core.services.execute_and_log.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "execute"

    def post(self, request):
        serializer = ExecuteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        response_data, _result, _history_entry = execute_and_log(owner=request.user, payload=payload)
        response_data.setdefault("extractions", [])
        response_data.setdefault("test_results", [])
        return Response(response_data)


class DashboardSummaryView(APIView):
    """
    Read-only aggregate for the dashboard: resource counts, the most recent
    activity, and a pass/fail rollup of test assertion results — all scoped
    to the caller. A plain dict response (like ExecuteView's) rather than a
    Serializer, since this has one fixed, read-only shape with no input to
    validate.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        counts = {
            "collections": Collection.objects.filter(owner=user).count(),
            "saved_requests": SavedRequest.objects.filter(collection__owner=user).count(),
            "environments": Environment.objects.filter(owner=user).count(),
            "history_entries": RequestHistory.objects.filter(owner=user).count(),
        }

        recent_entries = (
            RequestHistory.objects.filter(owner=user)
            .select_related("saved_request")
            .order_by("-executed_at")[:RECENT_ACTIVITY_LIMIT]
        )
        recent_activity = [
            {
                "id": entry.id,
                "method": entry.method,
                "url": entry.url,
                "status_code": entry.status_code,
                "success": entry.success,
                "executed_at": entry.executed_at,
                "saved_request_id": entry.saved_request_id,
                "saved_request_name": entry.saved_request.name if entry.saved_request else None,
            }
            for entry in recent_entries
        ]

        test_results = TestResult.objects.filter(history__owner=user)
        test_summary = {
            "total": test_results.count(),
            "passed": test_results.filter(passed=True).count(),
        }

        return Response({"counts": counts, "recent_activity": recent_activity, "test_summary": test_summary})
