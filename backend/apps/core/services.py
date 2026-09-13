"""
Shared "resolve variables, execute, log history" pipeline used by both the
ad-hoc execute endpoint and the saved-request execute endpoint, so the two
don't drift out of sync on error handling or response shape.
"""

from apps.environments.services import get_active_variables
from apps.history.models import RequestHistory
from apps.history.services import record_history

from .errors import RequestExecutionError
from .http_client import ExecutionResult, execute_http_request
from .variables import resolve_payload


def execute_and_log(
    *, owner, payload: dict, saved_request=None
) -> tuple[dict, ExecutionResult | None, RequestHistory]:
    """
    Returns (response_data, result, history_entry). `result` is None when
    the target request failed (response_data["success"] is False in that
    case) — callers that need the raw body (e.g. to apply extraction rules
    or run assertions) should check for that. `history_entry` is always
    returned so callers can attach TestResults to it regardless of outcome.
    """
    try:
        variables = get_active_variables(owner)
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
        history_entry = record_history(
            owner=owner,
            request_data=payload,
            success=False,
            error_message=exc.message,
            saved_request=saved_request,
        )
        response_data = {"success": False, "error_type": exc.error_type, "error_message": exc.message}
        return response_data, None, history_entry

    history_entry = record_history(
        owner=owner, request_data=payload, success=True, result=result, saved_request=saved_request
    )

    response_data = {
        "success": True,
        "status_code": result.status_code,
        "reason_phrase": result.reason_phrase,
        "headers": result.headers,
        "body": result.body,
        "url": result.url,
        "elapsed_ms": result.elapsed_ms,
        "size_bytes": result.size_bytes,
    }
    return response_data, result, history_entry
