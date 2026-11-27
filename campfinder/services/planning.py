"""Summer plan week-allocation logic."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any
from uuid import UUID


def _monday(d: date) -> date:
    """Return the Monday of the week containing d."""
    return d - timedelta(days=d.weekday())


def _generate_weeks(summer_start: date, summer_end: date) -> list[tuple[date, date]]:
    """
    Yield (week_start, week_end) Monday-Sunday tuples covering the summer range.
    The first week starts on the Monday of the week containing summer_start.
    The last week ends on the Sunday of the week containing summer_end.
    """
    weeks: list[tuple[date, date]] = []
    current = _monday(summer_start)
    while current <= summer_end:
        week_end = current + timedelta(days=6)
        weeks.append((current, week_end))
        current += timedelta(weeks=1)
    return weeks


def _session_overlaps_week(
    session_start: date, session_end: date, week_start: date, week_end: date
) -> bool:
    """Return True if the session's date range overlaps with any day in the week."""
    return session_start <= week_end and session_end >= week_start


def _as_date(d: date | str) -> date:
    return date.fromisoformat(d) if isinstance(d, str) else d


def _weekdays(start: date, end: date) -> int:
    return sum(1 for i in range((end - start).days + 1) if (start + timedelta(days=i)).weekday() < 5)


def fee_lines(sessions: list[dict[str, Any]], fees: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """What each of a camp's fees comes to for the sessions chosen there. A membership,
    registration fee or deposit counts once; a weekly fee counts each week of camp; a daily fee
    each weekday; a session fee each session."""
    if not sessions:
        return []
    weeks = sum(max(1, round(_weekdays(_as_date(s["start_date"]), _as_date(s["end_date"])) / 5)) for s in sessions)
    days = sum(_weekdays(_as_date(s["start_date"]), _as_date(s["end_date"])) for s in sessions)
    times = {"once": 1, "year": 1, "summer": 1, "session": len(sessions), "week": weeks, "day": days}
    return [{"item": f["name"], "unit_amount": float(f["amount"]), "per": f["per"], "count": times[f["per"]],
             "amount": float(f["amount"]) * times[f["per"]], "required": bool(f.get("required")),
             "note": f.get("note")} for f in fees if f.get("per") in times]


def build_plan(
    camp_sessions: list[dict[str, Any]],
    summer_start: date,
    summer_end: date,
    camp_fees: dict[str, list[dict[str, Any]]] | None = None,
) -> dict[str, Any]:
    """
    Build a week-by-week summer plan.

    camp_sessions: list of dicts with keys:
        camp_id, session_id, camp_name, start_date, end_date, price

    Returns a dict matching the PlanResponse schema.
    """
    weeks = _generate_weeks(summer_start, summer_end)
    result_weeks = []
    gaps: list[date] = []
    overlaps: list[date] = []
    total_cost = 0.0
    # Track which sessions have already been counted for cost (avoid double-counting)
    counted_session_ids: set[str] = set()

    for week_start, week_end in weeks:
        active: list[dict[str, Any]] = []
        for s in camp_sessions:
            s_start = s["start_date"]
            s_end = s["end_date"]
            if isinstance(s_start, str):
                s_start = date.fromisoformat(s_start)
            if isinstance(s_end, str):
                s_end = date.fromisoformat(s_end)
            if _session_overlaps_week(s_start, s_end, week_start, week_end):
                active.append(s)

        if len(active) == 0:
            status = "gap"
            gaps.append(week_start)
        elif len(active) == 1:
            status = "covered"
        else:
            status = "overlap"
            overlaps.append(week_start)

        camps_this_week = []
        for s in active:
            s_start = s["start_date"]
            s_end = s["end_date"]
            if isinstance(s_start, str):
                s_start = date.fromisoformat(s_start)
            if isinstance(s_end, str):
                s_end = date.fromisoformat(s_end)

            session_dates = f"{_fmt_date(s_start)} - {_fmt_date(s_end)}"
            camps_this_week.append({
                "camp_id": s["camp_id"],
                "name": s["camp_name"],
                "session_id": s["id"],
                "session_dates": session_dates,
                "cost": float(s["price"]) if s.get("price") is not None else None,
            })
            # Count session cost once
            sid = str(s["id"])
            if sid not in counted_session_ids and s.get("price") is not None:
                total_cost += float(s["price"])
                counted_session_ids.add(sid)

        result_weeks.append({
            "week_of": week_start,
            "week_end": week_end,
            "status": status,
            "camps": camps_this_week,
        })

    weeks_covered = sum(1 for w in result_weeks if w["status"] in ("covered", "overlap"))

    # The cost breakdown: each camp's tuition, then each of its fees for the sessions chosen there.
    # Required fees count toward the total; optional add-ons are listed but left out of it.
    breakdown: list[dict[str, Any]] = []
    by_camp: dict[str, list[dict[str, Any]]] = {}
    seen: set[str] = set()
    for s in camp_sessions:
        if str(s["id"]) not in seen:
            seen.add(str(s["id"]))
            by_camp.setdefault(str(s["camp_id"]), []).append(s)
    for cid, sessions in by_camp.items():
        name = sessions[0].get("camp_name", "Unknown Camp")
        priced = [float(s["price"]) for s in sessions if s.get("price") is not None]
        if priced:
            breakdown.append({"camp_id": cid, "camp_name": name, "item": "Tuition", "unit_amount": None,
                              "per": "session", "count": len(priced), "amount": sum(priced),
                              "required": True, "note": None})
        for line in fee_lines(sessions, (camp_fees or {}).get(cid) or []):
            breakdown.append({"camp_id": cid, "camp_name": name, **line})
            if line["required"]:
                total_cost += line["amount"]

    return {
        "weeks": result_weeks,
        "total_estimated_cost": total_cost,
        "cost_breakdown": breakdown,
        "weeks_covered": weeks_covered,
        "weeks_total": len(result_weeks),
        "gaps": gaps,
        "overlaps": overlaps,
    }


def _fmt_date(d: date) -> str:
    """Format a date as 'Mon D' (e.g. 'Jun 9')."""
    return d.strftime("%b %-d")
