"""
The caller's IP address, for rate limits, read only from a header our own proxy sets.

Railway's edge sets X-Real-IP to the address that connected to it (docs.railway.com,
Networking > Specs & Limits > Request headers). Anything else a caller sends, including the
first entry of X-Forwarded-For, is whatever the caller typed, so it is never trusted.

CLIENT_IP_HEADER names the trusted header (default x-real-ip). Put Cloudflare in front and
set it to cf-connecting-ip. Set it to x-forwarded-for only behind a proxy that appends the
address it saw; then the rightmost entry is used, the one that proxy added. Set it to an
empty string to use the socket's peer address (local development, no proxy).

Rate limits key IPv6 callers by their /64: one home or phone gets a whole /64, so keying by
the full address would let one caller rotate through billions of fresh limits.
"""

from __future__ import annotations

import ipaddress
from typing import Any, Iterable

from campfinder.config import get_settings


def _header(headers: Iterable[tuple[bytes, bytes]], name: str) -> str | None:
    want = name.lower().encode()
    for key, value in headers:
        if key.lower() == want:
            return value.decode("latin-1")
    return None


def _valid(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(ipaddress.ip_address(value.strip()))
    except ValueError:
        return None


def client_ip_from_scope(scope: dict[str, Any]) -> str | None:
    """The caller's address for an ASGI request: the trusted header, else the socket peer."""
    peer = (scope.get("client") or (None,))[0]
    name = get_settings().client_ip_header.strip().lower()
    if not name:
        return _valid(peer)
    raw = _header(scope.get("headers") or [], name)
    if raw is not None and name == "x-forwarded-for":
        raw = raw.split(",")[-1]
    return _valid(raw) or _valid(peer)


def client_ip(request: Any) -> str | None:
    """The caller's address for a FastAPI/Starlette Request."""
    return client_ip_from_scope(request.scope)


def rate_key(ip: str | None) -> str | None:
    """The key a rate limit counts against: the IPv4 address, or the IPv6 /64."""
    if not ip:
        return None
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return None
    if addr.version == 6:
        if addr.ipv4_mapped:
            return str(addr.ipv4_mapped)
        return str(ipaddress.ip_network(f"{addr}/64", strict=False))
    return str(addr)
