"""Owners' replies come in through Resend and are forwarded, so no personal address is in a camp's email."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

import pytest

from campfinder.owners import inbound

KEY = b"0123456789abcdef0123456789abcdef"
SECRET = "whsec_" + base64.b64encode(KEY).decode()
MSG = {"from": "Pat Director <director@riverside.example>", "to": ["owners@mail.bunkcheck.ai"],
       "subject": "Re: Confirm your listing", "text": "Week 3 is full. Thanks!", "html": None,
       "message_id": "<m1@riverside>", "created_at": "2026-10-14T12:00:00Z",
       "authentication": {"dmarc": "pass"}, "attachments": []}


def signed(event: dict, ts: int | None = None, key: bytes = KEY) -> tuple[bytes, dict]:
    body = json.dumps(event).encode()
    ts = ts or int(time.time())
    sig = base64.b64encode(hmac.new(key, f"msg_1.{ts}.".encode() + body, hashlib.sha256).digest()).decode()
    return body, {"svix-id": "msg_1", "svix-timestamp": str(ts), "svix-signature": f"v1,bogus v1,{sig}"}


def test_signature_check() -> None:
    body, h = signed({"type": "email.received"})
    args = (h["svix-id"], h["svix-timestamp"], h["svix-signature"])
    assert inbound.verify(SECRET, *args, body)
    assert not inbound.verify(SECRET, *args, body + b" ")                       # body changed
    assert not inbound.verify("", *args, body)                                   # not set up
    old_body, old = signed({"type": "email.received"}, ts=int(time.time()) - 3600)
    assert not inbound.verify(SECRET, old["svix-id"], old["svix-timestamp"], old["svix-signature"], old_body)
    other_body, other = signed({"type": "email.received"}, key=b"x" * 32)
    assert not inbound.verify(SECRET, other["svix-id"], other["svix-timestamp"], other["svix-signature"], other_body)


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv("RESEND_WEBHOOK_SECRET", SECRET)
    monkeypatch.setenv("OWNER_FORWARD_TO", "reader@example.com")
    seen = []

    async def fetch(email_id):
        seen.append(email_id)
        return dict(MSG)
    monkeypatch.setattr(inbound, "fetch_received", fetch)
    return seen


def test_a_reply_is_forwarded(setup, client, outbox) -> None:
    body, h = signed({"type": "email.received", "data": {"email_id": "e_1"}})
    res = client.post("/api/v1/internal/resend-inbound", content=body, headers=h)
    assert res.status_code == 200 and res.json() == {"status": "forwarded"} and setup == ["e_1"]
    email = outbox[-1]
    assert email.to == "reader@example.com" and email.subject == "Owner reply: Re: Confirm your listing"
    assert email.reply_to == "director@riverside.example"
    assert "Week 3 is full" in email.text and "Pat Director <director@riverside.example>" in email.text


def test_strangers_and_other_events(setup, client, outbox) -> None:
    body, h = signed({"type": "email.received", "data": {"email_id": "e_1"}})
    assert client.post("/api/v1/internal/resend-inbound", content=body,
                       headers={**h, "svix-signature": "v1,nope"}).status_code == 404
    assert client.post("/api/v1/internal/resend-inbound", content=b"{}").status_code == 404
    body, h = signed({"type": "email.sent", "data": {"email_id": "e_2"}})
    assert client.post("/api/v1/internal/resend-inbound", content=body, headers=h).json() == {"status": "ignored"}
    assert outbox == [] and setup == []


async def test_never_loops_and_needs_a_forward_address(setup, outbox, monkeypatch) -> None:
    async def own(email_id):
        return {**MSG, "from": "Bunkcheck <hello@mail.bunkcheck.ai>"}
    event = {"type": "email.received", "data": {"email_id": "e_1"}}
    assert (await inbound.handle(event, fetch=own))["status"].startswith("skipped")
    monkeypatch.delenv("OWNER_FORWARD_TO")
    assert "not set" in (await inbound.handle(event))["status"]
    assert outbox == []


async def test_listing_updates_only_with_the_switch(setup, outbox, db, monkeypatch) -> None:
    calls = []

    async def receive(sender, text, **kw):
        calls.append((sender, text, kw))
        return {"id": "m1", "status": "needs_person"}
    from campfinder.owners import updates
    monkeypatch.setattr(updates, "receive", receive)
    event = {"type": "email.received", "data": {"email_id": "e_1"}}
    assert "update" not in await inbound.handle(event)
    monkeypatch.setenv("OWNER_UPDATES_FROM_MAIL", "1")
    out = await inbound.handle(event)
    assert out["update"] == {"id": "m1", "status": "needs_person"}
    assert calls[0][0] == "director@riverside.example" and calls[0][2]["sender_verified"] is True
