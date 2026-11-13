"""
The season update: "here is your 2026 season as we have it; send us 2027".

Parents plan the summer from January to March, before most camps have posted it. This email
asks each owner for three facts: next season's session dates, its price per week, and the day
registration opens. The owner answers on a short form (the link) or by replying in plain words
(campfinder/owners/updates.py reads those).

It reuses the owner confirmation machinery (campfinder/owners/service.py): one link per camp, a
snapshot of the facts shown, 30-day expiry, and every step in the change log. The two emails
are told apart by `listing_confirmations.kind`, so a link for one never works on the other.

The owner is the checker for this email (Andrew, 13 November 2026): a camp doesn't need a
person's hand check before it is asked. What the owner sends becomes `camp_verified`, field by
field, and replaces last season's facts. A camp is marked `camp_verified` as a whole only when
the owner sent the new dates and said the rest of the listing is right.

"Same weeks as last year" is turned into real dates here (`same_weeks`), each session moved by
whole weeks so it keeps its weekday. Where that move changes which holidays fall in a session,
the owner is shown the dates and asked, never assumed.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from pydantic import BaseModel, Field

from campfinder.alerts import service as alerts
from campfinder.booking.service import local_tz
from campfinder.database import get_supabase
from campfinder.mailer import get_mailer
from campfinder.owners import emails
from campfinder.owners.service import (
    CONFIRMATION_TTL, CONFIRMED_FIELDS, ConfirmationError, Prepared, Queue, _hash, _now, _sessions,
    _verify_contact, current_snapshot, primary_contact, record_change,
)
from campfinder.services.season import planning_year

KIND = "season_update"
ASK_AGAIN_AFTER = timedelta(days=21)   # an answer without dates: ask again after this
PROVIDENCE = "Providence, RI"           # camps.region for the Providence area (data/camps/providence.json)

# Facts "the rest is right" vouches for. Not the price: last season's price is last season's.
REST_FIELDS = [f for f in CONFIRMED_FIELDS if f != "price_per_week"]

MAX_SESSIONS = 40
MAX_SESSION_DAYS = 70


def target_season(today: date | None = None) -> int:
    """The summer parents are planning (until July, this one; then next)."""
    return planning_year(today)


# ---------------------------------------------------------------------------
# "Same weeks as last year", as dates
# ---------------------------------------------------------------------------

def shift_date(d: date, years: int = 1) -> date:
    """The same weekday, the nearest whole number of weeks from d's date `years` later."""
    try:
        target = d.replace(year=d.year + years)
    except ValueError:      # 29 February
        target = d.replace(year=d.year + years, day=28)
    return d + timedelta(weeks=round((target - d).days / 7))


def _observed(d: date) -> date:
    return d - timedelta(days=1) if d.weekday() == 5 else d + timedelta(days=1) if d.weekday() == 6 else d


def summer_holidays(year: int) -> dict[date, str]:
    """US federal holidays a summer camp week can hit, on the weekday they're observed."""
    may31 = date(year, 5, 31)
    memorial = may31 - timedelta(days=may31.weekday())
    sep1 = date(year, 9, 1)
    labor = sep1 + timedelta(days=(7 - sep1.weekday()) % 7)
    return {memorial: "Memorial Day", _observed(date(year, 6, 19)): "Juneteenth",
            _observed(date(year, 7, 4)): "the Fourth of July holiday", labor: "Labor Day"}


def _holidays_in(start: date, end: date) -> dict[str, date]:
    found = {}
    for year in {start.year, end.year}:
        for day, name in summer_holidays(year).items():
            if start <= day <= end:
                found[name] = day
    return found


def _d(v: Any) -> date:
    return v if isinstance(v, date) else date.fromisoformat(str(v)[:10])


def day(d: date) -> str:
    return f"{d:%a %b} {d.day}"


@dataclass
class Suggested:
    name: str | None
    start_date: date
    end_date: date
    was_start: date
    was_end: date
    note: str | None = None      # why the owner should look at this one


