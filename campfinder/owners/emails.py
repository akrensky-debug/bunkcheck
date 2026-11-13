"""
Emails to camp owners. Signed as Bunkcheck, never as a person (docs/decisions/agents.md,
rule 1), and every one says how to reach a person: reply to it. Plain text and HTML.

Copy is a starting point for Andrew to edit; the facts table is what matters.
"""

from __future__ import annotations

import os
from datetime import date
from typing import Any

from campfinder.config import get_settings
from campfinder.mailer import Email

LABELS = {
    "name": "Name", "city": "Town", "state": "State", "camp_type": "Type", "age_min": "Youngest age",
    "age_max": "Oldest age", "grade_min": "Lowest grade", "grade_max": "Highest grade",
    "price_per_week": "Price per week", "website_url": "Website", "registration_url": "Registration page",
}


def _e(v: Any) -> str:
    return str(v).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _signature() -> str:
    return os.environ.get("OWNER_EMAIL_SIGNATURE", "Bunkcheck")


def _reply_to() -> str | None:
    return os.environ.get("OWNER_REPLY_TO") or None


def _site() -> str:
    return get_settings().frontend_url.rstrip("/")


def upcoming_season(today: date | None = None) -> int:
    today = today or date.today()
    return today.year + 1 if today.month >= 9 else today.year


def _fmt(field: str, value: Any) -> str:
    if field == "price_per_week" and value is not None:
        return f"${value}"
    if field == "camp_type" and value:
        return {"day": "Day camp", "sleepaway": "Sleepaway camp", "specialty": "Specialty program"}.get(value, value)
    return str(value)


def _rows(snapshot: dict[str, Any]) -> list[tuple[str, str]]:
    return [(LABELS[f], _fmt(f, v)) for f, v in snapshot["camp"].items() if v is not None and f in LABELS]


def _session_line(s: dict[str, Any]) -> str:
    when = f"{s['start_date']} to {s['end_date']}"
    price = s.get("price")
    if isinstance(price, float) and price.is_integer():
        price = int(price)
    bits = [b for b in (s.get("name"), when, f"${price}" if price is not None else None) if b]
    return " · ".join(bits)


def listing_confirmation(to: str, first_name: str | None, camp: dict[str, Any], snapshot: dict[str, Any],
                         token: str, waiting: int = 0) -> Email:
    page = f"{_site()}/owners/confirm/{token}"
    camp_url = f"{_site()}/camps/{camp['id']}"
    season = upcoming_season()
    rows, sessions = _rows(snapshot), snapshot["sessions"]
    old = camp.get("season_year") and int(camp["season_year"]) < season
    asked = (f" {waiting} {'family has' if waiting == 1 else 'families have'} asked us to tell them."
             if waiting else "")
    old_note = (f"The dates below are from your {camp['season_year']} season, which is what your website "
                f"shows now. Send {season} dates whenever you have them.") if old else ""

    text = "\n".join([
        f"Hi {first_name or 'there'},", "",
        f"Bunkcheck helps families plan the whole summer. We built a listing for {camp['name']} from "
        f"your website so parents near {camp.get('city') or 'you'} can find you. Here is what it says:", "",
        *[f"  {k}: {v}" for k, v in rows],
        *(["", "  Sessions:", *[f"    {_session_line(s)}" for s in sessions]] if sessions else []),
        *(["", old_note] if old_note else []), "",
        f"See the page: {camp_url}", "",
        "Is anything wrong? Reply to this email with the fix and a person will change it.",
        f"If it's all right, tell us here: {page}",
        f"When does {season} registration open? Reply and we'll let interested parents know.{asked}", "",
        "No login, no fee to be listed, nothing to install. If you'd rather not be listed, "
        f"take it down here: {page}", "",
        f"Thanks,\n{_signature()}",
    ])
    table = "".join(f"<tr><td style='padding:2px 12px 2px 0;color:#666'>{_e(k)}</td><td>{_e(v)}</td></tr>"
                    for k, v in rows)
    sess = ("<p><strong>Sessions</strong></p><ul>" + "".join(f"<li>{_e(_session_line(s))}</li>" for s in sessions)
            + "</ul>") if sessions else ""
    html = (
        f"<p>Hi {_e(first_name or 'there')},</p>"
        f"<p>Bunkcheck helps families plan the whole summer. We built a listing for "
        f"<strong>{_e(camp['name'])}</strong> from your website so parents near {_e(camp.get('city') or 'you')} "
        f"can find you. Here is what it says:</p>"
        f"<table>{table}</table>{sess}"
        + (f"<p>{_e(old_note)}</p>" if old_note else "")
        + f"<p><a href='{_e(camp_url)}'>See the page</a></p>"
        f"<p><strong>Is anything wrong?</strong> Reply to this email with the fix and a person will change it.<br>"
        f"<strong>All right?</strong> <a href='{_e(page)}'>Tell us it looks right</a>.<br>"
        f"<strong>When does {season} registration open?</strong> Reply and we'll let interested parents "
        f"know.{_e(asked)}</p>"
        f"<p style='color:#666'>No login, no fee to be listed, nothing to install. If you'd rather not be "
        f"listed, <a href='{_e(page)}'>take it down here</a>.</p>"
        f"<p>Thanks,<br>{_e(_signature())}</p>"
    )
    return Email(to=to, subject=f"Your camp's {season} listing on Bunkcheck: is it right?",
                 html=html, text=text, reply_to=_reply_to())


