"""
The HTTP execution service: turns a user-supplied request definition into
an actual outbound HTTP call and a normalized result, with SSRF
protection, timeouts, a response-size cap, and controlled redirect
handling. Kept out of the view layer per the project's service-layer
convention — apps/core/views.py only translates this into an HTTP
response.
"""

import base64
import time
from dataclasses import dataclass
from urllib.parse import urlencode, urljoin

import httpx

from .errors import RequestExecutionError
from .ssrf import assert_url_is_safe

CONNECT_TIMEOUT = 5.0
TOTAL_TIMEOUT = 15.0
MAX_REDIRECTS = 3
MAX_RESPONSE_BYTES = 5 * 1024 * 1024  # 5MB


@dataclass
class ExecutionResult:
    status_code: int
    reason_phrase: str
    headers: dict
    body: str
    url: str
    elapsed_ms: int
    size_bytes: int


def _enabled_pairs(rows: list[dict]) -> list[tuple[str, str]]:
    return [(row["key"], row.get("value", "")) for row in rows if row.get("enabled", True) and row.get("key")]


def _apply_auth(auth_type: str, auth_config: dict | None, headers: dict, query: dict) -> None:
    auth_config = auth_config or {}

    if auth_type in (None, "none"):
        return
    if auth_type == "bearer":
        headers["Authorization"] = f"Bearer {auth_config.get('token', '')}"
    elif auth_type == "basic":
        credentials = f"{auth_config.get('username', '')}:{auth_config.get('password', '')}"
        encoded = base64.b64encode(credentials.encode()).decode()
        headers["Authorization"] = f"Basic {encoded}"
    elif auth_type == "api_key":
        key_name = auth_config.get("key_name", "")
        if not key_name:
            return
        if auth_config.get("add_to") == "query":
            query[key_name] = auth_config.get("key_value", "")
        else:
            headers[key_name] = auth_config.get("key_value", "")
    else:
        raise RequestExecutionError("invalid_auth_type", f"Unsupported auth type '{auth_type}'.")


def _build_request_kwargs(body_type: str, body) -> tuple[dict, dict]:
    """Returns (kwargs for httpx.Client.request, extra headers to merge in)."""
    if body_type == "none" or body in (None, ""):
        return {}, {}

    if body_type == "raw":
        return {"content": body.encode("utf-8")}, {}

    if body_type == "json":
        # Forwarded verbatim, not re-serialized — a user may be
        # intentionally testing malformed JSON against an endpoint.
        return {"content": body.encode("utf-8")}, {"Content-Type": "application/json"}

    if body_type == "form-urlencoded":
        pairs = _enabled_pairs(body or [])
        return {"content": urlencode(pairs).encode("utf-8")}, {
            "Content-Type": "application/x-www-form-urlencoded"
        }

    if body_type == "multipart":
        # Text fields only in this phase — real file attachments are a
        # documented future improvement (see progress.md). The
        # filename=None form forces genuine multipart/form-data encoding
        # for plain fields, rather than silently falling back to
        # urlencoded like a bare `data=` dict would.
        pairs = _enabled_pairs(body or [])
        files = {key: (None, value) for key, value in pairs}
        return {"files": files}, {}

    raise RequestExecutionError("invalid_body_type", f"Unsupported body type '{body_type}'.")


def execute_http_request(
    *,
    method: str,
    url: str,
    params: list[dict],
    headers: list[dict],
    body_type: str,
    body,
    auth_type: str = "none",
    auth_config: dict | None = None,
    transport: httpx.BaseTransport | None = None,
) -> ExecutionResult:
    assert_url_is_safe(url)

    query = dict(_enabled_pairs(params))
    header_dict = dict(_enabled_pairs(headers))
    _apply_auth(auth_type, auth_config, header_dict, query)

    body_kwargs, extra_headers = _build_request_kwargs(body_type, body)
    header_dict.update(extra_headers)

    timeout = httpx.Timeout(
        connect=CONNECT_TIMEOUT, read=TOTAL_TIMEOUT, write=TOTAL_TIMEOUT, pool=CONNECT_TIMEOUT
    )

    started = time.monotonic()
    current_url = url
    redirects_followed = 0

    with httpx.Client(transport=transport, timeout=timeout, follow_redirects=False) as client:
        while True:
            try:
                response = client.request(
                    method,
                    current_url,
                    params=query if redirects_followed == 0 else None,
                    headers=header_dict,
                    **body_kwargs,
                )
            except httpx.ConnectTimeout as exc:
                raise RequestExecutionError("timeout", "Connection timed out.") from exc
            except httpx.ReadTimeout as exc:
                raise RequestExecutionError("timeout", "Timed out waiting for a response.") from exc
            except httpx.ConnectError as exc:
                raise RequestExecutionError("connection_error", "Could not connect to the host.") from exc
            except httpx.InvalidURL as exc:
                raise RequestExecutionError("invalid_url", "The URL is invalid.") from exc
            except httpx.RequestError as exc:
                raise RequestExecutionError("request_error", str(exc)) from exc

            body_bytes = bytearray()
            for chunk in response.iter_bytes():
                body_bytes.extend(chunk)
                if len(body_bytes) > MAX_RESPONSE_BYTES:
                    response.close()
                    raise RequestExecutionError("response_too_large", "Response exceeded the 5MB limit.")

            if response.is_redirect:
                if redirects_followed >= MAX_REDIRECTS:
                    raise RequestExecutionError(
                        "too_many_redirects", f"Stopped after {MAX_REDIRECTS} redirects."
                    )
                location = response.headers.get("location")
                if not location:
                    break
                current_url = urljoin(str(response.url), location)
                assert_url_is_safe(current_url)
                redirects_followed += 1
                continue

            break

    elapsed_ms = int((time.monotonic() - started) * 1000)

    return ExecutionResult(
        status_code=response.status_code,
        reason_phrase=response.reason_phrase,
        headers=dict(response.headers),
        body=body_bytes.decode(response.encoding or "utf-8", errors="replace"),
        url=str(response.url),
        elapsed_ms=elapsed_ms,
        size_bytes=len(body_bytes),
    )
