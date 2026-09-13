"""
Request chaining, kept deliberately simple: a SavedRequest can declare
`extract_rules` — "after a successful response, take this JSON path and
write it into this variable in this environment" — that are applied
automatically every time that saved request is executed (see
apps.saved_requests.views.SavedRequestExecuteView). Not a full multi-request
runner/scripting engine; see progress.md for that tradeoff.
"""

import json

from apps.environments.models import Environment, EnvironmentVariable


class PathNotFound(Exception):
    pass


def extract_json_value(data, path: str):
    """
    Dotted-path lookup: "token", "data.access_token", "items.0.id". Not a
    full JSONPath implementation — deliberately just enough for chaining a
    couple of requests together. Raises PathNotFound if any segment can't
    be resolved.
    """
    current = data
    for segment in path.split("."):
        try:
            if isinstance(current, list):
                current = current[int(segment)]
            elif isinstance(current, dict):
                current = current[segment]
            else:
                raise PathNotFound(f"Cannot look up '{segment}' on a {type(current).__name__}.")
        except (KeyError, IndexError, ValueError) as exc:
            raise PathNotFound(f"'{segment}' not found.") from exc
    return current


def apply_extract_rules(*, owner, extract_rules: list[dict], response_body: str) -> list[dict]:
    """
    Applies each rule against the response body, upserting an
    EnvironmentVariable per successful extraction. Returns one result dict
    per rule (whether it succeeded or not) for the caller to report back.
    """
    if not extract_rules:
        return []

    try:
        parsed_body = json.loads(response_body) if response_body else None
    except (json.JSONDecodeError, TypeError):
        parsed_body = None

    results = []
    for rule in extract_rules:
        variable_name = rule.get("variable_name", "")
        source_path = rule.get("source_path", "")
        target_environment_id = rule.get("target_environment")
        outcome = {
            "variable_name": variable_name,
            "target_environment": target_environment_id,
            "success": False,
            "message": "",
        }

        if parsed_body is None:
            outcome["message"] = "Response body is not valid JSON."
            results.append(outcome)
            continue

        try:
            value = extract_json_value(parsed_body, source_path)
        except PathNotFound as exc:
            outcome["message"] = f"Path '{source_path}' not found in the response ({exc})."
            results.append(outcome)
            continue

        environment = Environment.objects.filter(owner=owner, id=target_environment_id).first()
        if not environment:
            outcome["message"] = "Target environment no longer exists."
            results.append(outcome)
            continue

        EnvironmentVariable.objects.update_or_create(
            environment=environment,
            key=variable_name,
            defaults={"value": "" if value is None else str(value)},
        )
        outcome["success"] = True
        outcome["message"] = f"Set {variable_name} in {environment.name}."
        results.append(outcome)

    return results
