import ipaddress
import json
import socket
from unittest.mock import patch

import httpx
import pytest

from apps.core.errors import RequestExecutionError
from apps.core.http_client import execute_http_request

_REAL_GETADDRINFO = socket.getaddrinfo


def _fake_getaddrinfo(host, *args, **kwargs):
    """
    Resolves literal IPs for real (instant, local, no network) and returns
    a fixed safe public IP for anything else, so tests can use readable
    fake hostnames (api.example.com) without depending on real DNS. Tests
    that specifically exercise SSRF/DNS-error behavior override this with
    their own nested `patch("socket.getaddrinfo", ...)`.
    """
    if host == "localhost":
        return _REAL_GETADDRINFO(host, *args, **kwargs)
    try:
        ipaddress.ip_address(host)
        return _REAL_GETADDRINFO(host, *args, **kwargs)
    except ValueError:
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))]


@pytest.fixture(autouse=True)
def _stub_dns():
    with patch("socket.getaddrinfo", side_effect=_fake_getaddrinfo):
        yield


def transport_from(handler):
    return httpx.MockTransport(handler)


class TestSuccessfulExecution:
    def test_returns_response_details(self):
        def handler(request):
            return httpx.Response(200, json={"ok": True}, headers={"X-Test": "1"})

        result = execute_http_request(
            method="GET",
            url="https://api.example.com/users",
            params=[],
            headers=[],
            body_type="none",
            body=None,
            transport=transport_from(handler),
        )

        assert result.status_code == 200
        assert json.loads(result.body) == {"ok": True}
        assert result.headers["x-test"] == "1"
        assert result.size_bytes > 0
        assert result.elapsed_ms >= 0

    def test_sends_enabled_params_and_headers_only(self):
        captured = {}

        def handler(request):
            captured["query"] = dict(request.url.params)
            captured["headers"] = dict(request.headers)
            return httpx.Response(200)

        execute_http_request(
            method="GET",
            url="https://api.example.com/search",
            params=[
                {"key": "q", "value": "widgets", "enabled": True},
                {"key": "debug", "value": "1", "enabled": False},
            ],
            headers=[
                {"key": "X-Trace", "value": "abc", "enabled": True},
                {"key": "X-Off", "value": "no", "enabled": False},
            ],
            body_type="none",
            body=None,
            transport=transport_from(handler),
        )

        assert captured["query"] == {"q": "widgets"}
        assert captured["headers"]["x-trace"] == "abc"
        assert "x-off" not in captured["headers"]


class TestAuth:
    def test_bearer_auth_sets_authorization_header(self):
        captured = {}

        def handler(request):
            captured["auth"] = request.headers.get("authorization")
            return httpx.Response(200)

        execute_http_request(
            method="GET",
            url="https://api.example.com/me",
            params=[],
            headers=[],
            body_type="none",
            body=None,
            auth_type="bearer",
            auth_config={"token": "abc123"},
            transport=transport_from(handler),
        )

        assert captured["auth"] == "Bearer abc123"

    def test_basic_auth_encodes_credentials(self):
        captured = {}

        def handler(request):
            captured["auth"] = request.headers.get("authorization")
            return httpx.Response(200)

        execute_http_request(
            method="GET",
            url="https://api.example.com/me",
            params=[],
            headers=[],
            body_type="none",
            body=None,
            auth_type="basic",
            auth_config={"username": "alice", "password": "secret"},
            transport=transport_from(handler),
        )

        assert captured["auth"] == "Basic YWxpY2U6c2VjcmV0"

    def test_api_key_in_query(self):
        captured = {}

        def handler(request):
            captured["query"] = dict(request.url.params)
            return httpx.Response(200)

        execute_http_request(
            method="GET",
            url="https://api.example.com/data",
            params=[],
            headers=[],
            body_type="none",
            body=None,
            auth_type="api_key",
            auth_config={"key_name": "api_key", "key_value": "xyz", "add_to": "query"},
            transport=transport_from(handler),
        )

        assert captured["query"] == {"api_key": "xyz"}


class TestBody:
    def test_json_body_forwarded_verbatim_with_content_type(self):
        captured = {}

        def handler(request):
            captured["content_type"] = request.headers.get("content-type")
            captured["body"] = request.content
            return httpx.Response(200)

        execute_http_request(
            method="POST",
            url="https://api.example.com/users",
            params=[],
            headers=[],
            body_type="json",
            body='{"name": "Ada"}',
            transport=transport_from(handler),
        )

        assert captured["content_type"] == "application/json"
        assert captured["body"] == b'{"name": "Ada"}'

    def test_form_urlencoded_body(self):
        captured = {}

        def handler(request):
            captured["content_type"] = request.headers.get("content-type")
            captured["body"] = request.content.decode()
            return httpx.Response(200)

        execute_http_request(
            method="POST",
            url="https://api.example.com/login",
            params=[],
            headers=[],
            body_type="form-urlencoded",
            body=[{"key": "username", "value": "alice", "enabled": True}],
            transport=transport_from(handler),
        )

        assert captured["content_type"] == "application/x-www-form-urlencoded"
        assert captured["body"] == "username=alice"

    def test_multipart_body_uses_multipart_encoding(self):
        captured = {}

        def handler(request):
            captured["content_type"] = request.headers.get("content-type", "")
            captured["body"] = request.content
            return httpx.Response(200)

        execute_http_request(
            method="POST",
            url="https://api.example.com/upload",
            params=[],
            headers=[],
            body_type="multipart",
            body=[{"key": "title", "value": "hello", "enabled": True}],
            transport=transport_from(handler),
        )

        assert captured["content_type"].startswith("multipart/form-data")
        assert b'name="title"' in captured["body"]
        assert b"hello" in captured["body"]


