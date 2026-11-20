"""
Parent checks: a parent says a fact on a camp's page is still right, or that it's wrong and
what it is now (docs/parent-checks.md).

The risk follows what an answer can do:
- A report ("this is wrong") needs nothing. It changes nothing by itself: it goes to a person,
  who reads the camp's own page, and it never shows publicly before that.
- A "still right" is the one answer that shows on the page, as a count. It counts only once
  the address behind it is proven: the parent is signed in, pressed Confirm on the link we
  emailed, or sent the token of a link they confirmed earlier.

An address typed into the form proves nothing, even one that confirmed before: anyone can type
it. So those answers wait for the link in the email, which lists them.

What we keep: an address, a camp, a fact, an answer, and at most 280 characters and a link.
No name, no child, no family id, no IP address. The parent's text is data: only a person
reads it. It is never shown on a public page and never sent to a model.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from campfinder.booking.service import _fmt_when, _parse_ts, camp_window
from campfinder.checks import emails
from campfinder.database import get_supabase
from campfinder.limits import SlidingWindow
from campfinder.mailer import get_mailer
from campfinder.models.checks import Answer, CampChecks, FactCheck, PendingAnswer, ReporterView
from campfinder.services.camps import find_camp_row
from campfinder.services.errors import NotFound, ServiceError

log = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CONFIRM_FOR = timedelta(days=7)        # a confirm link works this long
RESEND_AFTER = timedelta(hours=1)      # a second visit within this sends no second email
COUNT_FOR = timedelta(days=90)         # a "still right" counts this long
MIN_TO_SHOW = 2                        # parents who must agree before a count shows
CAMP_DAILY_REPORTS = 30                # past this, a camp's reports are stored but not emailed
REPLACEABLE = ("unconfirmed", "counted", "open")   # a parent's newer answer replaces these
WAITING = ("open", "asking_camp")                  # what a person can still act on

ip_hourly = SlidingWindow(10, 3600)            # submissions from one address
confirm_daily = SlidingWindow(3, 86400)        # confirm emails to one address


class CheckError(ServiceError):
    """An answer we can't take, or a step a person can't run yet. `status` is the HTTP code."""

    def __init__(self, detail: str, status: int = 422):
        super().__init__(detail)
        self.status = status


@dataclass(frozen=True)
class Fact:
    label: str
    session: bool = False                  # the fact belongs to one session
    sources: tuple[str, ...] = ()          # the field_sources rows a person's check upgrades


FACTS: dict[str, Fact] = {
    "ages": Fact("Ages", sources=("age_min", "age_max")),
    "price_per_week": Fact("Price a week", sources=("price_per_week",)),
    "extended_care": Fact("Extended care", sources=("extended_care",)),
    "transportation": Fact("Transport", sources=("transportation",)),
    "meals_included": Fact("Meals", sources=("meals_included",)),
    "financial_aid": Fact("Financial aid", sources=("financial_aid",)),
    "website_url": Fact("Website link", sources=("website_url",)),
    "registration_url": Fact("Registration link", sources=("registration_url",)),
    "registration_opens": Fact("The day registration opens"),
    "is_active": Fact("Running this season"),
    "session_dates": Fact("Dates", session=True, sources=("sessions",)),
    "session_price": Fact("Price", session=True, sources=("sessions",)),
    "session_availability": Fact("Full or open", session=True, sources=("sessions",)),
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(ts: datetime) -> str:
    return ts.astimezone(timezone.utc).isoformat()


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def normalize_email(email: str) -> str:
    email = (email or "").strip().lower()
    if len(email) > 254 or not EMAIL_RE.match(email):
        raise CheckError("That doesn't look like an email address.")
    return email


def check_ip(key: str) -> None:
    if not ip_hourly.hit(key):
        raise CheckError("Too many answers from here in the last hour. Try again later.", 429)


# ---------------------------------------------------------------------------
# What the listing says now
# ---------------------------------------------------------------------------

def _num(v: Any) -> float | None:
    return float(v) if v is not None else None


def current_value(field: str, camp: dict[str, Any], session: dict[str, Any] | None,
                  window: dict[str, Any] | None) -> Any:
    """The listed value of one fact, as plain JSON. None: the listing doesn't say."""
    if field == "ages":
        lo, hi = camp.get("age_min"), camp.get("age_max")
        return None if lo is None and hi is None else {"min": lo, "max": hi}
    if field == "price_per_week":
        return _num(camp.get("price_per_week"))
    if field == "is_active":
        return camp.get("is_active") is not False
    if field == "registration_opens":
        opens = _parse_ts(window["opens_at"]) if window else None
        return _iso(opens) if opens else None
    if field in ("session_dates", "session_price", "session_availability"):
        if session is None:
            return None
        if field == "session_dates":
            return {"start": str(session["start_date"]), "end": str(session["end_date"])}
        if field == "session_price":
            return _num(session.get("price"))
        availability = session.get("availability")
        return None if availability in (None, "unknown") else availability   # "unknown" is nothing to vouch for
    return camp.get(field)