def listing_confirmed(to: str, camp_name: str) -> Email:
    text = (f"Thank you. {camp_name}'s page now shows \"confirmed by the camp\" with today's date.\n\n"
            "If anything changes (a week fills up, a new session, a new price), reply to any email from us "
            f"and a person will update it.\n\nThanks,\n{_signature()}")
    html = (f"<p>Thank you. <strong>{_e(camp_name)}</strong>'s page now shows \"confirmed by the camp\" with "
            f"today's date.</p><p>If anything changes (a week fills up, a new session, a new price), reply to "
            f"any email from us and a person will update it.</p><p>Thanks,<br>{_e(_signature())}</p>")
    return Email(to=to, subject=f"Confirmed: {camp_name}", html=html, text=text, reply_to=_reply_to())


def listing_removed(to: str, camp_name: str) -> Email:
    text = (f"{camp_name} is off Bunkcheck. Parents won't see it in search or on our pages.\n\n"
            "If that was a mistake, reply to this email and a person will put it back.\n\n"
            f"Thanks,\n{_signature()}")
    html = (f"<p><strong>{_e(camp_name)}</strong> is off Bunkcheck. Parents won't see it in search or on our "
            f"pages.</p><p>If that was a mistake, reply to this email and a person will put it back.</p>"
            f"<p>Thanks,<br>{_e(_signature())}</p>")
    return Email(to=to, subject=f"Removed: {camp_name}", html=html, text=text, reply_to=_reply_to())


def _state(v: dict[str, Any]) -> str:
    left = v.get("spots_available")
    if v.get("availability") == "full":
        return "full"
    if left is not None:
        return f"open, {left} spot{'' if left == 1 else 's'} left"
    return v.get("availability") or "unknown"


