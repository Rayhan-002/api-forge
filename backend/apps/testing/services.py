"""
Assertion evaluation, kept deliberately constrained: each assertion is a
{type, config} pair evaluated by a fixed set of plain Python comparisons
below — never eval() or any dynamically-executed expression. A user can
combine the seven supported types into anything from "status code is 200"
to "response.user.id exists", but cannot smuggle in arbitrary code.
"""

import json

from apps.core.json_path import PathNotFound, extract_json_value

from .models import TestResult

REQUIRED_CONFIG_KEYS = {
    "status_code": ["expected"],
    "response_time_lt": ["expected_ms"],
    "header_exists": ["header_name"],
    "header_equals": ["header_name", "expected"],
    "json_field_exists": ["path"],
    "json_field_equals": ["path", "expected"],
    "body_contains": ["expected"],
}


def describe_assertion(assertion_type: str, config: dict) -> str:
    """Human-readable preview, e.g. "status_code == 200" — used as the
    default TestResult label and by the frontend's live preview."""
    if assertion_type == "status_code":
        return f"status_code == {config.get('expected')}"
    if assertion_type == "response_time_lt":
        return f"response_time < {config.get('expected_ms')}ms"
    if assertion_type == "header_exists":
        return f"header '{config.get('header_name')}' exists"
    if assertion_type == "header_equals":
        return f"header '{config.get('header_name')}' == '{config.get('expected')}'"
    if assertion_type == "json_field_exists":
        return f"{config.get('path')} exists"
    if assertion_type == "json_field_equals":
        return f"{config.get('path')} == {config.get('expected')!r}"
    if assertion_type == "body_contains":
        return f"body contains '{config.get('expected')}'"
    return assertion_type


def evaluate_assertion(assertion_type: str, config: dict, *, status_code, elapsed_ms, headers, body):
    """Returns (passed: bool, actual_value: str, message: str)."""
    if assertion_type == "status_code":
        expected = config.get("expected")
        passed = status_code == expected
        return passed, str(status_code), f"Expected status {expected}, got {status_code}."

    if assertion_type == "response_time_lt":
        expected_ms = config.get("expected_ms")
        passed = expected_ms is not None and elapsed_ms < expected_ms
        return passed, f"{elapsed_ms}ms", f"Expected response time < {expected_ms}ms, took {elapsed_ms}ms."

    normalized_headers = {k.lower(): v for k, v in (headers or {}).items()}

    if assertion_type == "header_exists":
        header_name = (config.get("header_name") or "").lower()
        passed = header_name in normalized_headers
        actual = normalized_headers.get(header_name, "")
        found = "found" if passed else "not found"
        return passed, actual, f"Header '{config.get('header_name')}' {found}."

    if assertion_type == "header_equals":
        header_name = (config.get("header_name") or "").lower()
        expected = config.get("expected")
        actual = normalized_headers.get(header_name)
        passed = actual == expected
        return (
            passed,
            str(actual) if actual is not None else "",
            f"Expected header '{config.get('header_name')}' == '{expected}', got '{actual}'.",
        )

    if assertion_type in ("json_field_exists", "json_field_equals"):
        path = config.get("path", "")
        try:
            parsed_body = json.loads(body) if body else None
        except (json.JSONDecodeError, TypeError):
            parsed_body = None

        if parsed_body is None:
            return False, "", "Response body is not valid JSON."

        try:
            value = extract_json_value(parsed_body, path)
        except PathNotFound:
            return False, "", f"Path '{path}' not found in the response."

        if assertion_type == "json_field_exists":
            return True, str(value), f"Path '{path}' exists."

        expected = config.get("expected")
        passed = value == expected
        return passed, str(value), f"Expected '{path}' == {expected!r}, got {value!r}."

    if assertion_type == "body_contains":
        expected = config.get("expected", "")
        passed = expected in (body or "")
        return passed, "", f"Expected body to contain '{expected}'."

    return False, "", f"Unknown assertion type '{assertion_type}'."


def run_assertions(*, saved_request, history_entry, result) -> list[dict]:
    """
    Evaluates every assertion on `saved_request` against `result`, persists
    a TestResult per assertion linked to `history_entry`, and returns the
    outcomes for the caller to include in the execute response.
    """
    assertions = list(saved_request.assertions.all())
    if not assertions:
        return []

    outcomes = []
    to_create = []
    for assertion in assertions:
        passed, actual_value, message = evaluate_assertion(
            assertion.type,
            assertion.config,
            status_code=result.status_code,
            elapsed_ms=result.elapsed_ms,
            headers=result.headers,
            body=result.body,
        )
        label = assertion.name or describe_assertion(assertion.type, assertion.config)

        to_create.append(
            TestResult(
                history=history_entry,
                assertion=assertion,
                assertion_name=label,
                passed=passed,
                actual_value=actual_value,
                message=message,
            )
        )
        outcomes.append(
            {
                "assertion_id": str(assertion.id),
                "name": label,
                "passed": passed,
                "actual_value": actual_value,
                "message": message,
            }
        )

    TestResult.objects.bulk_create(to_create)
    return outcomes