def shown(field: str, value: Any) -> str:
    """A value the way a parent or the person at the inbox reads it."""
    if value is None:
        return "not in the listing"
    if field == "ages":
        lo, hi = value.get("min"), value.get("max")
        return f"{lo} to {hi}" if lo is not None and hi is not None else f"{lo if lo is not None else hi}"
    if field in ("price_per_week", "session_price"):
        return f"${value:,.0f}" + (" a week" if field == "price_per_week" else "")
    if field == "session_dates":
        return f"{value['start']} to {value['end']}"
    if field == "registration_opens":
        return _fmt_when(_parse_ts(value))
    if field == "is_active":
        return "yes" if value else "taken off the site"
    if isinstance(value, bool):
        return "yes" if value else "no"
    return str(value)


@dataclass
class Listing:
    camp: dict[str, Any]
    sessions: dict[str, dict[str, Any]]
    window: dict[str, Any] | None

    def value(self, field: str, session_id: Any = None) -> Any:
        return current_value(field, self.camp, self.sessions.get(str(session_id)) if session_id else None,
                             self.window)


def _listing(camp: dict[str, Any]) -> Listing:
    cid = str(camp["id"])
    rows = get_supabase().table("sessions").select("*").eq("camp_id", cid).order("start_date").execute().data or []
    return Listing(camp, {str(s["id"]): s for s in rows}, camp_window(cid, None))


def _camp_by_id(camp_id: Any) -> dict[str, Any]:
    """The camp row even when it has been taken off the site: a report may be why it was."""
    rows = get_supabase().table("camps").select("*").eq("id", str(camp_id)).execute().data
    if not rows:
        raise NotFound("Camp not found")
    return rows[0]


# ---------------------------------------------------------------------------
# The public view: each fact, its value and how many parents agree
# ---------------------------------------------------------------------------

def _checks(**eq: Any) -> list[dict[str, Any]]:
    q = get_supabase().table("parent_checks").select("*")
    for col, v in eq.items():
        q = q.eq(col, str(v))
    return q.execute().data or []


def _same_fact(row: dict[str, Any], field: str, session_id: Any) -> bool:
    return row["field_name"] == field and str(row.get("session_id") or "") == str(session_id or "")


def _count(rows: list[dict[str, Any]], field: str, session_id: Any, value: Any, now: datetime) -> tuple[int, str | None]:
    """Parents whose proven "still right" is for the value listed now. Nothing under two."""
    newest: dict[str, datetime] = {}
    for r in rows:
        if r["status"] != "counted" or not _same_fact(r, field, session_id) or r.get("value_seen") != value:
            continue
        at = _parse_ts(r["created_at"])
        if now - at > COUNT_FOR:
            continue
        who = str(r.get("reporter_id") or r["id"])   # an address that stopped still counts, once per answer
        newest[who] = max(at, newest.get(who, at))
    if len(newest) < MIN_TO_SHOW:
        return 0, None
    return len(newest), max(newest.values()).date().isoformat()


