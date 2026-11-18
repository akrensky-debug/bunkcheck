"""
The hand-raiser list: parents who asked to hear when Bunkcheck opens near them.

While the public site shows the hand-raiser page, this is the only thing a new parent can do
there. We keep an email, an optional town and the kids' ages, and send nothing: no confirmation,
no newsletter. Any email to this list is a separate decision.
"""

from __future__ import annotations

import re
import time
from collections import deque
from datetime import datetime, timezone

from campfinder.database import get_supabase

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
IP_HOURLY_CAP = 10
TOWN_MAX = 80
MAX_KIDS = 8

_ip_windows: dict[str, deque[float]] = {}


class HandRaiserError(Exception):
    def __init__(self, detail: str, status: int = 422):
        super().__init__(detail)
        self.detail = detail
        self.status = status


def check_ip(ip: str | None) -> None:
    """At most IP_HOURLY_CAP sign-ups an hour from one address, so nobody fills the list by script."""
    if not ip:
        return
    now = time.monotonic()
    window = _ip_windows.setdefault(ip, deque())
    while window and now - window[0] > 3600:
        window.popleft()
    if len(window) >= IP_HOURLY_CAP:
        raise HandRaiserError("Too many sign-ups from here in the last hour. Try again later.", 429)
    window.append(now)
    if len(_ip_windows) > 10_000:
        for key in [k for k, w in _ip_windows.items() if not w or now - w[-1] > 3600]:
            del _ip_windows[key]


def normalize_email(email: str) -> str:
    email = (email or "").strip().lower()
    if len(email) > 254 or not EMAIL_RE.match(email):
        raise HandRaiserError("That doesn't look like an email address.")
    return email


def clean_town(town: str | None) -> str | None:
    town = re.sub(r"\s+", " ", (town or "").strip())
    return town[:TOWN_MAX] or None


def clean_ages(ages: list[int] | None) -> list[int]:
    return sorted(a for a in (ages or []) if 0 <= a <= 18)[:MAX_KIDS]


def raise_hand(email: str, town: str | None = None, kids_ages: list[int] | None = None) -> None:
    """Add the address, or update its town and ages if it is already on the list. Sends nothing."""
    row: dict = {"email": normalize_email(email), "updated_at": datetime.now(timezone.utc).isoformat()}
    # A second sign-up without a town or ages keeps what she told us the first time.
    if (clean := clean_town(town)) is not None:
        row["town"] = clean
    if ages := clean_ages(kids_ages):
        row["kids_ages"] = ages
    get_supabase().table("hand_raisers").upsert(row, on_conflict="email").execute()
