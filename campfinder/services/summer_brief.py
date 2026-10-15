"""
The summer brief: what we know about a family's summer, where each fact came from, and the one
question worth asking next (docs/summer-board.md).

The brief is the family profile (`families.profile`) plus a `brief` key:

    {"facts":    {field: {"source": "said" | "looked_up" | "guessed", "at": iso}},
     "skipped":  {field: iso},    # "Skip for now": waits in the Finish later list
     "not_sure": {field: iso}}    # "Not sure yet": comes back when it matters

The question cards, the assistant and anything later all go through this module, so they ask
the same question and never ask twice.
"""

from __future__ import annotations

import copy
from collections import Counter
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Iterable, Literal

from campfinder.database import get_supabase
from campfinder.models.brief import Brief, BriefField, BriefUpdate, Chip, LaterItem, Question, Source
from campfinder.models.coverage import WorkBlock
from campfinder.services.coverage import care_windows
from campfinder.services.errors import NotFound
from campfinder.services.school_calendars import find_school

Context = Literal["suggestions", "prices"]

# Asked in this order, one at a time. Constraints come before content.
CORE: tuple[BriefField, ...] = ("kids", "home", "school", "sorted_weeks", "care_hours", "interests")
# Asked only once the core is done, and only when they matter.
LATER: tuple[BriefField, ...] = ("weekly_budget", "max_drive_minutes", "sleepaway", "booked_elsewhere")

# A "not sure yet" comes back only when this holds: the season (registration, January to March)
# or something on screen (suggestions or prices).
RETURNS_WHEN: dict[BriefField, str] = {
    "kids": "suggestions", "home": "suggestions", "school": "season", "sorted_weeks": "season", "care_hours": "suggestions",
    "interests": "suggestions", "weekly_budget": "prices", "max_drive_minutes": "suggestions",
    "sleepaway": "season", "booked_elsewhere": "season",
}

# Profile keys and the brief field they answer.
KEY_FIELD: dict[str, BriefField] = {
    "home_location": "home", "school": "school", "summer_start": "school", "summer_end": "school", "away": "sorted_weeks",
    "work_schedule": "care_hours", "weekly_budget": "weekly_budget", "max_drive_minutes": "max_drive_minutes",
    "sleepaway": "sleepaway", "booked_elsewhere": "booked_elsewhere",
}

GUESS_SUMMER = ((6, 18), (8, 31))  # month, day: a typical Rhode Island summer break
GUESS_WORK = [{"parent": "Parents", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "start": "8:00", "end": "18:00"}]


def summer_year(today: date) -> int:
    """The summer being planned: this year until July, then next year."""
    return today.year if today.month < 7 else today.year + 1


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _meta(profile: dict[str, Any]) -> dict[str, dict[str, Any]]:
    meta = profile.setdefault("brief", {})
    for k in ("facts", "skipped", "not_sure"):
        meta.setdefault(k, {})
    return meta


def _kids(profile: dict[str, Any]) -> list[dict[str, Any]]:
    return profile.get("kids") or []


# ---------------------------------------------------------------------------
# What's known
# ---------------------------------------------------------------------------

def answered(profile: dict[str, Any], field: BriefField) -> bool:
    """The parent told us (or we looked it up). Guesses don't count."""
    if field == "school" and profile.get("school"):
        return True  # the dates may be guessed, but the question was answered
    fact = (profile.get("brief") or {}).get("facts", {}).get(field)
    if fact:
        return fact["source"] != "guessed"
    # Profiles saved before the brief existed: a value that's there was said.
    kids = _kids(profile)
    if field == "kids":
        return any(k.get("age") is not None for k in kids)
    if field == "school":
        return bool(profile.get("summer_start") and profile.get("summer_end"))
    if field == "home":
        return bool(profile.get("home_location"))
    if field == "sorted_weeks":
        return "away" in profile
    if field == "care_hours":
        return bool(profile.get("work_schedule"))
    if field == "interests":
        return bool(kids) and all(k.get("interests") for k in kids)
    return profile.get(field) is not None


