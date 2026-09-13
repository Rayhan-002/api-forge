from apps.testing.services import describe_assertion, evaluate_assertion

BASE_KWARGS = dict(
    status_code=200,
    elapsed_ms=150,
    headers={"Content-Type": "application/json"},
    body='{"user": {"id": 42, "name": "Ada"}}',
)


def evaluate(assertion_type, config, **overrides):
    kwargs = {**BASE_KWARGS, **overrides}
    return evaluate_assertion(assertion_type, config, **kwargs)


class TestStatusCode:
    def test_passes_when_equal(self):
        passed, actual, _ = evaluate("status_code", {"expected": 200})
        assert passed is True
        assert actual == "200"

    def test_fails_when_not_equal(self):
        passed, _, message = evaluate("status_code", {"expected": 201})
        assert passed is False
        assert "Expected status 201, got 200" in message


class TestResponseTimeLt:
    def test_passes_when_faster_than_threshold(self):
        passed, _, _ = evaluate("response_time_lt", {"expected_ms": 500})
        assert passed is True

    def test_fails_when_slower_than_threshold(self):
        passed, _, _ = evaluate("response_time_lt", {"expected_ms": 100})
        assert passed is False

    def test_fails_when_equal_to_threshold(self):
        passed, _, _ = evaluate("response_time_lt", {"expected_ms": 150})
        assert passed is False


class TestHeaderExists:
    def test_passes_when_present(self):
        passed, actual, _ = evaluate("header_exists", {"header_name": "Content-Type"})
        assert passed is True
        assert actual == "application/json"

    def test_is_case_insensitive(self):
        passed, _, _ = evaluate("header_exists", {"header_name": "content-type"})
        assert passed is True

    def test_fails_when_missing(self):
        passed, _, _ = evaluate("header_exists", {"header_name": "X-Missing"})
        assert passed is False


class TestHeaderEquals:
    def test_passes_when_equal(self):
        passed, _, _ = evaluate(
            "header_equals", {"header_name": "Content-Type", "expected": "application/json"}
        )
        assert passed is True

    def test_fails_when_different(self):
        passed, _, _ = evaluate("header_equals", {"header_name": "Content-Type", "expected": "text/html"})
        assert passed is False


class TestJsonFieldExists:
    def test_passes_for_nested_path(self):
        passed, actual, _ = evaluate("json_field_exists", {"path": "user.id"})
        assert passed is True
        assert actual == "42"

    def test_fails_for_missing_path(self):
        passed, _, message = evaluate("json_field_exists", {"path": "user.missing"})
        assert passed is False
        assert "not found" in message

    def test_fails_for_invalid_json_body(self):
        passed, _, message = evaluate("json_field_exists", {"path": "user.id"}, body="not json")
        assert passed is False
        assert "not valid JSON" in message


class TestJsonFieldEquals:
    def test_passes_when_equal(self):
        passed, _, _ = evaluate("json_field_equals", {"path": "user.name", "expected": "Ada"})
        assert passed is True

    def test_fails_when_different(self):
        passed, _, _ = evaluate("json_field_equals", {"path": "user.name", "expected": "Bob"})
        assert passed is False

    def test_compares_numbers_correctly(self):
        passed, _, _ = evaluate("json_field_equals", {"path": "user.id", "expected": 42})
        assert passed is True


class TestBodyContains:
    def test_passes_when_substring_present(self):
        passed, _, _ = evaluate("body_contains", {"expected": '"name": "Ada"'})
        assert passed is True

    def test_fails_when_substring_absent(self):
        passed, _, _ = evaluate("body_contains", {"expected": "nonexistent"})
        assert passed is False


class TestDescribeAssertion:
    def test_status_code(self):
        assert describe_assertion("status_code", {"expected": 200}) == "status_code == 200"

    def test_response_time_lt(self):
        assert describe_assertion("response_time_lt", {"expected_ms": 500}) == "response_time < 500ms"

    def test_json_field_equals(self):
        assert describe_assertion("json_field_equals", {"path": "user.id", "expected": 42}) == "user.id == 42"
