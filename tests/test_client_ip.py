"""Per-IP limits count the address our proxy saw, not one the caller wrote into a header."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from starlette.responses import PlainTextResponse

from campfinder.client_ip import client_ip_from_scope, rate_key
from campfinder.config import get_settings
from campfinder.main import _rate_limited


def scope(headers: dict[str, str], peer: str | None = "10.0.0.9") -> dict:
    return {"type": "http", "client": (peer, 1234) if peer else None,
            "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()]}


@pytest.fixture
def header(monkeypatch):
    def use(name: str) -> None:
        monkeypatch.setattr(get_settings(), "client_ip_header", name)
    use("x-real-ip")
    return use


def test_railway_x_real_ip_is_used_and_x_forwarded_for_is_ignored(header):
    s = scope({"X-Real-IP": "203.0.113.7", "X-Forwarded-For": "1.2.3.4, 203.0.113.7"})
    assert client_ip_from_scope(s) == "203.0.113.7"


def test_without_the_trusted_header_the_socket_peer_counts(header):
    assert client_ip_from_scope(scope({"X-Forwarded-For": "1.2.3.4"})) == "10.0.0.9"


def test_a_malformed_header_falls_back_to_the_peer(header):
    assert client_ip_from_scope(scope({"X-Real-IP": "not-an-ip"})) == "10.0.0.9"
    assert client_ip_from_scope(scope({"X-Real-IP": "nope"}, peer=None)) is None


def test_x_forwarded_for_mode_takes_the_entry_our_proxy_appended(header):
    header("x-forwarded-for")
    assert client_ip_from_scope(scope({"X-Forwarded-For": "1.2.3.4, 198.51.100.2"})) == "198.51.100.2"


def test_cloudflare_header_and_peer_only_modes(header):
    header("cf-connecting-ip")
    assert client_ip_from_scope(scope({"CF-Connecting-IP": "2001:db8::1", "X-Real-IP": "1.1.1.1"})) == "2001:db8::1"
    header("")
    assert client_ip_from_scope(scope({"X-Real-IP": "1.1.1.1"})) == "10.0.0.9"


def test_ipv6_callers_are_counted_by_their_slash_64():
    assert rate_key("2001:db8:1:2:aaaa::1") == rate_key("2001:db8:1:2:ffff::9") == "2001:db8:1:2::/64"
    assert rate_key("2001:db8:1:3::1") != rate_key("2001:db8:1:2::1")
    assert rate_key("::ffff:203.0.113.7") == "203.0.113.7"
    assert rate_key("203.0.113.7") == "203.0.113.7"
    assert rate_key(None) is None and rate_key("junk") is None


def test_mcp_limit_holds_when_the_caller_rotates_x_forwarded_for(header):
    async def ok(scope, receive, send):
        await PlainTextResponse("ok")(scope, receive, send)

    client = TestClient(_rate_limited(ok, per_minute=3))
    codes = [client.post("/mcp/", headers={"X-Real-IP": "203.0.113.7", "X-Forwarded-For": f"9.9.9.{i}"}).status_code
             for i in range(5)]
    assert codes == [200, 200, 200, 429, 429]
    # A different real address has its own window.
    assert client.post("/mcp/", headers={"X-Real-IP": "203.0.113.8"}).status_code == 200


def test_inquiry_ip_limit_holds_when_the_caller_rotates_x_forwarded_for(header, client, monkeypatch):
    from campfinder.inquiries import service

    monkeypatch.setattr(service, "IP_HOURLY_CAP", 2)
    service._ip_windows.clear()
    codes = []
    for i in range(4):
        res = client.post("/api/v1/inquiries", json={"program_id": "00000000-0000-0000-0000-000000000000",
                                                       "question": "Is there space in week 3?"},
                          headers={"X-Real-IP": "203.0.113.7", "X-Forwarded-For": f"9.9.9.{i}"})
        codes.append(res.status_code)
    assert codes[-1] == 429 and codes.count(429) == 2
