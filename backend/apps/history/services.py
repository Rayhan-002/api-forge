"""
Turns a request execution (successful or failed) into a RequestHistory
row, redacting anything secret-bearing before it's ever written to the
database — never store a real bearer token, password, or API key in
history.

Redaction here is deliberately limited to *known, structural* carriers of
secrets (auth headers, auth_config fields) — it does not attempt to guess
at secrets inside a JSON/raw request body (e.g. a login payload's
"password" field), since a heuristic there would be unreliable: it could
both mask legitimate non-secret fields and miss real secrets under an
unexpected name. This is a documented limitation, not an oversight.
"""

from .models import RequestHistory

SENSITIVE_HEADER_NAMES = {"authorization", "proxy-authorization", "x-api-key", "cookie"}
SENSITIVE_AUTH_CONFIG_FIELDS = {"token", "password", "key_value"}
REDACTED = "••••"


def _redact_headers(headers):
    redacted = []
    for row in headers or []:
        key = row.get("key", "")
        value = row.get("value", "")
        if key.strip().lower() in SENSITIVE_HEADER_NAMES and value:
            value = REDACTED
        redacted.append({"key": key, "value": value, "enabled": row.get("enabled", True)})
    return redacted


def _redact_auth_config(auth_config):
    if not auth_config:
        return auth_config
    redacted = dict(auth_config)
    for field in SENSITIVE_AUTH_CONFIG_FIELDS:
        if redacted.get(field):
            redacted[field] = REDACTED
    return redacted


def record_history(
    *, owner, request_data: dict, success: bool, result=None, error_message: str = "", saved_request=None
):
    request_snapshot = {
        "method": request_data["method"],
        "url": request_data["url"],
        "params": request_data["params"],
        "headers": _redact_headers(request_data["headers"]),
        "body_type": request_data["body_type"],
        "body": request_data["body"],
        "auth_type": request_data["auth_type"],
        "auth_config": _redact_auth_config(request_data["auth_config"]),
    }

    status_code = response_time_ms = response_size_bytes = None
    response_snapshot = None
    if result is not None:
        status_code = result.status_code
        response_time_ms = result.elapsed_ms
        response_size_bytes = result.size_bytes
        response_snapshot = {"headers": result.headers}

    return RequestHistory.objects.create(
        owner=owner,
        saved_request=saved_request,
        method=request_data["method"],
        url=request_data["url"],
        status_code=status_code,
        response_time_ms=response_time_ms,
        response_size_bytes=response_size_bytes,
        success=success,
        error_message=error_message,
        request_snapshot=request_snapshot,
        response_snapshot=response_snapshot,
    )
