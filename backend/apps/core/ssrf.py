"""
SSRF (server-side request forgery) protection for the HTTP execution
service. The backend fetches URLs supplied by users, so every hostname is
resolved and every resolved IP is checked against an internal-network
blocklist *before* connecting — never a check against the hostname string
alone, which a DNS-rebinding attack (a public-looking domain that resolves
to a private IP) would trivially defeat.

Must be called again for every redirect hop, not just the original URL —
see apps.core.http_client.
"""

import ipaddress
import socket
from urllib.parse import urlsplit

from .errors import RequestExecutionError

ALLOWED_SCHEMES = {"http", "https"}


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local  # covers the 169.254.169.254 cloud metadata endpoint
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def assert_url_is_safe(url: str) -> None:
    parts = urlsplit(url)

    if parts.scheme not in ALLOWED_SCHEMES:
        raise RequestExecutionError("invalid_url", f"URL scheme '{parts.scheme or ''}' is not allowed.")

    hostname = parts.hostname
    if not hostname:
        raise RequestExecutionError("invalid_url", "URL is missing a hostname.")

    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise RequestExecutionError("dns_error", f"Could not resolve host '{hostname}'.") from exc

    for _family, _type, _proto, _canonname, sockaddr in addr_info:
        ip = ipaddress.ip_address(sockaddr[0])
        if _is_blocked_ip(ip):
            raise RequestExecutionError(
                "ssrf_blocked",
                f"Host '{hostname}' resolves to a disallowed address ({ip}).",
            )