def _set_fact(profile: dict[str, Any], field: BriefField, source: Source) -> None:
    meta = _meta(profile)
    meta["facts"][field] = {"source": source, "at": _now()}
    if source != "guessed":
        meta["skipped"].pop(field, None)
        meta["not_sure"].pop(field, None)


def _guess(profile: dict[str, Any], field: BriefField, today: date) -> None:
    """Fill a default the board can work with, marked as a guess. Never overwrites a value."""
    if field == "school" and not (profile.get("summer_start") and profile.get("summer_end")):
        y = summer_year(today)
        (sm, sd), (em, ed) = GUESS_SUMMER
        profile["summer_start"] = profile.get("summer_start") or date(y, sm, sd).isoformat()
        profile["summer_end"] = profile.get("summer_end") or date(y, em, ed).isoformat()
        _set_fact(profile, "school", "guessed")
    elif field == "care_hours" and not profile.get("work_schedule"):
        profile["work_schedule"] = [dict(b) for b in GUESS_WORK]
        _set_fact(profile, "care_hours", "guessed")


# ---------------------------------------------------------------------------
# Changing it
# ---------------------------------------------------------------------------

def apply_update(profile: dict[str, Any], data: dict[str, Any], source: Source, today: date) -> dict[str, Any]:
    """Merge facts into the profile and note where each came from. Only keys in `data` change."""
    profile = copy.deepcopy(profile)
    profile.update(data)
    fields: set[BriefField] = {KEY_FIELD[k] for k in data if k in KEY_FIELD}
    kids = data.get("kids")
    if kids is not None:
        if any(k.get("age") is not None for k in kids):
            fields.add("kids")
        if any(k.get("interests") for k in kids):
            fields.add("interests")

    if "school" in fields and data.get("school") and not ("summer_start" in data and "summer_end" in data):
        cal = find_school(data["school"], summer_year(today))
        if cal:
            profile["summer_start"] = (cal.last_day + timedelta(days=1)).isoformat()
            profile["summer_end"] = (
                (cal.first_day - timedelta(days=1)).isoformat() if cal.first_day
                else date(cal.last_day.year, *GUESS_SUMMER[1]).isoformat()
            )
            _set_fact(profile, "school", "looked_up" if cal.first_day else "guessed")
        elif not (profile.get("summer_start") and profile.get("summer_end")) or (
            (profile.get("brief") or {}).get("facts", {}).get("school", {}).get("source") == "guessed"
        ):
            # Unknown school: replace guessed dates with fresh ones, keep dates the parent gave.
            profile.pop("summer_start", None)
            profile.pop("summer_end", None)
            _guess(profile, "school", today)
        _meta(profile)["skipped"].pop("school", None)
        _meta(profile)["not_sure"].pop("school", None)
        fields.discard("school")

    for f in fields:
        _set_fact(profile, f, source)
    return profile


def apply_skip(profile: dict[str, Any], field: BriefField, today: date, *, not_sure: bool = False) -> dict[str, Any]:
    """"Skip for now" or "Not sure yet": move on, and give the board a default to work with."""
    profile = copy.deepcopy(profile)
    meta = _meta(profile)
    keep, drop = ("not_sure", "skipped") if not_sure else ("skipped", "not_sure")
    meta[keep][field] = _now()
    meta[drop].pop(field, None)
    _guess(profile, field, today)
    return profile


# ---------------------------------------------------------------------------
# What to ask
# ---------------------------------------------------------------------------

def _names(kids: list[dict[str, Any]]) -> str:
    names = [k["name"] for k in kids if k.get("name")]
    if not names:
        return "your kids" if len(kids) > 1 else "your kid"
    return names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]