def same_weeks(sessions: list[dict[str, Any]], to_year: int) -> list[Suggested]:
    """Last season's sessions moved to `to_year`, keeping weekdays. A session gets a note when
    the move changes which holiday falls in it (2027: the Fourth of July is observed on Monday
    5 July, so the week that starts that day is not last year's week)."""
    out = []
    for s in sorted(sessions, key=lambda s: str(s["start_date"])):
        start, end = _d(s["start_date"]), _d(s["end_date"])
        years = to_year - start.year
        if years <= 0:
            out.append(Suggested(s.get("name"), start, end, start, end))
            continue
        new_start, new_end = shift_date(start, years), shift_date(end, years)
        before, after = _holidays_in(start, end), _holidays_in(new_start, new_end)
        note = None
        gained = [n for n in after if n not in before]
        lost = [n for n in before if n not in after]
        if gained:
            n = gained[0]
            note = f"{day(after[n])} is {n}. Last year this session had no holiday."
        elif lost:
            n = lost[0]
            note = f"Last year this session had {n} ({day(before[n])}). This year it doesn't."
        out.append(Suggested(s.get("name"), new_start, new_end, start, end, note))
    return out


# ---------------------------------------------------------------------------
# What the owner sends (the form, or a reply read by updates.py)
# ---------------------------------------------------------------------------