def listing_updated(to: str, camp: dict[str, Any], changes: list[dict[str, Any]],
                    sessions: list[dict[str, Any]]) -> Email:
    """'Here is what changed, reply if wrong.' Shows each change in full, before and after, and
    every session as it now stands, because some owners will read this with their own AI."""
    camp_url = f"{_site()}/camps/{camp.get('slug') or camp['id']}"
    changed = [(c["session"], _state(c["before"]), _state(c["after"]), c["quote"]) for c in changes]
    now = [(_session_line(s), _state(s)) for s in sessions]
    text = "\n".join([
        "Hi,", "",
        f"We updated {camp['name']}'s listing from your email:", "",
        *[f"  {name}: {before} -> {after}   (you wrote: \"{quote}\")" for name, before, after, quote in changed], "",
        "Every session now shows:",
        *[f"  {line}: {state}" for line, state in now], "",
        f"See the page: {camp_url}", "",
        "Is anything wrong? Reply to this email and a person will fix it.", "",
        f"Thanks,\n{_signature()}",
    ])
    html = (
        f"<p>Hi,</p><p>We updated <strong>{_e(camp['name'])}</strong>'s listing from your email:</p><ul>"
        + "".join(f"<li><strong>{_e(n)}</strong>: {_e(b)} &rarr; <strong>{_e(a)}</strong> "
                  f"<span style='color:#666'>(you wrote: &ldquo;{_e(q)}&rdquo;)</span></li>" for n, b, a, q in changed)
        + "</ul><p><strong>Every session now shows</strong></p><ul>"
        + "".join(f"<li>{_e(line)}: {_e(state)}</li>" for line, state in now)
        + f"</ul><p><a href='{_e(camp_url)}'>See the page</a></p>"
        f"<p><strong>Is anything wrong?</strong> Reply to this email and a person will fix it.</p>"
        f"<p>Thanks,<br>{_e(_signature())}</p>"
    )
    return Email(to=to, subject=f"Updated: {camp['name']}", html=html, text=text, reply_to=_reply_to())


# ---------------------------------------------------------------------------
# The season update: "send us 2027"
# ---------------------------------------------------------------------------

def _day(d: date) -> str:
    return f"{d:%a %b} {d.day}"


def _nice_session(s: dict[str, Any]) -> str:
    """'Week 1: Mon Jun 29 to Fri Jul 3, 2026, $325'."""
    start, end = date.fromisoformat(str(s["start_date"])[:10]), date.fromisoformat(str(s["end_date"])[:10])
    price = s.get("price")
    cost = f", ${float(price):,.0f}" if price is not None else ""
    when = f"{_day(start)} to {_day(end)}, {end.year}{cost}"
    return f"{s['name']}: {when}" if s.get("name") else when