def camp_checks(camp_ref: Any) -> CampChecks:
    """Every fact a parent can check on this camp, with what the listing says now."""
    listing = _listing(find_camp_row(camp_ref))
    rows = _checks(camp_id=listing.camp["id"])
    now = _now()
    facts: list[FactCheck] = []

    def add(field: str, session: dict[str, Any] | None = None) -> None:
        sid = session["id"] if session else None
        value = listing.value(field, sid)
        count, latest = _count(rows, field, sid, value, now)
        facts.append(FactCheck(
            field=field, label=FACTS[field].label, session_id=sid, session_name=session.get("name") if session else None,
            value=value, shown=shown(field, value), right_count=count, latest_right=latest,
            checking=any(r["status"] == "asking_camp" and _same_fact(r, field, sid) for r in rows),
        ))

    for field, fact in FACTS.items():
        if not fact.session:
            add(field)
    for session in listing.sessions.values():
        for field, fact in FACTS.items():
            if fact.session:
                add(field, session)
    return CampChecks(camp_id=listing.camp["id"], facts=facts)


# ---------------------------------------------------------------------------
# A parent's answers
# ---------------------------------------------------------------------------

def _reporter_by_email(email: str) -> dict[str, Any] | None:
    rows = get_supabase().table("parent_reporters").select("*").eq("email", email).execute().data
    return rows[0] if rows else None


def _reporter_by_token(token: str | None) -> dict[str, Any] | None:
    if not token or len(token) > 64:
        return None
    rows = get_supabase().table("parent_reporters").select("*").eq("confirm_token_hash", _hash(token)).execute().data
    return rows[0] if rows else None


def _reporter_for(email: str, *, proven: bool) -> dict[str, Any]:
    sb = get_supabase()
    row = _reporter_by_email(email)
    if row is None:
        try:
            row = sb.table("parent_reporters").insert({"email": email}).execute().data[0]
        except Exception:  # two visits at once: the other one made the row
            row = _reporter_by_email(email)
            if row is None:
                raise
    if proven and not row.get("confirmed_at"):
        row = sb.table("parent_reporters").update({"confirmed_at": _iso(_now())}).eq("id", str(row["id"])).execute().data[0]
    return row


def _supersede(row: dict[str, Any]) -> None:
    """A parent's newer answer about a fact replaces their earlier one."""
    if not row.get("reporter_id"):
        return
    sb = get_supabase()
    for old in _checks(reporter_id=row["reporter_id"], camp_id=row["camp_id"]):
        if str(old["id"]) != str(row["id"]) and old["status"] in REPLACEABLE and old.get("confirmed_at") \
                and _same_fact(old, row["field_name"], row.get("session_id")) \
                and _parse_ts(old["created_at"]) <= _parse_ts(row["created_at"]):
            sb.table("parent_checks").delete().eq("id", str(old["id"])).execute()


def _clean_url(url: str | None) -> str | None:
    url = (url or "").strip()
    if not url:
        return None
    if not re.match(r"^https?://[^\s]+$", url, re.I):
        raise CheckError("The link has to start with http:// or https://.")
    return url


def _validate(answers: list[Answer], listing: Listing, has_address: bool) -> None:
    for a in answers:
        fact = FACTS.get(a.field)
        if fact is None:
            raise CheckError(f"We can't take an answer about '{a.field}'.")
        if fact.session and (not a.session_id or str(a.session_id) not in listing.sessions):
            raise CheckError("That session isn't part of this camp.")
        if not fact.session and a.session_id:
            raise CheckError(f"'{a.field}' is about the camp, not one session.")
        if a.verdict == "right":
            if not has_address:
                raise CheckError("A \"still right\" needs your email address, so one parent counts once.")
            if listing.value(a.field, a.session_id) is None:
                raise CheckError(f"The listing doesn't say anything about {fact.label.lower()} yet.")
        elif not (a.says or "").strip():
            raise CheckError("Tell us what it is now.")
        _clean_url(a.evidence_url)