class NewSession(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    start_date: date
    end_date: date
    price: float | None = Field(default=None, description="Total for the session, in dollars")


class SeasonFacts(BaseModel):
    """Next season's facts as the owner gave them. Anything left out stays as it is."""
    season_year: int = Field(default=0, description="Set from the link or the email asked about")
    sessions: list[NewSession] | None = Field(default=None, description="The season's sessions, all of them")
    dates_not_set: bool = False
    price_per_week: float | None = None
    price_not_set: bool = False
    registration_opens: date | None = None
    registration_time: time | None = None
    registration_not_set: bool = False
    rest_is_right: bool = Field(default=False, description="The owner said the rest of the listing is right")
    note: str | None = Field(default=None, max_length=4000, description="Anything else, for a person")

    def anything(self) -> bool:
        return bool(self.sessions or self.price_per_week is not None or self.registration_opens
                    or self.rest_is_right or self.dates_not_set or self.price_not_set or self.registration_not_set)


def problems(facts: SeasonFacts) -> list[str]:
    """Why these facts can't go on the listing as sent. Empty when they can."""
    out = []
    y = facts.season_year
    if facts.sessions is not None:
        if not facts.sessions:
            out.append("Add at least one session, or say the dates aren't set yet.")
        if len(facts.sessions) > MAX_SESSIONS:
            out.append(f"That's more than {MAX_SESSIONS} sessions; reply to the email instead.")
        for i, s in enumerate(facts.sessions, 1):
            label = s.name or f"Session {i}"
            if s.end_date < s.start_date:
                out.append(f"{label} ends before it starts.")
            elif (s.end_date - s.start_date).days + 1 > MAX_SESSION_DAYS:
                out.append(f"{label} runs longer than {MAX_SESSION_DAYS} days.")
            if s.start_date.year != y or s.end_date.year != y:
                out.append(f"{label} isn't in {y}.")
            if s.price is not None and not 0 <= s.price <= 20_000:
                out.append(f"{label}'s price doesn't look right (${s.price:,.0f}).")
    if facts.price_per_week is not None and not 0 < facts.price_per_week <= 5_000:
        out.append(f"The price per week doesn't look right (${facts.price_per_week:,.0f}).")
    r = facts.registration_opens
    if r is not None and not date(y - 1, 1, 1) <= r <= date(y, 8, 31):
        out.append(f"Registration for {y} opening on {r:%B} {r.day}, {r.year} doesn't look right.")
    return out


# ---------------------------------------------------------------------------
# Putting it on the listing
# ---------------------------------------------------------------------------

def _days(s: dict[str, Any] | NewSession) -> int:
    start = s.start_date if isinstance(s, NewSession) else _d(s["start_date"])
    end = s.end_date if isinstance(s, NewSession) else _d(s["end_date"])
    return (end - start).days + 1


def _weeks(n_days: int) -> int:
    return max(1, round(n_days / 7))


def session_line(s: dict[str, Any] | NewSession) -> str:
    """'Week 1: Mon Jun 28 to Fri Jul 2, 2027, $325'."""
    if isinstance(s, NewSession):
        name, start, end, price = s.name, s.start_date, s.end_date, s.price
    else:
        name, start, end, price = s.get("name"), _d(s["start_date"]), _d(s["end_date"]), s.get("price")
    when = f"{day(start)} to {day(end)}, {end.year}"
    cost = f", ${float(price):,.0f}" if price is not None else ""
    return f"{name}: {when}{cost}" if name else f"{when}{cost}"


def _pair(old: list[dict[str, Any]], new: list[NewSession]) -> list[tuple[dict[str, Any] | None, NewSession | None]]:
    """Which old session each new one replaces: by name when every name matches up, else in
    date order. Keeping the row keeps a family's saved picks pointing at the same week."""
    old = sorted(old, key=lambda s: str(s["start_date"]))
    new = sorted(new, key=lambda s: s.start_date)
    names_old = [(s.get("name") or "").strip().lower() for s in old]
    names_new = [(s.name or "").strip().lower() for s in new]
    if all(names_new) and len(set(names_new)) == len(names_new) and len(set(names_old)) == len(names_old):
        by_name = {n: s for n, s in zip(names_old, old) if n}
        pairs: list[tuple[dict[str, Any] | None, NewSession | None]] = [(by_name.pop(n, None), s) for n, s in zip(names_new, new)]
        return pairs + [(s, None) for s in by_name.values()] + [(s, None) for n, s in zip(names_old, old) if not n]
    pairs = [(old[i] if i < len(old) else None, s) for i, s in enumerate(new)]
    return pairs + [(s, None) for s in old[len(new):]]


def _new_price(s: NewSession, before: dict[str, Any] | None, old_weekly: Any, new_weekly: float | None) -> float | None:
    """The owner's session price. If they gave only a weekly price, a session that was priced at
    exactly last year's weekly rate times its weeks, and is as many days long as last year, gets
    the new weekly rate times its weeks. Anything else (a new session, a short holiday week) is
    left blank rather than guessed."""
    if s.price is not None:
        return s.price
    if new_weekly is None or before is None or before.get("price") is None or old_weekly is None:
        return None
    if _days(s) != _days(before):
        return None
    if abs(float(before["price"]) - float(old_weekly) * _weeks(_days(before))) < 0.01:
        return round(new_weekly * _weeks(_days(s)), 2)
    return None


def _source(camp_id: str, field_name: str, note: str) -> None:
    sb = get_supabase()
    values = {"source_type": "camp_verified", "last_verified": _now().isoformat(), "notes": note}
    existing = sb.table("field_sources").select("id").eq("camp_id", camp_id).eq("field_name", field_name).execute().data
    if existing:
        sb.table("field_sources").update(values).eq("camp_id", camp_id).eq("field_name", field_name).execute()
    else:
        sb.table("field_sources").insert({"camp_id": camp_id, "field_name": field_name, **values}).execute()


def season_window(camp_id: str, season: int) -> dict[str, Any] | None:
    """The camp-wide registration window for `season`: one that opens from July of the year
    before through the end of that summer."""
    lo, hi = datetime(season - 1, 7, 1, tzinfo=timezone.utc), datetime(season, 9, 1, tzinfo=timezone.utc)
    rows = get_supabase().table("registration_windows").select("*").eq("camp_id", camp_id).execute().data or []
    rows = [r for r in rows if not r.get("session_id")
            and lo <= datetime.fromisoformat(str(r["opens_at"]).replace("Z", "+00:00")) < hi]
    return sorted(rows, key=lambda r: str(r["opens_at"]))[0] if rows else None


def opens_at(d: date, t: time | None) -> datetime:
    """Local time where the camps are (REMINDER_TZ). No time given: the start of that day,
    which alert emails show as the day alone."""
    return datetime.combine(d, t or time(0, 0), tzinfo=local_tz())


@dataclass
class Applied:
    changes: list[dict[str, Any]] = field(default_factory=list)   # {"what", "before", "after", "quote"?}
    sessions_now: list[str] = field(default_factory=list)
    registration_now: str | None = None
    price_now: Any = None
    camp_verified: bool = False
    not_set: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)              # what we couldn't take, and why

    def as_dict(self) -> dict[str, Any]:
        return {"changes": self.changes, "sessions_now": self.sessions_now, "registration_now": self.registration_now,
                "price_now": self.price_now, "camp_verified": self.camp_verified, "not_set": self.not_set,
                "skipped": self.skipped}