def _question(profile: dict[str, Any], field: BriefField, returning: bool = False) -> Question:
    kids = _kids(profile)
    names = _names(kids)
    older = [k for k in kids if (k.get("age") or 0) >= 9]
    text: dict[BriefField, tuple[str, str | None]] = {
        "kids": ("Who's going to camp?", "First names and ages."),
        "home": ("What town are you in?", "So we suggest camps near you."),
        "school": ("Which school do they go to?", "We'll use it to find the last day of school."),
        "sorted_weeks": ("Any weeks already sorted?", "Vacations, time with family, or a camp you've already booked."),
        "care_hours": ("Roughly when do you need care?", "For example: both of us work about 8 to 6."),
        "interests": (f"What {'is' if len(kids) == 1 else 'are'} {names} into?", None),
        "weekly_budget": ("About how much a week, per kid?", "So the camps we suggest fit. Change it any time."),
        "max_drive_minutes": ("How far are you happy to drive?", "One way, most days."),
        "sleepaway": (f"Is sleepaway camp an option for {_names(older)}?", None),
        "booked_elsewhere": ("Anything already booked outside Bunkcheck?", "So we don't suggest camps for those weeks."),
    }
    prompt, help_ = text[field]
    return Question(field=field, prompt=prompt, help=help_, returning=returning)


def _holds(when: str, today: date, context: set[str]) -> bool:
    return today.month in (1, 2, 3) if when == "season" else when in context


def _later_matters(profile: dict[str, Any], field: BriefField, today: date, context: set[str]) -> bool:
    if field == "weekly_budget":
        return "prices" in context
    if field == "max_drive_minutes":
        return "suggestions" in context
    if field == "sleepaway":
        return any((k.get("age") or 0) >= 9 for k in _kids(profile))
    return today.month in (1, 2, 3)  # booked_elsewhere: registration season


def next_question(profile: dict[str, Any], today: date, context: Iterable[Context] = ()) -> Question | None:
    ctx = set(context)
    meta = profile.get("brief") or {}
    skipped, not_sure = meta.get("skipped", {}), meta.get("not_sure", {})

    def fresh(f: BriefField) -> bool:
        return not answered(profile, f) and f not in skipped and f not in not_sure

    def back(f: BriefField) -> bool:
        return not answered(profile, f) and f in not_sure and _holds(RETURNS_WHEN[f], today, ctx)

    for f in CORE:
        if fresh(f):
            return _question(profile, f)
    for f in CORE:
        if back(f):
            return _question(profile, f, returning=True)
    for f in LATER:
        if fresh(f) and _later_matters(profile, f, today, ctx):
            return _question(profile, f)
    for f in LATER:
        if back(f) and _later_matters(profile, f, today, ctx):
            return _question(profile, f, returning=True)
    return None


# ---------------------------------------------------------------------------
# Chips
# ---------------------------------------------------------------------------

def _hour(t: time) -> str:
    h = t.hour % 12 or 12
    return f"{h}" if t.minute == 0 else f"{h}:{t.minute:02d}"


def _day(d: str) -> str:
    return date.fromisoformat(d).strftime("%b %-d")


def _care_label(work: list[dict[str, Any]]) -> str:
    try:
        windows = care_windows([WorkBlock.model_validate(b) for b in work])
    except ValueError:
        return "Care hours saved"
    spans = Counter(w for w in windows.values() if w)
    if not spans:
        return "Someone's home on workdays"
    (start, end), _ = spans.most_common(1)[0]
    return f"Care about {_hour(start)} to {_hour(end)}"


