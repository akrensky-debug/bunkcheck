"""
The Summer Board: each kid's summer, week by week (docs/summer-board.md).

It joins what the family already has (the summer brief, the calendar, tracked registrations)
with the shortlist in `plan_picks`, and reuses the coverage check for care hours and for camps
near home in open weeks. Chosen picks count as if they were on the calendar, so a 9 to 3 camp
against an 8 to 6 workday shows up before anything is booked.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from campfinder.database import get_supabase
from campfinder.models.board import MAX_IDEAS, Board, Cell, KidRow, Pick, PickCreate, PickUpdate, Week
from campfinder.services.coverage import check_coverage
from campfinder.services.errors import NotFound, ServiceError
from campfinder.services.season import is_last_season

PLANNED = {"chosen", "registered", "covered", "away"}


def monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _d(v: Any) -> date | None:
    return date.fromisoformat(str(v)[:10]) if v else None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _profile(family_id: str) -> dict[str, Any]:
    rows = get_supabase().table("families").select("profile").eq("id", family_id).execute().data
    if not rows:
        raise NotFound("Family not found")
    return rows[0].get("profile") or {}


def _by_id(table: str, columns: str, ids: set[str]) -> dict[str, dict[str, Any]]:
    if not ids:
        return {}
    rows = get_supabase().table(table).select(columns).in_("id", sorted(ids)).execute().data or []
    return {str(r["id"]): r for r in rows}


def _picks(family_id: str) -> list[Pick | Any]:
    rows = get_supabase().table("plan_picks").select("*").eq("family_id", family_id).order("created_at").execute().data or []
    camps = _by_id("camps", "id,name,city,price_per_week,camp_type,extended_care,season_year", {str(r["camp_id"]) for r in rows})
    sessions = _by_id("sessions", "id,start_date,end_date,price", {str(r["session_id"]) for r in rows if r.get("session_id")})
    out = []
    for r in rows:
        camp = camps.get(str(r["camp_id"]))
        if not camp:
            continue  # taken off the site
        s = sessions.get(str(r.get("session_id"))) if r.get("session_id") else None
        price = (s or {}).get("price") or camp.get("price_per_week")
        start = _d((s or {}).get("start_date"))
        out.append((r, Pick(
            id=r["id"], camp_id=r["camp_id"], session_id=r.get("session_id"), name=camp["name"], city=camp.get("city"),
            price_per_week=float(price) if price is not None else None,
            start_date=start, end_date=_d((s or {}).get("end_date")),
            last_season=is_last_season(start.year if start else camp.get("season_year")),
            state=r["state"], note=r.get("note"),
        )))
    return out


def _registrations(family_id: str) -> list[dict[str, Any]]:
    rows = (get_supabase().table("family_registrations").select("*").eq("family_id", family_id).execute().data or [])
    rows = [r for r in rows if r.get("status") in ("registered", "waitlisted") and r.get("session_id")]
    sessions = _by_id("sessions", "id,start_date,end_date,price", {str(r["session_id"]) for r in rows})
    camps = _by_id("camps", "id,name,price_per_week", {str(r["camp_id"]) for r in rows})
    out = []
    for r in rows:
        s = sessions.get(str(r["session_id"]))
        if not s:
            continue
        camp = camps.get(str(r["camp_id"]), {})
        price = s.get("price") or camp.get("price_per_week")
        out.append({**r, "start": _d(s["start_date"]), "end": _d(s["end_date"]), "name": camp.get("name") or "Camp",
                    "price": float(price) if price is not None else None})
    return out


async def build_board(family_id: str) -> Board:
    profile = _profile(family_id)
    kids = [k for k in profile.get("kids") or [] if k.get("name")]
    if not kids or not (profile.get("summer_start") and profile.get("summer_end")):
        return Board(ready=False, kids=[
            KidRow(name=k["name"], age=k.get("age"), planned=0, weeks_needed=0, cost=0, cells=[]) for k in kids
        ])

    picks = _picks(family_id)
    regs = _registrations(family_id)
    # Chosen picks count as booked for the hours check, without touching the calendar.
    extra = []
    for row, p in picks:
        if p.state != "chosen":
            continue
        week = _d(row["week_of"])
        dated = p.start_date and p.end_date and not p.last_season  # last season's dates stand in for the week
        extra.append({
            "title": p.name, "child_name": row["child_name"], "camp_id": str(p.camp_id),
            "start_date": (p.start_date if dated else week).isoformat(),
            "end_date": (p.end_date if dated else week + timedelta(days=4)).isoformat(),
        })
    coverage = await check_coverage(family_id, with_options=True, extra_events=extra)

    rows: list[KidRow] = []
    old_prices = False
    for kc in coverage.kids:
        cells: list[Cell] = []
        costed: set[str] = set()
        cost = 0.0
        for w in kc.weeks:
            mine = [p for row, p in picks if row["child_name"].lower() == kc.name.lower() and _d(row["week_of"]) == w.week_of]
            reg = next((r for r in regs if (r.get("child_name") or "").lower() in ("", kc.name.lower())
                        and r["start"] <= w.week_of + timedelta(days=4) and r["end"] >= w.week_of), None)
            chosen = next((p for p in mine if p.state == "chosen"), None)
            hours = {"covered": "ok", "check_hours": "check", "partial": "short"}.get(w.status)
            hours_note = (w.check_hours[0] if w.check_hours else
                          f"Not covered: {w.gaps[0].uncovered}" if w.status == "partial" and w.gaps else None)

            if reg:
                state, label = reg["status"], reg["name"]
                key = f"r{reg['id']}"
                if reg["status"] == "registered" and reg["price"] and key not in costed:
                    costed.add(key)
                    cost += reg["price"]
            elif chosen:
                state, label = "chosen", chosen.name
                key = f"p{chosen.session_id or chosen.id}"
                if chosen.price_per_week and key not in costed:
                    costed.add(key)
                    cost += chosen.price_per_week
                    old_prices = old_prices or chosen.last_season
            elif w.status in ("covered", "check_hours", "partial"):
                state, label = "covered", ", ".join(w.covered_by) or None
            elif w.status == "away":
                state, label, hours = "away", ", ".join(w.away) or "Away", None
            elif w.status == "not_needed":
                state, label, hours = "not_needed", None, None
            else:
                state, label, hours = ("ideas" if mine else "open"), None, None
            cells.append(Cell(
                week_of=w.week_of, state=state, label=label, hours=hours, hours_note=hours_note if hours else None,
                picks=mine, options=w.options if state in ("open", "ideas") else [],
            ))
        needed = [c for c in cells if c.state != "not_needed"]
        rows.append(KidRow(name=kc.name, age=kc.age, cells=cells, weeks_needed=len(needed),
                           planned=sum(c.state in PLANNED for c in needed), cost=round(cost, 2)))

    first_kid = coverage.kids[0]
    open_weeks = sorted(c.week_of for r in rows for c in r.cells if c.state in ("open", "ideas"))
    return Board(
        ready=True, summer_start=coverage.summer_start, summer_end=coverage.summer_end,
        weeks=[Week(week_of=w.week_of, week_end=w.week_end) for w in first_kid.weeks],
        kids=rows, planned=sum(r.planned for r in rows), weeks_needed=sum(r.weeks_needed for r in rows),
        cost=round(sum(r.cost for r in rows), 2), start_with=open_weeks[0] if open_weeks else None,
        notes=coverage.notes + (["The cost so far uses last season's price for some camps."] if old_prices else []),
    )


# ---------------------------------------------------------------------------
# The shortlist
# ---------------------------------------------------------------------------

def _pick_row(family_id: str, pick_id: UUID | str) -> dict[str, Any]:
    rows = get_supabase().table("plan_picks").select("*").eq("id", str(pick_id)).eq("family_id", family_id).execute().data
    if not rows:
        raise NotFound("That pick isn't on this board")
    return rows[0]


def _cell(family_id: str, child: str, week: date) -> list[dict[str, Any]]:
    rows = (get_supabase().table("plan_picks").select("*").eq("family_id", family_id)
            .eq("week_of", week.isoformat()).execute().data or [])
    return [r for r in rows if r["child_name"].lower() == child.lower()]


def _only_choice(family_id: str, child: str, week: date, keep: str) -> None:
    """One chosen camp per kid and week: choosing one puts any other back on the shortlist."""
    for r in _cell(family_id, child, week):
        if r["state"] == "chosen" and str(r["id"]) != keep:
            get_supabase().table("plan_picks").update({"state": "idea", "updated_at": _now()}).eq("id", r["id"]).execute()


def add_pick(family_id: str, body: PickCreate, added_by: str | None = None) -> str:
    profile = _profile(family_id)
    names = {k["name"].lower(): k["name"] for k in profile.get("kids") or [] if k.get("name")}
    child = names.get(body.child_name.strip().lower())
    if not child:
        raise ServiceError(f"{body.child_name} isn't one of the kids on this board")
    sb = get_supabase()
    if not sb.table("camps").select("id").eq("id", str(body.camp_id)).execute().data:
        raise NotFound("Camp not found")
    if body.session_id and not (sb.table("sessions").select("id").eq("id", str(body.session_id))
                                .eq("camp_id", str(body.camp_id)).execute().data):
        raise NotFound("Session not found for this camp")
    week = monday(body.week_of)
    cell = _cell(family_id, child, week)
    existing = next((r for r in cell if str(r["camp_id"]) == str(body.camp_id)), None)
    if existing:
        update_pick(family_id, existing["id"], PickUpdate(state=body.state, note=body.note))
        return str(existing["id"])
    if body.state == "idea" and sum(r["state"] == "idea" for r in cell) >= MAX_IDEAS:
        raise ServiceError(f"Up to {MAX_IDEAS} ideas a week. Remove one, or choose one.")
    row = sb.table("plan_picks").insert({
        "family_id": family_id, "child_name": child, "week_of": week.isoformat(), "camp_id": str(body.camp_id),
        "session_id": str(body.session_id) if body.session_id else None, "state": body.state, "note": body.note,
        "added_by": added_by,
    }).execute().data[0]
    if body.state == "chosen":
        _only_choice(family_id, child, week, str(row["id"]))
    return str(row["id"])


def update_pick(family_id: str, pick_id: UUID | str, body: PickUpdate) -> None:
    row = _pick_row(family_id, pick_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        return
    get_supabase().table("plan_picks").update({**changes, "updated_at": _now()}).eq("id", str(row["id"])).execute()
    if changes.get("state") == "chosen":
        _only_choice(family_id, row["child_name"], _d(row["week_of"]), str(row["id"]))  # type: ignore[arg-type]


def remove_pick(family_id: str, pick_id: UUID | str) -> None:
    row = _pick_row(family_id, pick_id)
    get_supabase().table("plan_picks").delete().eq("id", str(row["id"])).execute()