def registration_line(opens: Any) -> str:
    ts = opens if isinstance(opens, datetime) else datetime.fromisoformat(str(opens).replace("Z", "+00:00"))
    local = ts.astimezone(local_tz())
    when = f"{local:%A, %B} {local.day}, {local.year}"
    if (local.hour, local.minute) != (0, 0):
        when += " at " + local.strftime("%I:%M %p").lstrip("0").lower()
    return when


def apply_facts(camp: dict[str, Any], facts: SeasonFacts, *, changed_by: str, actor: str | None,
                raw_message: str | None, snapshot: dict[str, Any] | None = None,
                quotes: dict[str, str] | None = None) -> Applied:
    """Put the owner's facts on the listing. Each fact becomes confirmed by the camp today and
    goes in the change log with what the owner sent. Checked with `problems` first."""
    bad = problems(facts)
    if bad:
        raise ConfirmationError(" ".join(bad))
    sb = get_supabase()
    quotes = quotes or {}
    y = facts.season_year
    out = Applied()
    camp_values: dict[str, Any] = {}
    where = f"the {y} update email"
    note = f"Sent by {actor or 'the camp'} through {where}"
    old_sessions = _sessions(camp["id"])

    if facts.sessions:
        before_lines = [session_line(s) for s in old_sessions]
        for before, new in _pair(old_sessions, facts.sessions):
            if new is None:
                sb.table("sessions").delete().eq("id", str(before["id"])).execute()
                continue
            values = {"name": new.name, "start_date": new.start_date.isoformat(), "end_date": new.end_date.isoformat(),
                      "length_days": _days(new), "length_weeks": round(_days(new) / 7, 1),
                      "price": _new_price(new, before, camp.get("price_per_week"), facts.price_per_week),
                      # last season's availability and spots say nothing about this one
                      "availability": "unknown", "spots_available": None, "spots_total": None,
                      "spots_updated_at": None, "spots_source": None}
            if before is not None:
                sb.table("sessions").update(values).eq("id", str(before["id"])).execute()
            else:
                sb.table("sessions").insert({"camp_id": camp["id"], **values}).execute()
        after = _sessions(camp["id"])
        out.changes.append({"what": f"Sessions ({y})", "before": before_lines, "after": [session_line(s) for s in after],
                            "quote": quotes.get("sessions")})
        record_change(camp["id"], "sessions", changed_by, actor, old_value=before_lines,
                      new_value=[session_line(s) for s in after], raw_message=raw_message)
        _source(camp["id"], "sessions", note)
        if camp.get("season_year") != y:
            camp_values["season_year"] = y
            record_change(camp["id"], "season_year", changed_by, actor, old_value=camp.get("season_year"),
                          new_value=y, raw_message=raw_message)
    elif facts.dates_not_set:
        out.not_set.append("dates")

    if facts.price_per_week is not None:
        old = camp.get("price_per_week")
        camp_values["price_per_week"] = facts.price_per_week
        out.changes.append({"what": f"Price per week ({y})", "before": _money(old), "after": _money(facts.price_per_week),
                            "quote": quotes.get("price")})
        record_change(camp["id"], "price_per_week", changed_by, actor, old_value=old, new_value=facts.price_per_week,
                      raw_message=raw_message)
        _source(camp["id"], "price_per_week", note)
    elif facts.price_not_set:
        out.not_set.append("price")

    if facts.registration_opens:
        ts = opens_at(facts.registration_opens, facts.registration_time)
        row = season_window(camp["id"], y)
        values = {"opens_at": ts.isoformat(), "verified": True, "source_url": None, "updated_at": _now().isoformat(),
                  "notes": f"From the owner ({actor or 'the camp'}), {where}"
                           + ("" if facts.registration_time else "; day only, no time given")}
        if row:
            sb.table("registration_windows").update(values).eq("id", str(row["id"])).execute()
        else:
            sb.table("registration_windows").insert({"camp_id": camp["id"], "session_id": None, **values}).execute()
        before = registration_line(row["opens_at"]) + ("" if row.get("verified") else " (not checked)") if row else None
        out.changes.append({"what": f"Registration opens ({y})", "before": before, "after": registration_line(ts),
                            "quote": quotes.get("registration")})
        record_change(camp["id"], "registration_opens", changed_by, actor,
                      old_value=row["opens_at"] if row else None, new_value=ts.isoformat(), raw_message=raw_message)
        _source(camp["id"], "registration_opens", note)
        out.registration_now = registration_line(ts)
    elif facts.registration_not_set:
        out.not_set.append("registration")

    if facts.rest_is_right:
        current = {f: camp.get(f) for f in REST_FIELDS}
        shown = (snapshot or {}).get("camp") or {}
        if snapshot is not None and any(_same(shown.get(f), current[f]) is False for f in REST_FIELDS):
            out.skipped.append("We changed the listing after emailing you, so we didn't mark the rest of it confirmed.")
        else:
            for f in REST_FIELDS:
                if current[f] is not None:
                    _source(camp["id"], f, f"Confirmed by {actor or 'the camp'} through {where}")
            record_change(camp["id"], "owner_confirmation", changed_by, actor,
                          new_value={"rest_is_right": [f for f in REST_FIELDS if current[f] is not None]},
                          raw_message=raw_message)
            if facts.sessions and camp["verification_status"] != "camp_verified":
                camp_values.update(verification_status="camp_verified")
                record_change(camp["id"], "verification_status", changed_by, actor,
                              old_value=camp["verification_status"], new_value="camp_verified", raw_message=raw_message)
                out.camp_verified = True

    if camp_values:
        camp_values["last_reviewed_date"] = _now().isoformat()
        sb.table("camps").update(camp_values).eq("id", camp["id"]).execute()
    out.sessions_now = [session_line(s) for s in _sessions(camp["id"])]
    out.price_now = _money(camp_values.get("price_per_week", camp.get("price_per_week")))
    if out.registration_now is None:
        w = season_window(camp["id"], y)
        out.registration_now = registration_line(w["opens_at"]) if w and w.get("verified") else None
    return out