def chips(profile: dict[str, Any]) -> list[Chip]:
    facts = (profile.get("brief") or {}).get("facts", {})

    def source(f: BriefField) -> Source:
        return facts.get(f, {}).get("source", "said")

    def known(f: BriefField) -> bool:
        return answered(profile, f) or f in facts

    out: list[Chip] = []
    if known("kids"):
        for k in _kids(profile):
            name = k.get("name") or "Your kid"
            out.append(Chip(field="kids", label=f"{name}, {k['age']}" if k.get("age") is not None else name,
                            source=source("kids")))
    if known("home") and profile.get("home_location"):
        out.append(Chip(field="home", label=profile["home_location"], source=source("home")))
    if known("school") and profile.get("summer_start") and profile.get("summer_end"):
        dates = f"{_day(profile['summer_start'])} to {_day(profile['summer_end'])}"
        label = f"{profile['school']} · {dates}" if profile.get("school") else f"Summer {dates}"
        out.append(Chip(field="school", label=label, source=source("school")))
    if known("sorted_weeks"):
        away = [a.get("label") or "Away" for a in profile.get("away") or []]
        label = "Nothing sorted yet" if not away else "Away: " + ", ".join(away[:2]) + (" +" if len(away) > 2 else "")
        out.append(Chip(field="sorted_weeks", label=label, source=source("sorted_weeks")))
    if known("care_hours") and profile.get("work_schedule"):
        out.append(Chip(field="care_hours", label=_care_label(profile["work_schedule"]), source=source("care_hours")))
    if known("interests"):
        parts = [f"{k.get('name') or 'Kid'}: {', '.join(k['interests'][:3])}" for k in _kids(profile) if k.get("interests")]
        if parts:
            out.append(Chip(field="interests", label=" · ".join(parts), source=source("interests")))
    if known("weekly_budget") and profile.get("weekly_budget") is not None:
        out.append(Chip(field="weekly_budget", label=f"Up to ${profile['weekly_budget']:,.0f} a week",
                        source=source("weekly_budget")))
    if known("max_drive_minutes") and profile.get("max_drive_minutes") is not None:
        out.append(Chip(field="max_drive_minutes", label=f"Up to {profile['max_drive_minutes']} min drive",
                        source=source("max_drive_minutes")))
    if known("sleepaway") and profile.get("sleepaway") is not None:
        out.append(Chip(field="sleepaway", label="Sleepaway OK" if profile["sleepaway"] else "Day camp only",
                        source=source("sleepaway")))
    if known("booked_elsewhere") and profile.get("booked_elsewhere") is not None:
        out.append(Chip(field="booked_elsewhere",
                        label="Some weeks booked elsewhere" if profile["booked_elsewhere"] else "Nothing booked elsewhere",
                        source=source("booked_elsewhere")))
    return out


def build_brief(profile: dict[str, Any], today: date, context: Iterable[Context] = ()) -> Brief:
    q = next_question(profile, today, context)
    meta = profile.get("brief") or {}
    later = [
        LaterItem(field=f, prompt=_question(profile, f).prompt, why=why)
        for f in CORE + LATER
        for why, bucket in (("skipped", meta.get("skipped", {})), ("not_sure", meta.get("not_sure", {})))
        if f in bucket and not answered(profile, f) and not (q and q.field == f)
    ]
    return Brief(chips=chips(profile), next_question=q, finish_later=later)


# ---------------------------------------------------------------------------
# Stored
# ---------------------------------------------------------------------------

def load_profile(family_id: str) -> dict[str, Any]:
    rows = get_supabase().table("families").select("profile").eq("id", str(family_id)).execute().data
    if not rows:
        raise NotFound("Family not found")
    return rows[0]["profile"] or {}


def _save(family_id: str, profile: dict[str, Any]) -> None:
    get_supabase().table("families").update({"profile": profile, "updated_at": _now()}).eq("id", str(family_id)).execute()


def get_brief(family_id: str, today: date | None = None, context: Iterable[Context] = ()) -> Brief:
    return build_brief(load_profile(family_id), today or date.today(), context)


def update_brief(
    family_id: str, update: BriefUpdate | dict[str, Any], source: Source = "said", today: date | None = None,
) -> dict[str, Any]:
    """Save facts and return the new profile."""
    data = update.model_dump(mode="json", exclude_unset=True) if isinstance(update, BriefUpdate) else update
    profile = apply_update(load_profile(family_id), data, source, today or date.today())
    _save(family_id, profile)
    return profile


def skip(family_id: str, field: BriefField, *, not_sure: bool = False, today: date | None = None) -> dict[str, Any]:
    profile = apply_skip(load_profile(family_id), field, today or date.today(), not_sure=not_sure)
    _save(family_id, profile)
    return profile