async def submit(camp_ref: Any, answers: list[Answer], *, email: str | None = None, token: str | None = None,
                 account_email: str | None = None) -> None:
    """Store a parent's answers. Returns nothing: the caller answers the same whatever happened.

    account_email is the signed-in parent's address, which sign-in already proved."""
    listing = _listing(find_camp_row(camp_ref))
    cid = str(listing.camp["id"])
    typed = normalize_email(email) if (email or "").strip() else None

    proven, reporter = False, None
    if account_email:
        reporter, proven = _reporter_for(normalize_email(account_email), proven=True), True
    elif (held := _reporter_by_token(token)) and held.get("confirmed_at"):
        reporter, proven = held, True
    _validate(answers, listing, has_address=bool(reporter or typed))
    if reporter is None and typed:
        reporter = _reporter_for(typed, proven=False)

    sb = get_supabase()
    now = _now()
    reports_today = sum(1 for r in _checks(camp_id=cid) if r["verdict"] == "wrong"
                        and now - _parse_ts(r["created_at"]) < timedelta(days=1))
    stored: list[dict[str, Any]] = []
    for a in answers:
        right = a.verdict == "right"
        row = sb.table("parent_checks").insert({
            "camp_id": cid, "session_id": str(a.session_id) if a.session_id else None, "field_name": a.field,
            "verdict": a.verdict, "value_seen": listing.value(a.field, a.session_id),
            "says": None if right else (a.says or "").strip(), "basis": None if right else a.basis,
            "evidence_url": None if right else _clean_url(a.evidence_url),
            "reporter_id": str(reporter["id"]) if reporter else None,
            "confirmed_at": _iso(now) if proven else None,
            "status": ("counted" if proven else "unconfirmed") if right else "open",
            "created_at": _iso(now),
        }).execute().data[0]
        if proven:
            _supersede(row)
        stored.append(row)

    reports = [r for r in stored if r["verdict"] == "wrong"]
    forward_to = os.environ.get("OWNER_FORWARD_TO", "").strip()
    if reports and reports_today >= CAMP_DAILY_REPORTS:
        log.warning("parent reports for one camp hit the daily limit; stored, not emailed")
    elif reports and forward_to:
        await get_mailer().send(emails.report(forward_to, listing.camp, [_describe(r, listing) for r in reports]))

    if reporter and not proven:
        await _send_confirm(reporter, listing.camp, now)


async def _send_confirm(reporter: dict[str, Any], camp: dict[str, Any], now: datetime) -> None:
    sent = _parse_ts(reporter.get("confirm_sent_at"))
    if sent and now - sent < RESEND_AFTER:
        return  # the first email is probably still on its way, and its link covers these answers too
    if not confirm_daily.hit(reporter["email"]):
        log.warning("confirm emails for one address hit the daily limit")
        return
    token = secrets.token_urlsafe(24)
    get_supabase().table("parent_reporters").update(
        {"confirm_token_hash": _hash(token), "confirm_sent_at": _iso(now)}).eq("id", str(reporter["id"])).execute()
    await get_mailer().send(emails.confirm(reporter["email"], camp, token))


def _describe(row: dict[str, Any], listing: Listing | None = None) -> dict[str, Any]:
    """One answer with its camp, its label and the listing's value then and now."""
    listing = listing or _listing(_camp_by_id(row["camp_id"]))
    session = listing.sessions.get(str(row.get("session_id"))) if row.get("session_id") else None
    field = row["field_name"]
    now_value = listing.value(field, row.get("session_id"))
    return {
        **row,
        "camp_name": listing.camp["name"],
        "label": FACTS[field].label,
        "session_name": session.get("name") if session else None,
        "seen": shown(field, row.get("value_seen")),
        "now_value": now_value,
        "now": shown(field, now_value),
    }


# ---------------------------------------------------------------------------
# The link in the email: look, confirm, stop
# ---------------------------------------------------------------------------

