"""
Dotted-path JSON lookup shared by request chaining (apps.saved_requests.
extraction) and test assertions (apps.testing.services): "token",
"data.access_token", "items.0.id". Not a full JSONPath implementation —
deliberately just enough for both features' needs, keeping one constrained,
auditable syntax across the app rather than two.
"""


class PathNotFound(Exception):
    pass


def extract_json_value(data, path: str):
    """Raises PathNotFound if any segment can't be resolved."""
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