class TestRedirects:
    def test_follows_safe_redirect(self):
        calls = []

        def handler(request):
            calls.append(str(request.url))
            if request.url.path == "/old":
                return httpx.Response(302, headers={"Location": "https://api.example.com/new"})
            return httpx.Response(200, json={"landed": True})

        result = execute_http_request(
            method="GET",
            url="https://api.example.com/old",
            params=[],
            headers=[],
            body_type="none",
            body=None,
            transport=transport_from(handler),
        )

        assert len(calls) == 2
        assert result.status_code == 200
        assert result.url == "https://api.example.com/new"

    def test_blocks_redirect_to_private_ip(self):
        def handler(request):
            if request.url.host == "api.example.com":
                return httpx.Response(302, headers={"Location": "http://169.254.169.254/latest/meta-data/"})
            return httpx.Response(200)

        with pytest.raises(RequestExecutionError) as exc_info:
            execute_http_request(
                method="GET",
                url="https://api.example.com/old",
                params=[],
                headers=[],
                body_type="none",
                body=None,
                transport=transport_from(handler),
            )

        assert exc_info.value.error_type == "ssrf_blocked"

    def test_stops_after_max_redirects(self):
        def handler(request):
            return httpx.Response(302, headers={"Location": "https://api.example.com/loop"})

        with pytest.raises(RequestExecutionError) as exc_info:
            execute_http_request(
                method="GET",
                url="https://api.example.com/loop",
                params=[],
                headers=[],
                body_type="none",
                body=None,
                transport=transport_from(handler),
            )

        assert exc_info.value.error_type == "too_many_redirects"


class TestResponseSizeLimit:
    def test_oversized_response_is_rejected(self):
        def handler(request):
            return httpx.Response(200, content=b"x" * 1000)

        with patch("apps.core.http_client.MAX_RESPONSE_BYTES", 100):
            with pytest.raises(RequestExecutionError) as exc_info:
                execute_http_request(
                    method="GET",
                    url="https://api.example.com/huge",
                    params=[],
                    headers=[],
                    body_type="none",
                    body=None,
                    transport=transport_from(handler),
                )

        assert exc_info.value.error_type == "response_too_large"


class TestSSRFProtection:
    @pytest.mark.parametrize(
        "url",
        [
            "http://localhost/",
            "http://127.0.0.1/",
            "http://10.0.0.5/",
            "http://192.168.1.1/",
            "http://169.254.169.254/latest/meta-data/",
        ],
    )
    def test_blocks_internal_and_metadata_addresses(self, url):
        with pytest.raises(RequestExecutionError) as exc_info:
            execute_http_request(method="GET", url=url, params=[], headers=[], body_type="none", body=None)

        assert exc_info.value.error_type == "ssrf_blocked"

    def test_blocks_disallowed_scheme(self):
        with pytest.raises(RequestExecutionError) as exc_info:
            execute_http_request(
                method="GET",
                url="file:///etc/passwd",
                params=[],
                headers=[],
                body_type="none",
                body=None,
            )

        assert exc_info.value.error_type == "invalid_url"

    def test_blocks_dns_rebinding_style_resolution(self):
        """
        A hostname that looks public but resolves to a private IP must
        still be blocked - proving the check validates the resolved
        address, not just the hostname string.
        """
        fake_addr_info = [(2, 1, 6, "", ("10.1.2.3", 0))]

        with patch("socket.getaddrinfo", return_value=fake_addr_info):
            with pytest.raises(RequestExecutionError) as exc_info:
                execute_http_request(
                    method="GET",
                    url="https://looks-public.example.com/",
                    params=[],
                    headers=[],
                    body_type="none",
                    body=None,
                )

        assert exc_info.value.error_type == "ssrf_blocked"

    def test_unresolvable_host_is_a_dns_error(self):
        import socket

        with patch("socket.getaddrinfo", side_effect=socket.gaierror("not found")):
            with pytest.raises(RequestExecutionError) as exc_info:
                execute_http_request(
                    method="GET",
                    url="https://does-not-exist.invalid/",
                    params=[],
                    headers=[],
                    body_type="none",
                    body=None,
                )

        assert exc_info.value.error_type == "dns_error"