def _hint(email: str) -> str:
    name, _, domain = email.partition("@")
    return f"{name[:1]}{'•' * max(len(name) - 1, 2)}@{domain}"


def _must_hold(token: str) -> dict[str, Any]:
    reporter = _reporter_by_token(token)
    if reporter is None:
        raise CheckError("This link isn't one of ours, or it was replaced by a newer one.", 404)
    return reporter


def _pending(reporter: dict[str, Any]) -> list[dict[str, Any]]:
    rows = [r for r in _checks(reporter_id=reporter["id"]) if not r.get("confirmed_at")]
    return sorted(rows, key=lambda r: str(r["created_at"]))


def _expired(reporter: dict[str, Any], now: datetime) -> bool:
    sent = _parse_ts(reporter.get("confirm_sent_at"))
    return bool(sent and now - sent > CONFIRM_FOR)


def view(token: str) -> ReporterView:
    """What the page behind the link shows. Looking changes nothing (mail scanners open links)."""
    reporter = _must_hold(token)
    pending = _pending(reporter)
    listings: dict[str, Listing] = {}
    answers = []
    for r in pending:
        cid = str(r["camp_id"])
        if cid not in listings:
            listings[cid] = _listing(_camp_by_id(cid))
        d = _describe(r, listings[cid])
        answers.append(PendingAnswer(camp_name=d["camp_name"], label=d["label"], session_name=d["session_name"],
                                     verdict=r["verdict"], shown=d["seen"], says=r.get("says")))
    status = "expired" if pending and _expired(reporter, _now()) else "pending" if pending else "on"
    return ReporterView(status=status, email_hint=_hint(reporter["email"]), answers=answers)


def confirm(token: str) -> ReporterView:
    """The parent pressed Confirm: the address is proven, and the answers listed now count."""
    reporter = _must_hold(token)
    now = _now()
    pending = _pending(reporter)
    if pending and _expired(reporter, now):
        raise CheckError("This link has expired. Send your answers again from the camp's page.", 410)
    sb = get_supabase()
    if not reporter.get("confirmed_at"):
        sb.table("parent_reporters").update({"confirmed_at": _iso(now)}).eq("id", str(reporter["id"])).execute()
    for r in pending:
        values = {"confirmed_at": _iso(now)}
        if r["status"] == "unconfirmed":
            values["status"] = "counted"
        row = sb.table("parent_checks").update(values).eq("id", str(r["id"])).execute().data[0]
        _supersede(row)
    return view(token)


def stop(token: str) -> ReporterView:
    """Delete the address. Proven answers stay, without it; unproven ones go."""
    reporter = _must_hold(token)
    sb = get_supabase()
    for r in _checks(reporter_id=reporter["id"]):
        if r.get("confirmed_at"):
            sb.table("parent_checks").update({"reporter_id": None}).eq("id", str(r["id"])).execute()
        else:
            sb.table("parent_checks").delete().eq("id", str(r["id"])).execute()
    sb.table("parent_reporters").delete().eq("id", str(reporter["id"])).execute()
    return ReporterView(status="stopped")


# ---------------------------------------------------------------------------
# The person's side: what's waiting, and the four outcomes
# ---------------------------------------------------------------------------

def inbox() -> list[dict[str, Any]]:
    """Reports waiting for a person, oldest first."""
    rows = [r for r in get_supabase().table("parent_checks").select("*").eq("verdict", "wrong").execute().data or []
            if r["status"] in WAITING]
    return [_describe(r) for r in sorted(rows, key=lambda r: str(r["created_at"]))]


def asking_camps() -> dict[str, list[str]]:
    """Camps a person decided to ask, with the facts a parent reported: camp name -> labels."""
    out: dict[str, list[str]] = {}
    for r in inbox():
        if r["status"] == "asking_camp":
            out.setdefault(r["camp_name"], []).append(r["label"].lower())
    return out


