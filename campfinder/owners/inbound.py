"""
Owners' replies, received by Resend and forwarded to the person who reads them.

Camp owner emails say "reply to this email"; OWNER_REPLY_TO points those replies at an
address on a domain where Resend receives mail (owners@mail.bunkcheck.ai). Resend calls
POST /api/v1/internal/resend-inbound with an `email.received` event, signed the Svix way.
We fetch the message and forward it to OWNER_FORWARD_TO, so no personal address is ever
in an email a camp sees.

With OWNER_UPDATES_FROM_MAIL=1 the reply also goes to listing updates by email
(campfinder/owners/updates.py), which proposes changes for a person to apply.

Settings: RESEND_WEBHOOK_SECRET (the webhook's signing secret, whsec_...), OWNER_FORWARD_TO,
RESEND_API_KEY, EMAIL_MODE=resend.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import html
import os
import time
from email.utils import parseaddr
from typing import Any, Awaitable, Callable

from campfinder.mailer import Email, get_mailer

TOLERANCE_SECONDS = 5 * 60
Fetch = Callable[[str], Awaitable[dict[str, Any]]]


def verify(secret: str, msg_id: str | None, timestamp: str | None, signature: str | None, body: bytes,
           now: float | None = None) -> bool:
    """Svix signature check: HMAC-SHA256 over "id.timestamp.body" with the base64 key after whsec_."""
    if not (secret and msg_id and timestamp and signature):
        return False
    try:
        if abs((now or time.time()) - int(timestamp)) > TOLERANCE_SECONDS:
            return False
        key = base64.b64decode(secret.removeprefix("whsec_"))
    except ValueError:
        return False
    expected = base64.b64encode(hmac.new(key, f"{msg_id}.{timestamp}.".encode() + body, hashlib.sha256).digest()).decode()
    return any(hmac.compare_digest(expected, part.split(",", 1)[1])
               for part in signature.split() if part.startswith("v1,"))


async def fetch_received(email_id: str) -> dict[str, Any]:
    import httpx

    async with httpx.AsyncClient() as client:
        res = await client.get(f"https://api.resend.com/emails/receiving/{email_id}",
                               headers={"Authorization": f"Bearer {os.environ.get('RESEND_API_KEY', '')}"}, timeout=15)
    res.raise_for_status()
    return res.json()


def forwarded(msg: dict[str, Any], to: str) -> Email:
    sender = msg.get("from") or "unknown sender"
    subject = msg.get("subject") or "(no subject)"
    body = msg.get("text") or ""
    head = (f"From: {sender}\nTo: {', '.join(msg.get('to') or [])}\nDate: {msg.get('created_at', '')}\n"
            f"Subject: {subject}\n\n"
            f"Replying to this goes to {parseaddr(sender)[1] or sender} from your own address.\n\n")
    attachments = msg.get("attachments") or []
    note = f"\n\n[{len(attachments)} attachment(s) not forwarded; see Resend > Emails > Receiving]" if attachments else ""
    text = head + body + note
    original_html = msg.get("html")
    page = (f"<pre style='white-space:pre-wrap'>{html.escape(head)}</pre>"
            + (original_html if original_html else f"<pre style='white-space:pre-wrap'>{html.escape(body)}</pre>")
            + (f"<p>{html.escape(note.strip())}</p>" if note else ""))
    return Email(to=to, subject=f"Owner reply: {subject}", html=page, text=text, reply_to=parseaddr(sender)[1] or None)


async def handle(event: dict[str, Any], fetch: Fetch | None = None) -> dict[str, Any]:
    """Forward one received email. Returns what happened, for the webhook's response."""
    if event.get("type") != "email.received":
        return {"status": "ignored"}
    email_id = (event.get("data") or {}).get("email_id")
    if not email_id:
        return {"status": "ignored"}
    msg = await (fetch or fetch_received)(email_id)
    sender = parseaddr(msg.get("from") or "")[1].lower()
    forward_to = os.environ.get("OWNER_FORWARD_TO", "").strip()
    own = os.environ.get("EMAIL_FROM", "hello@mail.bunkcheck.ai")
    if not forward_to:
        return {"status": "not forwarded: OWNER_FORWARD_TO is not set"}
    if sender in (forward_to.lower(), parseaddr(own)[1].lower()):
        return {"status": "skipped: our own address"}   # never loop
    result: dict[str, Any] = {"status": "forwarded" if await get_mailer().send(forwarded(msg, forward_to))
                              else "not forwarded: mailer is off"}
    if os.environ.get("OWNER_UPDATES_FROM_MAIL") == "1" and sender:
        from campfinder.owners import updates

        auth = msg.get("authentication") or {}
        row = await updates.receive(sender, msg.get("text") or "", subject=msg.get("subject"),
                                    message_id=msg.get("message_id"), sender_verified=auth.get("dmarc") == "pass")
        result["update"] = {"id": str(row["id"]), "status": row["status"]}
    return result
