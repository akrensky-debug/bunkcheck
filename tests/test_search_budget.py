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


# --- Hardening: prices come from scraped listings, so the rule must hold whatever the row says ---

@pytest.mark.parametrize("camp,weekly,label", [
    ({"price_per_week": "450.00"}, 450, "$450/week"),  # Supabase sends numeric as text
    ({"price_per_week": "$1,200"}, 1200, "$1,200/week"),
    ({"price_per_week": "call us"}, None, NOT_POSTED),
    ({"price_per_week": -5}, None, NOT_POSTED),
    ({"price_per_week": float("nan")}, None, NOT_POSTED),
    ({"price_per_week": float("inf")}, None, NOT_POSTED),
    ({"price_per_week": True}, None, NOT_POSTED),
    ({"price_min": 450, "price_max": 300, "price_per": "week"}, 300, "$300 to $450/week"),  # swapped
    ({"price_min": 300, "price_per": " Weekly "}, 300, "$300/week"),
    ({"price_max": 450, "price_per": "week"}, 450, "up to $450/week"),
    ({"price_max": 450, "price_per": "session"}, None, "up to $450 per session"),
    ({"price_per_week": 0}, 0, "Free"),
    ({"price_min": "0.00", "price_max": "0.00"}, 0, "Free"),  # free with no unit is still free
    ({"price_min": 0, "price_max": 500, "price_per": "session"}, None, "$0 to $500 per session"),
])
def test_untrusted_price_rows(camp: dict[str, Any], weekly: float | None, label: str) -> None:
    assert weekly_price(camp) == weekly and price_label(camp) == label


async def test_free_camp_fits_any_budget_and_says_free(db) -> None:
    free = "cccccccc-0000-0000-0000-000000000001"
    db.table("camps").insert([
        {**BASE, "id": free, "name": "Harbor Free", "price_per_week": "0.00", "price_per": "session"},
        {**BASE, "id": "cccccccc-0000-0000-0000-000000000002", "name": "Unpriced", "verification_status": "camp_verified"},
    ]).execute()
    out = await tools.run_tool("search_camps", {"location": "Providence, RI", "max_price_per_week": 100})
    cards = out.content["camps"]
    assert [c["name"] for c in cards] == ["Harbor Free", "Unpriced"]
    assert cards[0]["price_label"] == "Free" and cards[0]["price_per_week"] == 0


async def test_bad_price_data_never_breaks_search(db) -> None:
    rows = [{"price_per_week": "TBD"}, {"price_min": "n/a", "price_per": "week"}, {"price_per": 7},
            {"price_min": float("nan"), "price_max": "", "price_per": None}]
    db.table("camps").insert([{**BASE, "id": f"dddddddd-0000-0000-0000-00000000000{i}", "name": f"Bad {i}", **r}
                              for i, r in enumerate(rows)]).execute()
    out = await tools.run_tool("search_camps", {"location": "Providence, RI", "max_price_per_week": 400})
    assert {c["price_label"] for c in out.content["camps"]} == {NOT_POSTED}
    assert out.content["note"].startswith("4 of these have no weekly price posted")


@pytest.mark.parametrize("seed", range(20))
async def test_rule_holds_for_any_mix_of_camps(db, seed: int) -> None:
    """Random prices, units and trust: whatever the sort, nothing over budget, priced before unpriced,
    and nothing that fits is lost."""
    import random

    rnd = random.Random(seed)
    prices = [None, 0, 99, 250, 399.99, 400, 400.01, 650, "380.00", "junk", -1]
    camps = []
    for i in range(30):
        c = {**BASE, "id": f"eeeeeeee-0000-0000-0000-{i:012d}", "name": f"Camp {i}",
             "city": rnd.choice(["Providence", "Cranston", "Warwick", "Pawtucket"]),
             "verification_status": rnd.choice(["camp_verified", "team_verified", "unverified"]),
             "description_short": rnd.choice([None, "x"])}
        shape = rnd.randrange(3)
        if shape == 0:
            c["price_per_week"] = rnd.choice(prices)
        elif shape == 1:
            c |= {"price_min": rnd.choice(prices), "price_max": rnd.choice(prices),
                  "price_per": rnd.choice(["week", "Week", "session", None, "summer"])}
        camps.append(c)
    db.table("camps").insert(camps).execute()
    budget = rnd.choice([0, 100, 400, 1000])
    fits = {c["name"] for c in camps if weekly_price(c) is None or weekly_price(c) <= budget}
    for sort in ("best_match", "distance", "price"):
        rows = await search_camps(db, location="Providence, RI", max_price_per_week=budget, sort=sort, limit=100)
        names = [r["name"] for r in rows]
        assert set(names) == fits, sort
        weekly = [weekly_price(r) for r in rows]
        assert all(w is None or w <= budget for w in weekly), sort
        unpriced = [w is None for w in weekly]
        assert unpriced == sorted(unpriced), sort


async def test_mcp_cards_carry_a_note_that_counts_only_the_cards_shown(db) -> None:
    """The widget shows MAX_CARDS. Found live on 18 November 2026: with limit 20 the note counted
    3 unpriced and 17 last-season camps above 8 cards that were all priced and current."""
    from campfinder.mcp_server import MAX_CARDS, _widget_payload

    priced = [{**BASE, "id": f"ffffffff-0000-0000-0000-{i:012d}", "name": f"Priced {i}", "price_per_week": 300,
               "verification_status": "camp_verified", "description_short": "x"} for i in range(MAX_CARDS + 2)]
    old_unpriced = [{**BASE, "id": f"ffffffff-1111-0000-0000-{i:012d}", "name": f"Unpriced {i}",
                     "season_year": 2020, "price_min": 900, "price_per": "session"} for i in range(3)]
    db.table("camps").insert(priced + old_unpriced).execute()
    args = {"location": "Providence, RI", "max_price_per_week": 400, "limit": 20}
    out = await tools.run_tool("search_camps", args)
    assert out.content["note"].startswith("3 of these have no weekly price posted")  # the model's full list

    payload = _widget_payload("search_camps", args, out, "claude")
    assert len(payload["camps"]) == MAX_CARDS and all(c["weekly_price"] == 300 for c in payload["camps"])
    assert payload["note"] is None  # nothing on the cards needs a caveat

    few = await tools.run_tool("search_camps", {**args, "limit": 3})
    assert _widget_payload("search_camps", args, few, "claude")["note"] is None
