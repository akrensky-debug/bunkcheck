"""Last season's dates and prices are shown as last season's, everywhere a parent or an assistant sees them."""

from __future__ import annotations

from datetime import date, timedelta
from types import SimpleNamespace as NS

import pytest

from campfinder.agent import tools
from campfinder.agent.tools import run_tool
from campfinder.models.compare import CompareRequest
from campfinder.services import camps, compare, summer_brief
from campfinder.services.season import is_last_season, planning_year, season_note
from campfinder.services.search import to_search_result

THIS = planning_year()  # the summer being planned when the test runs
OLD, NEW = "cccccccc-0000-0000-0000-000000000001", "cccccccc-0000-0000-0000-000000000002"


def test_the_summer_being_planned_turns_over_in_july() -> None:
    assert planning_year(date(2026, 6, 30)) == 2026
    assert planning_year(date(2026, 7, 1)) == 2027
    assert summer_brief.summer_year(date(2026, 10, 27)) == 2027
    oct_ = date(2026, 10, 27)
    assert is_last_season(2026, oct_) and not is_last_season(2027, oct_) and not is_last_season(None, oct_)
    assert season_note(2026, oct_) == "Dates and prices are from the 2026 season. 2027 details aren't posted yet."
    assert season_note(2027, oct_) is None


@pytest.fixture
def two_seasons(db):
    base = {"city": "Providence", "state": "RI", "zip": "02906", "camp_type": "day",
            "verification_status": "unverified", "is_active": True, "price_per_week": 300}
    db.table("camps").insert([
        {**base, "id": OLD, "name": "Old Dates Camp", "season_year": THIS - 1},
        {**base, "id": NEW, "name": "New Dates Camp", "season_year": THIS},
    ]).execute()
    return db


def test_detail_and_search_say_which_season(two_seasons) -> None:
    old = camps.get_camp_detail(OLD)
    assert old.last_season and old.season_note and str(THIS - 1) in old.season_note
    new = camps.get_camp_detail(NEW)
    assert not new.last_season and new.season_note is None
    row = to_search_result({"id": OLD, "name": "Old Dates Camp", "city": "Providence", "state": "RI",
                            "camp_type": "day", "season_year": THIS - 1})
    assert row.last_season and row.season_year == THIS - 1
    assert tools._compact_camp(row.model_dump(mode="json"))["last_season"] is True


def test_compare_says_when_prices_are_not_like_for_like(two_seasons) -> None:
    res = compare.compare_camps(CompareRequest(camp_ids=[OLD, NEW]))
    assert res.differences[0].startswith("Not like for like: Old Dates Camp shows")
    assert [c.last_season for c in res.camps] == [True, False]


def _match(camp_id: str, name: str, start: date) -> tuple[NS, NS]:
    session = NS(id=f"s-{camp_id}-{start}", name="Week", start_date=start, end_date=start + timedelta(days=4),
                 price=280.0, availability="unknown")
    program = NS(id=camp_id, name=name, distance_miles=4.0, match_reasons=[],
                 location=NS(city="Providence", state="RI"), price=NS(per_week=280.0, financial_aid=False),
                 ages=NS(min=5, max=12), verification=NS(status="unverified"),
                 logistics=NS(extended_care=False, transportation=False))
    return session, program


async def test_a_week_not_posted_yet_shows_the_same_week_last_season(monkeypatch) -> None:
    week = date(THIS, 7, 6)
    calls = []

    async def fake_find_sessions(*, starts_on_or_after, ends_on_or_before, **_):
        calls.append(starts_on_or_after)
        if starts_on_or_after.year == THIS:
            return [_match("posted", "Posted Camp", week)]
        return [_match("posted", "Posted Camp", starts_on_or_after), _match("old", "Last Year Camp", starts_on_or_after)]

    monkeypatch.setattr(tools, "find_sessions", fake_find_sessions)
    out = await run_tool("find_sessions", {"location": "Providence, RI", "starts_on_or_after": week.isoformat(),
                                           "ends_on_or_before": (week + timedelta(days=4)).isoformat()})
    assert calls == [week, week - timedelta(weeks=52)]
    rows = out.content["sessions"]
    assert [r["camp"] for r in rows] == ["Posted Camp", "Last Year Camp"]  # a camp is not listed twice
    assert "last_season" not in rows[0] and rows[1]["last_season"] is True
    assert "last season's dates and prices" in out.content["note"]
    assert [s["last_season"] for s in out.ui["sessions"]] == [False, True]