def _same(a: Any, b: Any) -> bool:
    try:
        return a == b or (a is not None and b is not None and float(a) == float(b))
    except (TypeError, ValueError):
        return False


def _money(v: Any) -> str | None:
    return None if v is None else f"${float(v):,.0f}"


# ---------------------------------------------------------------------------
# The email and its link
# ---------------------------------------------------------------------------

def prepare(camp: dict[str, Any], *, to: str | None = None, season: int | None = None) -> Prepared:
    """Build the season update email without recording or sending anything."""
    if camp.get("is_active") is False:
        raise ConfirmationError(f"{camp['name']} is off the site")
    season = season or target_season()
    contact = primary_contact(camp["id"])
    recipient = (to or (contact or {}).get("email") or camp.get("email") or "").strip().lower()
    if not recipient or "@" not in recipient:
        raise ConfirmationError(f"No email for {camp['name']}: pass one with --to")
    first_name = None
    if contact and (contact.get("email") or "").lower() == recipient and contact.get("name"):
        first_name = contact["name"].split()[0]
    _, snapshot = current_snapshot(camp["id"])
    token = secrets.token_urlsafe(24)
    email = emails.season_update_request(recipient, first_name, camp, snapshot, token, season,
                                         waiting=alerts.waiting_count(camp["id"]))
    return Prepared(camp, snapshot, email, token)


async def send(camp: dict[str, Any], *, sent_by: str, to: str | None = None, season: int | None = None) -> Prepared:
    """Record and send the season update email. Needs no hand check first: the owner is the
    checker for this one. An unanswered earlier season link for the camp stops working."""
    season = season or target_season()
    p = prepare(camp, to=to, season=season)
    sb = get_supabase()
    sb.table("listing_confirmations").update({"status": "superseded"}) \
        .eq("camp_id", camp["id"]).eq("kind", KIND).eq("status", "sent").execute()
    sb.table("listing_confirmations").insert({
        "camp_id": camp["id"], "kind": KIND, "season_year": season, "email": p.email.to,
        "token_hash": _hash(p.token), "snapshot": p.snapshot, "status": "sent", "sent_by": sent_by,
        "sent_at": _now().isoformat(), "expires_at": (_now() + CONFIRMATION_TTL).isoformat(),
    }).execute()
    record_change(camp["id"], "season_update", "team", sent_by, new_value={"sent_to": p.email.to, "season": season})
    if not await get_mailer().send(p.email):
        record_change(camp["id"], "season_update", "system", None,
                      new_value={"not_emailed": "email is not set up; send the link by hand"})
    return p