def season_update_request(to: str, first_name: str | None, camp: dict[str, Any], snapshot: dict[str, Any],
                          token: str, season: int, waiting: int = 0) -> Email:
    """The 'your {season} update' email. Shows what we have, labeled with the season it's from,
    and asks for three facts. The form is one way to answer; a reply in plain words is the other."""
    page = f"{_site()}/owners/update/{token}"
    shown = camp.get("season_year")
    label = f"your {shown} season" if shown else "your listing"
    rows = [(k, v) for k, v in _rows(snapshot) if k != LABELS["price_per_week"]]
    price = snapshot["camp"].get("price_per_week")
    if price is not None:
        rows.append((f"Price per week{f' ({shown})' if shown else ''}", f"${price}"))
    sessions = [_nice_session(s) for s in snapshot["sessions"]]
    asked = (f"{waiting} {'family has' if waiting == 1 else 'families have'} asked us to email them "
             f"the day your registration opens.") if waiting else ""
    if shown and int(shown) >= season:
        opener = (f"Parents are planning summer {season}. Bunkcheck shows {season} dates for {camp['name']} "
                  f"that we read on your website. Can you check them and fill in what's missing?")
    else:
        opener = (f"Parents are planning summer {season}, and Bunkcheck still shows {camp['name']}'s "
                  f"{shown or 'last'} season. Can you send us {season}?")
    asks = [f"Your {season} session dates", f"Your {season} price per week",
            f"The day {season} registration opens"]
    example = f"Same weeks as last year, $295 a week, registration opens January 15."

    text = "\n".join([
        f"Hi {first_name or 'there'},", "",
        opener, "",
        *[f"  {i}. {a}" for i, a in enumerate(asks, 1)], "",
        f"The form takes about two minutes. It starts with last year's weeks moved to {season}, so you may "
        f"only need to check them: {page}", "",
        f"Or reply to this email in your own words, for example: \"{example}\"", "",
        "Not decided yet? Send what you have." + (f" {asked}" if asked else ""), "",
        f"What we show now, from {label}:", "",
        *[f"  {k}: {v}" for k, v in rows],
        *(["", "  Sessions:", *[f"    {line}" for line in sessions]] if sessions else []), "",
        "What you send goes on your page as confirmed by the camp, with the date. We'll email you back "
        "exactly what changed, and a person reads every reply.", "",
        "No login, no fee to be listed. If you'd rather not be listed, reply and say so.", "",
        f"Thanks,\n{_signature()}",
    ])
    table = "".join(f"<tr><td style='padding:2px 12px 2px 0;color:#666'>{_e(k)}</td><td>{_e(v)}</td></tr>"
                    for k, v in rows)
    sess = ("<p style='margin-bottom:4px'><strong>Sessions</strong></p><ul style='margin-top:0'>"
            + "".join(f"<li>{_e(s)}</li>" for s in sessions) + "</ul>") if sessions else ""
    html = (
        f"<p>Hi {_e(first_name or 'there')},</p>"
        f"<p>{_e(opener)}</p>"
        "<ol>" + "".join(f"<li>{_e(a)}</li>" for a in asks) + "</ol>"
        f"<p><a href='{_e(page)}' style='display:inline-block;padding:10px 18px;background:#1f3d2b;color:#fff;"
        f"text-decoration:none;border-radius:6px'>Send {season} on the form</a></p>"
        f"<p>It takes about two minutes and starts with last year's weeks moved to {season}, so you may only "
        f"need to check them.</p>"
        f"<p>Or reply to this email in your own words, for example: &ldquo;{_e(example)}&rdquo;</p>"
        f"<p>Not decided yet? Send what you have.{(' ' + _e(asked)) if asked else ''}</p>"
        f"<p style='margin-bottom:4px'><strong>What we show now, from {_e(label)}</strong></p>"
        f"<table>{table}</table>{sess}"
        "<p>What you send goes on your page as confirmed by the camp, with the date. We'll email you back "
        "exactly what changed, and a person reads every reply.</p>"
        "<p style='color:#666'>No login, no fee to be listed. If you'd rather not be listed, reply and say so.</p>"
        f"<p>Thanks,<br>{_e(_signature())}</p>"
    )
    return Email(to=to, subject=f"{camp['name']}: your {season} dates, price and registration day",
                 html=html, text=text, reply_to=_reply_to())