def get_report(ref: str) -> dict[str, Any]:
    """A report by its id, or by the start of it when that names exactly one."""
    ref = (ref or "").strip().lower()
    rows = [r for r in get_supabase().table("parent_checks").select("*").eq("verdict", "wrong").execute().data or []
            if ref and str(r["id"]).startswith(ref)]
    if len(rows) != 1:
        raise CheckError(f"No report with id {ref!r}." if not rows else f"{len(rows)} reports start with {ref!r}.", 404)
    return _describe(rows[0])


def _waiting(ref: str) -> dict[str, Any]:
    row = get_report(ref)
    if row["status"] not in WAITING:
        raise CheckError(f"This report was already handled: {row['status']} by {row.get('handled_by') or 'someone'}.", 409)
    return row


def _close(row: dict[str, Any], status: str, by: str, **values: Any) -> dict[str, Any]:
    get_supabase().table("parent_checks").update(
        {"status": status, "handled_by": by, "handled_at": _iso(_now()), **values}).eq("id", str(row["id"])).execute()
    return get_report(str(row["id"]))


def fixed(ref: str, *, by: str, source_url: str | None = None) -> dict[str, Any]:
    """The parent was right and the listing now says so. Writes the change log, with the
    parent's words as the message behind the change. With source_url, the fact becomes
    'checked by our team' against that page, because a person read it."""
    row = _waiting(ref)
    if row["now_value"] == row.get("value_seen"):
        raise CheckError(f"The listing still says {row['seen']}. Change it first, then run fixed.", 409)
    sb = get_supabase()
    how = f" (how they know: {row['basis']})" if row.get("basis") else ""
    change = sb.table("listing_changes").insert({
        "camp_id": str(row["camp_id"]), "session_id": row.get("session_id"), "field_name": row["field_name"],
        "changed_by": "team", "actor": by, "old_value": row.get("value_seen"), "new_value": row["now_value"],
        "raw_message": f"A parent reported: {row.get('says') or ''}{how}",
    }).execute().data[0]
    if source_url := _clean_url(source_url):
        now = _iso(_now())
        cid = str(row["camp_id"])
        have = {r["field_name"] for r in sb.table("field_sources").select("field_name").eq("camp_id", cid).execute().data or []}
        for name in FACTS[row["field_name"]].sources:
            values = {"source_type": "team_verified", "source_url": source_url, "last_verified": now,
                      "notes": f"Checked by {by} after a parent's report"}
            if name in have:
                sb.table("field_sources").update(values).eq("camp_id", cid).eq("field_name", name).execute()
            else:
                sb.table("field_sources").insert({"camp_id": cid, "field_name": name, **values}).execute()
    return _close(row, "fixed", by, listing_change_id=str(change["id"]))


def as_listed(ref: str, *, by: str) -> dict[str, Any]:
    """The camp's own page agrees with the listing."""
    return _close(_waiting(ref), "as_listed", by)


def ask_camp(ref: str, *, by: str) -> dict[str, Any]:
    """Can't tell from the camp's page. Sends nothing: the camp shows first in `owners queue`,
    and the fact shows "checking with the camp". The report stays in the inbox."""
    row = _waiting(ref)
    if row["status"] == "asking_camp":
        return row
    return _close(row, "asking_camp", by)


def close(ref: str, *, by: str, reason: str) -> dict[str, Any]:
    """Not a fact, spam, or a duplicate. An opinion, or anything about a person or a child,
    is closed as `not_a_fact` and its text is cleared."""
    reason = (reason or "").strip()
    if not reason:
        raise CheckError("Say why it's closed.")
    cleared = {"says": None, "evidence_url": None} if reason == "not_a_fact" else {}
    return _close(_waiting(ref), "closed", by, reason=reason, **cleared)


# ---------------------------------------------------------------------------
# The family export
# ---------------------------------------------------------------------------

def export_for(email: str) -> list[dict[str, Any]]:
    """The answers made from one proven address, for its owner's download."""
    reporter = _reporter_by_email(email.strip().lower())
    if reporter is None:
        return []
    return sorted(_checks(reporter_id=reporter["id"]), key=lambda r: str(r["created_at"]))
