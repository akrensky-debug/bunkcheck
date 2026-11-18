"""A weekly budget: over budget is out, no weekly price is kept but listed last and labelled.

Found 13 November 2026: "day camps near Boston with extended care under $400" returned eight
camps, none with a price, because a missing price passed every budget. Rule chosen by Andrew
on 18 November 2026.
"""

from __future__ import annotations

from typing import Any

import pytest

from campfinder.agent import tools
from campfinder.services.price import NOT_POSTED, price_label, weekly_price
from campfinder.services.search import search_camps

BASE = {"city": "Providence", "state": "RI", "camp_type": "day", "is_active": True,
        "verification_status": "team_verified"}
CAMPS: list[dict[str, Any]] = [
    # Confirmed and complete, so it outscores the priced camps unless the budget rule holds.
    {"id": "aaaaaaaa-0000-0000-0000-000000000001", "name": "No Price Posted", "description_short": "Fun.", "verification_status": "camp_verified"},
    {"id": "aaaaaaaa-0000-0000-0000-000000000002", "name": "Under Budget", "price_per_week": 350},
    {"id": "aaaaaaaa-0000-0000-0000-000000000003", "name": "Over Budget", "price_per_week": 550},
    {"id": "aaaaaaaa-0000-0000-0000-000000000004", "name": "Weekly Range", "price_min": 300, "price_max": 450, "price_per": "week"},
    {"id": "aaaaaaaa-0000-0000-0000-000000000005", "name": "Range Over Budget", "price_min": 450, "price_max": 600, "price_per": "week"},
    {"id": "aaaaaaaa-0000-0000-0000-000000000006", "name": "Per Session", "price_min": 900, "price_max": 1200, "price_per": "session",
     "season_year": 2020},
]


@pytest.fixture
def listed(db):
    db.table("camps").insert([{**BASE, **c} for c in CAMPS]).execute()
    return db


@pytest.mark.parametrize("sort", ["best_match", "distance", "price"])
async def test_budget_drops_over_and_lists_unpriced_last(listed, sort: str) -> None:
    rows = await search_camps(listed, location="Providence, RI", max_price_per_week=400, sort=sort, limit=50)
    names = [r["name"] for r in rows]
    assert "Over Budget" not in names and "Range Over Budget" not in names
    priced, unpriced = names[:2], names[2:]
    assert set(priced) == {"Under Budget", "Weekly Range"}
    assert set(unpriced) == {"No Price Posted", "Per Session"}


async def test_without_a_budget_nothing_is_dropped_or_demoted(listed) -> None:
    rows = await search_camps(listed, location="Providence, RI", limit=50)
    assert len(rows) == len(CAMPS) and rows[0]["name"] == "No Price Posted"


async def test_tool_labels_unpriced_cards_and_counts_only_prices_shown(listed) -> None:
    out = await tools.run_tool("search_camps", {"location": "Providence, RI", "max_price_per_week": 400})
    cards = {c["name"]: c for c in out.content["camps"]}
    assert cards["No Price Posted"]["price_label"] == NOT_POSTED
    assert cards["Per Session"]["price_label"] == "$900 to $1,200 per session"
    assert cards["Weekly Range"]["price_label"] == "$300 to $450/week"
    note = out.content["note"]
    assert note.startswith("2 of these have no weekly price posted") and "$400/week" in note
    assert "1 of these show last season's prices" in note  # Per Session: old, but it does show a price


async def test_last_season_without_a_price_is_not_counted_as_showing_one(db) -> None:
    db.table("camps").insert({**BASE, "id": "bbbbbbbb-0000-0000-0000-000000000001", "name": "Old And Unpriced", "season_year": 2020}).execute()
    out = await tools.run_tool("search_camps", {"location": "Providence, RI"})
    assert out.content["note"] is None


@pytest.mark.parametrize("camp,weekly,label", [
    ({"price_per_week": 375}, 375, "$375/week"),
    ({"price_per_week": 375, "price_min": 300, "price_per": "week"}, 375, "$375/week"),
    ({"price_min": 300, "price_max": 300, "price_per": "week"}, 300, "$300/week"),
    ({"price_min": 2100, "price_per": "summer"}, None, "$2,100 per summer"),
    ({"price_min": 200, "price_max": 500}, None, "$200 to $500 (weekly price not posted)"),
    ({}, None, NOT_POSTED),
])
def test_weekly_price_and_label(camp: dict[str, Any], weekly: float | None, label: str) -> None:
    assert weekly_price(camp) == weekly and price_label(camp) == label