def _open(token: str) -> dict[str, Any] | None:
    rows = get_supabase().table("listing_confirmations").select("*") \
        .eq("token_hash", _hash(token)).eq("kind", KIND).eq("status", "sent").execute().data
    if not rows:
        return None
    expires = datetime.fromisoformat(str(rows[0]["expires_at"]).replace("Z", "+00:00"))
    return rows[0] if expires > _now() else None


@dataclass
class UpdateView:
    camp_name: str
    city: str | None
    season_year: int                  # the season asked about
    shown_season: int | None          # the season the facts shown are from
    snapshot: dict[str, Any]
    suggested: list[Suggested]
    price_per_week: Any
    registration: str | None          # what parents see now for the season asked about


def look_up(token: str) -> UpdateView | None:
    """What a season update link shows. Changes nothing (mail scanners open links)."""
    row = _open(token)
    if row is None:
        return None
    camp, _ = current_snapshot(row["camp_id"])
    season = int(row["season_year"])
    w = season_window(camp["id"], season)
    return UpdateView(camp["name"], camp.get("city"), season, camp.get("season_year"), row["snapshot"],
                      same_weeks(row["snapshot"]["sessions"], season), camp.get("price_per_week"),
                      registration_line(w["opens_at"]) if w and w.get("verified") else None)


async def answer(token: str, facts: SeasonFacts) -> tuple[str, Applied] | None:
    """The owner's form. Puts the facts on the listing, makes the owner a verified contact (the
    link only reached their inbox) and emails them back exactly what changed. None if the link
    doesn't work; ConfirmationError if the facts don't check out (nothing is changed then)."""
    row = _open(token)
    if row is None:
        return None
    facts = facts.model_copy(update={"season_year": int(row["season_year"])})
    bad = problems(facts)
    if bad:
        raise ConfirmationError(" ".join(bad))
    if not facts.anything() and not facts.note:
        raise ConfirmationError("Nothing to send yet: fill in at least one answer.")
    claimed = get_supabase().table("listing_confirmations").update({
        "status": "answered", "responded_at": _now().isoformat(), "answer": facts.model_dump(mode="json"),
    }).eq("id", row["id"]).eq("status", "sent").execute()
    if not claimed.data:
        return None
    camp, _ = current_snapshot(row["camp_id"])
    owner = row["email"]
    raw = f"Season update form, {facts.model_dump_json(exclude_none=True)}"
    applied = apply_facts(camp, facts, changed_by="owner_web", actor=owner, raw_message=raw, snapshot=row["snapshot"])
    _verify_contact(camp["id"], owner)
    if facts.note:
        # Words for a person go where a person reads owners' email.
        get_supabase().table("owner_messages").insert({
            "from_email": owner, "subject": f"Note on the {facts.season_year} update form", "body": facts.note,
            "camp_id": camp["id"], "status": "needs_person", "reason": "A note from the season update form",
            "handled_at": _now().isoformat(),
        }).execute()
    if not await get_mailer().send(emails.season_updated(owner, camp, facts.season_year, applied.as_dict())):
        record_change(camp["id"], "season_update", "system", None,
                      new_value={"not_emailed": "email is not set up; tell the owner what changed by hand"})
    return camp["name"], applied


# ---------------------------------------------------------------------------
# Who to ask, and the January 1 number
# ---------------------------------------------------------------------------

