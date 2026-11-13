"""Registration opening dates from each camp's own site, into registration_windows.

data/registration/windows.json holds one row per camp and season:

    {"slug": "...", "season": 2027, "opens": "2026-12-01", "time": "10:00" | null,
     "opens_for": "everyone" | "new families" | ..., "early_window": "..." | null,
     "closes": "2027-01-31" | null, "url": "...", "quote": "...", "checked": "2026-11-13",
     "verified_by": null | "Andrew Krensky", "verified_on": null | "2026-11-14",
     "note": null | "anything a person should know"}

"url" is the camp's own page and "quote" its exact words. Every row loads, but only rows a
person verified (verified_by and verified_on set) load as verified, and only a verified row
shows on the camp page or sends a parent alert (docs/registration-alerts.md). An unverified
date still shows to the camp's owner in the confirmation email as "(not checked)", so the
owner can confirm it.

Ids are uuid5 of the slug and season, so loading again updates the same rows. A date the
owner confirmed (notes start "From the owner") is never overwritten, and a camp that already
has another camp-wide window for the season is left alone.

    python -m campfinder.seed.registration_windows --check
    python -m campfinder.seed.registration_windows --sql migrations/NNNN_registration_windows.sql
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
from datetime import date, datetime, time
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from campfinder.seed.import_real import DATA_DIR, _lit, camp_id, load_dataset

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "registration" / "windows.json"
NAMESPACE = uuid.UUID("0b6f4c2e-3d1a-4e8b-9a77-2f5c8d0e6a41")
TZ = ZoneInfo("America/New_York")  # every camp we list is in New England
OWNER_NOTE = "From the owner%"
NOT_A_PERSON = {"claude", "bunkcheckbot", "bot"}


def window_id(slug: str, season: int) -> str:
    return str(uuid.uuid5(NAMESPACE, f"{slug}#registration#{season}"))


def load_windows(path: Path = DATA_FILE) -> list[dict[str, Any]]:
    return json.loads(path.read_text())["windows"]


def _date(v: Any) -> date | None:
    try:
        return date.fromisoformat(v) if isinstance(v, str) else None
    except ValueError:
        return None


def validate(rows: list[dict[str, Any]], live_slugs: set[str]) -> list[str]:
    errors, seen = [], set()
    for i, r in enumerate(rows):
        where = f"window {i} ({r.get('slug')})"
        if r.get("slug") not in live_slugs:
            errors.append(f"{where}: no published camp with this slug")
        season = r.get("season")
        if not isinstance(season, int):
            errors.append(f"{where}: season must be a year")
        elif (r.get("slug"), season) in seen:
            errors.append(f"{where}: two rows for the same camp and season")
        seen.add((r.get("slug"), season))
        opens = _date(r.get("opens"))
        if not opens:
            errors.append(f"{where}: opens must be YYYY-MM-DD")
        elif isinstance(season, int) and not date(season - 1, 7, 1) <= opens < date(season, 9, 1):
            # The window the owner flow looks for: July of the year before through the summer.
            errors.append(f"{where}: opens {opens} is outside the {season} registration season")
        if r.get("time") is not None and not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", str(r["time"])):
            errors.append(f"{where}: time must be HH:MM (24 hour) or null")
        if r.get("closes") is not None and (not _date(r["closes"]) or (opens and _date(r["closes"]) < opens)):
            errors.append(f"{where}: closes must be a date on or after opens")
        if not str(r.get("url") or "").startswith("http"):
            errors.append(f"{where}: needs the url of the camp's page that gives the date")
        if not (r.get("quote") or "").strip():
            errors.append(f"{where}: needs the page's own words in quote")
        if not _date(r.get("checked")):
            errors.append(f"{where}: needs checked (YYYY-MM-DD)")
        by, on = r.get("verified_by"), r.get("verified_on")
        if bool(by) != bool(on):
            errors.append(f"{where}: verified_by and verified_on go together")
        if by and str(by).strip().lower() in NOT_A_PERSON:
            errors.append(f"{where}: verified_by must be a person")
        if on and not _date(on):
            errors.append(f"{where}: verified_on must be YYYY-MM-DD")
    return errors


def opens_at(r: dict[str, Any]) -> datetime:
    """Local time at the camp. No time given: the start of that day, which alert emails show as
    the day alone (the same rule as owner confirmation)."""
    t = time.fromisoformat(r["time"]) if r.get("time") else time(0, 0)
    return datetime.combine(date.fromisoformat(r["opens"]), t, tzinfo=TZ)


def notes(r: dict[str, Any]) -> str:
    parts = [f"From the camp's site, checked {r['checked']}: \"{r['quote'].strip()}\""]
    if r.get("opens_for") and r["opens_for"] != "everyone":
        parts.append(f"date is for {r['opens_for']}")
    if r.get("early_window"):
        parts.append(f"earlier: {r['early_window']}")
    if not r.get("time"):
        parts.append("day only, no time given")
    if r.get("note"):
        parts.append(r["note"].strip().rstrip("."))
    if r.get("verified_by"):
        parts.append(f"verified by {r['verified_by']} on {r['verified_on']}")
    return "; ".join(parts)


def build_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{
        "id": window_id(r["slug"], r["season"]),
        "camp_id": camp_id(r["slug"]),
        "season": r["season"],
        "opens_at": opens_at(r).isoformat(),
        "closes_at": datetime.combine(date.fromisoformat(r["closes"]), time(23, 59), tzinfo=TZ).isoformat()
        if r.get("closes") else None,
        "source_url": r["url"],
        "verified": bool(r.get("verified_by")),
        "notes": notes(r),
    } for r in rows]


def to_sql(windows: list[dict[str, Any]]) -> list[str]:
    """One statement per window, so a camp missing from a database skips only its own row."""
    out = []
    for w in windows:
        s = w["season"]
        lo, hi = f"{s - 1}-07-01T00:00:00+00:00", f"{s}-09-01T00:00:00+00:00"
        out.append(
            "INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)\n"
            f"SELECT {_lit(w['id'])}::uuid, {_lit(w['camp_id'])}::uuid, NULL, {_lit(w['opens_at'])}::timestamptz, "
            f"{_lit(w['closes_at'])}::timestamptz, {_lit(w['source_url'])}, {_lit(w['verified'])}, {_lit(w['notes'])}, now()\n"
            f"WHERE EXISTS (SELECT 1 FROM camps WHERE id = {_lit(w['camp_id'])}::uuid)\n"
            f"  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = {_lit(w['camp_id'])}::uuid\n"
            f"      AND o.session_id IS NULL AND o.id <> {_lit(w['id'])}::uuid\n"
            f"      AND o.opens_at >= {_lit(lo)}::timestamptz AND o.opens_at < {_lit(hi)}::timestamptz)\n"
            "ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,\n"
            "  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()\n"
            f"  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE {_lit(OWNER_NOTE)};"
        )
    return out


def live_slugs() -> set[str]:
    return {c["slug"] for _, c in load_dataset(DATA_DIR)}


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m campfinder.seed.registration_windows", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--data", type=Path, default=DATA_FILE)
    p.add_argument("--check", action="store_true", help="validate and summarise")
    p.add_argument("--sql", type=Path, help="write the upsert SQL (a migration) to this file")
    args = p.parse_args(argv)

    rows = load_windows(args.data)
    errors = validate(rows, live_slugs())
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    verified = sum(1 for r in rows if r.get("verified_by"))
    print(f"{len(rows)} windows: {verified} verified, {len(rows) - verified} waiting for a person's check")
    if args.sql:
        header = (f"-- Registration opening dates from each camp's own site ({len(rows)} camps, {verified} verified\n"
                  "-- by a person). Generated from data/registration/windows.json by\n"
                  "-- campfinder.seed.registration_windows. Safe to run again: owner-confirmed dates and\n"
                  "-- camps with another window for the season are left alone.\n\n")
        args.sql.write_text(header + "\n\n".join(to_sql(build_rows(rows))) + "\n")
        print(f"Wrote {args.sql}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
