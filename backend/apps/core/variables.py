"""
Resolves `{{variable}}` placeholders (URL, params, headers, body,
auth_config) against the caller's active environment before a request is
executed.

Deliberately fails loudly rather than silently sending a literal
`{{token}}` to the target host: a request with an undefined variable is
almost always a mistake, and an HTTP round-trip is expensive to waste on
finding that out. This mirrors the same "always 200, success:false"
philosophy as the rest of execution — see apps.core.errors.
"""

import re

from .errors import RequestExecutionError

VARIABLE_PATTERN = re.compile(r"\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}")


def _find_variable_names(text) -> set[str]:
    if not isinstance(text, str) or not text:
        return set()
    return set(VARIABLE_PATTERN.findall(text))


def _substitute(text, variables: dict[str, str]):
    if not isinstance(text, str) or not text:
        return text
    return VARIABLE_PATTERN.sub(lambda m: variables.get(m.group(1), m.group(0)), text)


def _resolve_rows(rows, variables, unresolved):
    resolved_rows = []
    for row in rows or []:
        key, value = row.get("key", ""), row.get("value", "")
        unresolved |= _find_variable_names(key) - variables.keys()
        unresolved |= _find_variable_names(value) - variables.keys()
        resolved_rows.append(
            {**row, "key": _substitute(key, variables), "value": _substitute(value, variables)}
        )
    return resolved_rows


def resolve_payload(payload: dict, variables: dict[str, str]) -> dict:
    """
    Returns a new payload dict with every `{{var}}` occurrence substituted.
    Raises RequestExecutionError("unresolved_variable", ...) naming every
    undefined variable found, without making any network call.
    """
    unresolved: set[str] = set()

    resolved = dict(payload)
    resolved["url"] = _substitute(payload["url"], variables)
    unresolved |= _find_variable_names(payload["url"]) - variables.keys()
    resolved["params"] = _resolve_rows(payload.get("params"), variables, unresolved)
    resolved["headers"] = _resolve_rows(payload.get("headers"), variables, unresolved)

    body = payload.get("body")
    if isinstance(body, str):
        unresolved |= _find_variable_names(body) - variables.keys()
        resolved["body"] = _substitute(body, variables)
    elif isinstance(body, list):
        resolved["body"] = _resolve_rows(body, variables, unresolved)

    auth_config = payload.get("auth_config")
    if auth_config:
        resolved_auth = {}
        for field, value in auth_config.items():
            if isinstance(value, str):
                unresolved |= _find_variable_names(value) - variables.keys()
                resolved_auth[field] = _substitute(value, variables)
            else:
                resolved_auth[field] = value
        resolved["auth_config"] = resolved_auth

    if unresolved:
        names = ", ".join(f"{{{{{name}}}}}" for name in sorted(unresolved))
        raise RequestExecutionError(
            "unresolved_variable",
            f"Undefined variable(s) in the active environment: {names}",
        )

    return resolved