def owner_confirmed(season: int) -> set[str]:
    """Camps whose `season` dates came from the owner: through this email or a reply
    (season_year moved by the owner), or a listing confirmation of a listing that already
    showed that season's sessions."""
    sb = get_supabase()
    done = {str(c["camp_id"]) for c in sb.table("listing_changes").select("*").eq("field_name", "season_year").execute().data or []
            if c.get("changed_by") in ("owner_web", "owner_email") and _int(c.get("new_value")) == season}
    for c in sb.table("listing_confirmations").select("*").eq("status", "confirmed").execute().data or []:
        sessions = (c.get("snapshot") or {}).get("sessions") or []
        if sessions and all(str(s["start_date"]).startswith(str(season)) for s in sessions):
            done.add(str(c["camp_id"]))
    camps = {str(c["id"]): c for c in sb.table("camps").select("*").execute().data or []}
    return {cid for cid in done if cid in camps and camps[cid].get("season_year") == season}


def _int(v: Any) -> int | None:
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


@dataclass
class Count:
    region: str
    season: int
    live: int
    owner_confirmed: int
    shows_season: int        # shows the season at all (owner or our team)
    asked: int               # a season link is out and working
    answered_without_dates: int


def count(region: str = PROVIDENCE, season: int | None = None, now: datetime | None = None) -> Count:
    """The January 1 number: live camps in `region` whose next-season facts the owner confirmed."""
    season = season or target_season()
    now = now or _now()
    sb = get_supabase()
    live = [c for c in sb.table("camps").select("*").execute().data or []
            if c.get("is_active") is not False and (c.get("region") or "") == region]
    ids = {str(c["id"]) for c in live}
    links = [r for r in sb.table("listing_confirmations").select("*").eq("kind", KIND).execute().data or []
             if str(r["camp_id"]) in ids and r.get("season_year") == season]
    confirmed = owner_confirmed(season) & ids
    asked = {str(r["camp_id"]) for r in links if r["status"] == "sent" and _ts(r["expires_at"]) > now}
    partial = {str(r["camp_id"]) for r in links if r["status"] == "answered"} - confirmed
    return Count(region, season, len(live), len(confirmed), sum(1 for c in live if c.get("season_year") == season),
                 len(asked - confirmed), len(partial))


def _ts(v: Any) -> datetime:
    return datetime.fromisoformat(str(v).replace("Z", "+00:00"))


def queue(season: int | None = None, now: datetime | None = None, region: str | None = None) -> Queue:
    """Who to send the season update to. Unlike the listing email, no person has to check the
    camp first: the owner is the checker. Ready means on the site, next season not yet
    confirmed by the owner, an email to write to, no season link still working, and no answer
    in the last three weeks."""
    season = season or target_season()
    now = now or _now()
    sb = get_supabase()
    done = owner_confirmed(season)
    open_links, answered = {}, {}
    for r in sb.table("listing_confirmations").select("*").eq("kind", KIND).execute().data or []:
        if r.get("season_year") != season:
            continue
        if r["status"] == "sent" and _ts(r["expires_at"]) > now:
            open_links[str(r["camp_id"])] = _ts(r["expires_at"])
        if r["status"] == "answered" and r.get("responded_at"):
            answered[str(r["camp_id"])] = max(answered.get(str(r["camp_id"]), _ts(r["responded_at"])), _ts(r["responded_at"]))
    contacts: dict[str, list[dict[str, Any]]] = {}
    for c in sb.table("camp_contacts").select("*").execute().data or []:
        contacts.setdefault(str(c["camp_id"]), []).append(c)

    ready, waiting = [], []
    for camp in sorted(sb.table("camps").select("*").execute().data or [], key=lambda c: c["name"].lower()):
        cid = str(camp["id"])
        if camp.get("is_active") is False or cid in done:
            continue
        if region and (camp.get("region") or "") != region:
            continue
        people = sorted(contacts.get(cid, []), key=lambda r: (not r.get("is_primary"), r.get("verified_at") is None))
        email = ((people[0]["email"] if people else None) or camp.get("email") or "").strip().lower()
        if cid in open_links:
            waiting.append((camp, f"asked; link works until {open_links[cid]:%Y-%m-%d}"))
        elif cid in answered and now - answered[cid] < ASK_AGAIN_AFTER:
            waiting.append((camp, f"answered {answered[cid]:%Y-%m-%d} without {season} dates; ask again after "
                                  f"{answered[cid] + ASK_AGAIN_AFTER:%Y-%m-%d}"))
        elif "@" not in email:
            waiting.append((camp, "no email: add a contact or pass --to with send"))
        else:
            ready.append((camp, email))
    return Queue(ready, waiting)
