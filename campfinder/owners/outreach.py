"""
The rules for emails we start to a camp (the listing email and the season update), checked
right before each one goes out. Replies to something the owner did ("Confirmed", "Updated")
are not outreach and aren't limited here.

1. Never write to an address on the do-not-contact list (`email_suppressions`): it hard
   bounced, its owner marked us as spam, they replied "stop", or a person added it.
2. At most OWNER_OUTREACH_DAILY_CAP of these emails in any 24 hours (default 20), so a new
   sending domain warms up slowly and one mistake can't reach every camp at once.
3. Not until OWNER_POSTAL_ADDRESS is set: the footer of every one carries our postal address
   and how to stop these emails (CAN-SPAM). There is no default; it must be a real address.

Bounces and complaints arrive from Resend's webhook (campfinder/owners/inbound.py). A person
manages the list with `python -m campfinder.owners suppress | unsuppress | suppressed`.
"""

from __future__ import annotations

import html
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from campfinder.database import get_supabase

Reason = Literal["bounced", "complained", "asked", "manual"]
DEFAULT_DAILY_CAP = 20
WINDOW = timedelta(hours=24)

# A reply whose first line is only one of these is a request to stop. Anything longer goes to a
# person: "stop listing us" is about the listing, not the emails.
STOP_REPLIES = {"stop", "unsubscribe", "stop emailing me", "please stop", "please stop emailing me",
                "remove me from your list", "remove me from your mailing list"}


class OutreachBlocked(Exception):
    """This email can't go out now. The message says why and what to do."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def normalize(email: str) -> str:
    return (email or "").strip().lower()


def daily_cap() -> int:
    try:
        return max(0, int(os.environ.get("OWNER_OUTREACH_DAILY_CAP", DEFAULT_DAILY_CAP)))
    except ValueError:
        return DEFAULT_DAILY_CAP


def postal_address() -> str | None:
    return (os.environ.get("OWNER_POSTAL_ADDRESS") or "").strip() or None


# ---------------------------------------------------------------------------
# The do-not-contact list
# ---------------------------------------------------------------------------

def suppressed(email: str) -> dict[str, Any] | None:
    """The do-not-contact row for this address, or None if we may write to it."""
    rows = get_supabase().table("email_suppressions").select("*").eq("email", normalize(email)).execute().data
    return rows[0] if rows else None


def suppress(email: str, reason: Reason, *, source: str, note: str | None = None) -> dict[str, Any]:
    """Add an address to the do-not-contact list. Adding it again keeps the first reason."""
    email = normalize(email)
    found = suppressed(email)
    if found:
        return found
    row = {"email": email, "reason": reason, "source": source, "note": note, "created_at": _now().isoformat()}
    get_supabase().table("email_suppressions").insert(row).execute()
    return row


def unsuppress(email: str) -> bool:
    """Take an address off the list (a person decided we may write again). True if it was on."""
    if not suppressed(email):
        return False
    get_supabase().table("email_suppressions").delete().eq("email", normalize(email)).execute()
    return True


def suppression_list() -> list[dict[str, Any]]:
    return (get_supabase().table("email_suppressions").select("*").order("created_at", desc=True)
            .execute().data or [])


def is_stop_reply(text: str) -> bool:
    """True if the reply's own first line is only a request to stop emails."""
    for line in (text or "").splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith(">") or re.match(r"^on .+ wrote:$", line, re.I):
            return False
        return re.sub(r"[^a-z ]", "", line.lower()).strip() in STOP_REPLIES
    return False


# ---------------------------------------------------------------------------
# Before each email
# ---------------------------------------------------------------------------

def sent_in_window(now: datetime | None = None) -> int:
    """Listing and season emails recorded in the last 24 hours."""
    since = ((now or _now()) - WINDOW).isoformat()
    return len(get_supabase().table("listing_confirmations").select("id").gte("sent_at", since).execute().data or [])


def check(to: str, now: datetime | None = None) -> None:
    """Raise OutreachBlocked if an email we start may not go to this address now."""
    if not postal_address():
        raise OutreachBlocked("Set OWNER_POSTAL_ADDRESS (our postal address, for the footer) before emailing camps")
    row = suppressed(to)
    if row:
        raise OutreachBlocked(f"{normalize(to)} is on the do-not-contact list ({row['reason']}, {row['source']})")
    cap = daily_cap()
    if sent_in_window(now) >= cap:
        raise OutreachBlocked(f"Today's limit is reached ({cap} camp emails in 24 hours, OWNER_OUTREACH_DAILY_CAP)")


# The company behind Bunkcheck (docs/decisions/company.md, rule 15). The footer names it, with the
# postal address, so every email we start says who sent it.
COMPANY = "Bunkcheck is built by PromptBridge LLC"


def footer_text() -> str:
    return (f"\n\n--\n{COMPANY}, {postal_address() or '[postal address not set]'}\n"
            "Don't want emails from us? Reply \"stop\" and we won't email this address again.")


def footer_html() -> str:
    address = html.escape(postal_address() or "[postal address not set]")
    return (f"<p style='color:#888;font-size:12px;margin-top:24px'>{html.escape(COMPANY)}, {address}<br>"
            "Don't want emails from us? Reply &ldquo;stop&rdquo; and we won't email this address again.</p>")