def season_updated(to: str, camp: dict[str, Any], season: int, applied: dict[str, Any],
                   question: dict[str, Any] | None = None, availability: list[dict[str, Any]] | None = None) -> Email:
    """'Here is what changed, reply if wrong.' Every change in full, before and after, and the
    listing as it now stands, because some owners will read this with their own AI. With a
    question: the dates "same weeks as last year" would mean, for the owner to check."""
    camp_url = f"{_site()}/camps/{camp.get('slug') or camp['id']}"

    def lines(v: Any) -> list[str]:
        if v is None:
            return ["(nothing)"]
        return [str(x) for x in v] if isinstance(v, list) else [str(v)]

    words = {"dates": f"{season} dates", "price": f"{season} price", "registration": "the registration day"}
    not_set = [words[n] for n in applied.get("not_set") or []]
    text_parts, html_parts = [], []
    for c in applied["changes"]:
        said = f"   (you wrote: \"{c['quote']}\")" if c.get("quote") else ""
        text_parts.append(f"{c['what']}{said}\n  Before:\n" + "\n".join(f"    {x}" for x in lines(c["before"]))
                          + "\n  Now:\n" + "\n".join(f"    {x}" for x in lines(c["after"])))
        html_parts.append(
            f"<p style='margin-bottom:4px'><strong>{_e(c['what'])}</strong>"
            + (f" <span style='color:#666'>(you wrote: &ldquo;{_e(c['quote'])}&rdquo;)</span>" if c.get("quote") else "")
            + "</p><table><tr><td style='vertical-align:top;padding-right:12px;color:#666'>Before</td><td>"
            + "<br>".join(_e(x) for x in lines(c["before"])) + "</td></tr><tr><td style='vertical-align:top;"
            "padding-right:12px;color:#666'>Now</td><td><strong>" + "<br>".join(_e(x) for x in lines(c["after"]))
            + "</strong></td></tr></table>")
    now = [f"Sessions: {'none listed' if not applied['sessions_now'] else ''}",
           *[f"  {s}" for s in applied["sessions_now"]],
           f"Price per week: {applied.get('price_now') or 'not listed'}",
           f"Registration opens: {applied.get('registration_now') or 'not listed yet'}"]
    tail = []
    if not_set:
        tail.append(f"You said {_and(not_set)} {'isn' if len(not_set) == 1 else 'aren'}'t set yet. Reply when "
                    f"{'it is' if len(not_set) == 1 else 'they are'} and we'll add {'it' if len(not_set) == 1 else 'them'}.")
    tail += applied.get("skipped") or []
    if applied.get("camp_verified"):
        tail.append("Your page now shows \"confirmed by the camp\" with today's date.")

    for c in availability or []:
        said = f"   (you wrote: \"{c['quote']}\")" if c.get("quote") else ""
        text_parts.append(f"{c['session']}: {_state(c['before'])} -> {_state(c['after'])}{said}")
        html_parts.append(f"<p><strong>{_e(c['session'])}</strong>: {_e(_state(c['before']))} &rarr; "
                          f"<strong>{_e(_state(c['after']))}</strong></p>")
    changed = applied["changes"] or availability
    if question:
        ask_text = [f"One question about your {season} dates. You wrote: \"{question.get('quote') or 'same as last year'}\". "
                    f"{question['why']} Here is what last year's weeks moved to the same weekdays in {season} would be:",
                    *[f"  {x}" for x in question["lines"]], *[f"  Note: {n}" for n in question.get("notes") or []],
                    "Reply \"yes\" if these are right, or send the right dates. We haven't put them on your listing yet."]
    intro = (f"We updated {camp['name']}'s listing from what you sent:" if changed
             else f"Thanks for your reply about {camp['name']}.")
    text = "\n".join([
        "Hi,", "", intro, "", *(["\n\n".join(text_parts), ""] if text_parts else []),
        *([*ask_text, ""] if question else []),
        "Your listing now shows:", *[f"  {x}" for x in now], "",
        *([*tail, ""] if tail else []),
        f"See the page: {camp_url}", "",
        "Is anything wrong? Reply to this email and a person will fix it.", "",
        f"Thanks,\n{_signature()}",
    ])
    html = (
        f"<p>Hi,</p><p>{_e(intro)}</p>" + "".join(html_parts)
        + ((f"<p><strong>One question about your {season} dates.</strong> You wrote: &ldquo;"
            f"{_e(question.get('quote') or 'same as last year')}&rdquo;. {_e(question['why'])} Here is what last "
            f"year's weeks moved to the same weekdays in {season} would be:</p><ul>"
            + "".join(f"<li>{_e(x)}</li>" for x in question["lines"]) + "</ul>"
            + "".join(f"<p style='color:#8a5a00'>{_e(n)}</p>" for n in question.get("notes") or [])
            + "<p>Reply &ldquo;yes&rdquo; if these are right, or send the right dates. We haven't put them on "
              "your listing yet.</p>") if question else "")
        + "<p style='margin-bottom:4px'><strong>Your listing now shows</strong></p><ul style='margin-top:0'>"
        + "".join(f"<li>{_e(x.strip())}</li>" for x in now if x.strip()) + "</ul>"
        + "".join(f"<p>{_e(t)}</p>" for t in tail)
        + f"<p><a href='{_e(camp_url)}'>See the page</a></p>"
        "<p><strong>Is anything wrong?</strong> Reply to this email and a person will fix it.</p>"
        f"<p>Thanks,<br>{_e(_signature())}</p>"
    )
    subject = (f"One question about your {season} dates: {camp['name']}" if question
               else f"Updated for {season}: {camp['name']}")
    return Email(to=to, subject=subject, html=html, text=text, reply_to=_reply_to())


def _and(items: list[str]) -> str:
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]
