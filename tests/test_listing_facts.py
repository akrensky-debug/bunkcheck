"""Extended care, transportation, meals and financial aid are yes, no, or not listed.

Found 19 November 2026: the camps table holds NULL when a listing doesn't say, and the models
turned that into false, so every surface told parents "no extended care" when the truth was
"not listed". GET /api/v1/camps/herreshoff-marine-museum-youth-sailing-camp returned
extended_care: false with extended_care in fields_missing. That day 290 live camps had no
extended care fact and 10 had a sourced no.
"""

from __future__ import annotations

from typing import Any

import pytest

from campfinder.activity.sources import program_from_camp
from campfinder.agent import tools
from campfinder.agent.runner import SYSTEM_PROMPT
from campfinder.models.compare import CompareRequest
from campfinder.services import camps, compare
from campfinder.services.differences import generate_differences
from campfinder.services.search import search_camps

FACTS = ("extended_care", "transportation", "meals_included", "financial_aid")
SILENT, SAYS_NO, SAYS_YES = ("cccccccc-0000-0000-0000-00000000000%d" % i for i in (1, 2, 3))
BASE = {"city": "Providence", "state": "RI", "zip": "02906", "camp_type": "day", "is_active": True,
        "verification_status": "team_verified", "price_per_week": 300}
CAMPS: list[dict[str, Any]] = [
    # The listing says nothing: the columns are NULL, as in the live table.
    {**BASE, "id": SILENT, "slug": "silent-sailing", "name": "Silent Sailing", **{f: None for f in FACTS}},
    {**BASE, "id": SAYS_NO, "name": "Says No Soccer", **{f: False for f in FACTS}},
    {**BASE, "id": SAYS_YES, "name": "Says Yes Science", **{f: True for f in FACTS}},
]


@pytest.fixture
def listed(db):
    db.table("camps").insert(CAMPS).execute()
    return db


def test_detail_keeps_null_as_none_and_a_stored_no_as_false(listed) -> None:
    silent, says_no = camps.get_camp_detail(SILENT), camps.get_camp_detail(SAYS_NO)
    for f in FACTS:
        assert getattr(silent, f) is None
        assert getattr(says_no, f) is False
    assert set(FACTS) <= set(silent.trust_summary.fields_missing)
    assert not set(FACTS) & set(says_no.trust_summary.fields_missing)


def test_api_returns_null_not_false(listed, client) -> None:
    body = client.get("/api/v1/camps/silent-sailing").json()
    assert {f: body[f] for f in FACTS} == {f: None for f in FACTS}
    assert set(FACTS) <= set(body["trust_summary"]["fields_missing"])
    body = client.get(f"/api/v1/camps/{SAYS_NO}").json()
    assert {f: body[f] for f in FACTS} == {f: False for f in FACTS}


async def test_search_results_keep_null_and_filters_match_only_a_listed_yes(listed) -> None:
    rows = await search_camps(listed, location="Providence, RI", limit=50)
    by_name = {r["name"]: r for r in rows}
    assert all(by_name["Silent Sailing"][f] is None for f in FACTS)
    assert all(by_name["Says No Soccer"][f] is False for f in FACTS)
    for flag in ("requires_extended_care", "requires_transport", "requires_meals", "requires_financial_aid"):
        rows = await search_camps(listed, location="Providence, RI", limit=50, **{flag: True})
        assert [r["name"] for r in rows] == ["Says Yes Science"], flag


def test_compare_never_calls_not_listed_a_no(listed) -> None:
    res = compare.compare_camps(CompareRequest(camp_ids=[SAYS_YES, SILENT]))
    silent = next(c for c in res.camps if c.name == "Silent Sailing")
    assert silent.extended_care is None and silent.transportation is None and silent.meals_included is None
    care = [d for d in res.differences if "extended care" in d]
    assert care == ["Says Yes Science offers extended care; Silent Sailing's listing doesn't mention "
                    "extended care (ask the camp)"]
    assert not any("Silent Sailing does not" in d for d in res.differences)


@pytest.mark.parametrize("states, expected", [
    ((True, False), ["A offers extended care, B does not offer extended care"]),
    ((False, None, None), ["A does not offer extended care; the listings for B and C don't mention "
                           "extended care (ask the camps)"]),
    ((None, None), []),  # nobody says: no difference to point out
    ((False, False), []),
])
def test_differences_are_three_valued(states: tuple[bool | None, ...], expected: list[str]) -> None:
    rows = [{"name": "ABC"[i], "extended_care": v} for i, v in enumerate(states)]
    assert [d for d in generate_differences(rows) if "extended care" in d] == expected


async def test_search_tool_names_unlisted_facts_and_says_what_to_do(listed) -> None:
    out = await tools.run_tool("search_camps", {"location": "Providence, RI"})
    cards = {c["name"]: c for c in out.content["camps"]}
    assert cards["Silent Sailing"]["not_listed"] == ["extended care", "transportation", "meals", "financial aid"]
    assert not any(f in cards["Silent Sailing"] for f in FACTS)  # never shown as false
    assert cards["Says No Soccer"]["extended_care"] is False and "not_listed" not in cards["Says No Soccer"]
    assert "That is not a no" in out.content["note"] and "ask" in out.content["note"]


async def test_detail_tool_says_the_listing_doesnt_say(listed) -> None:
    out = await tools.run_tool("get_camp_details", {"camp_id": SILENT})
    assert out.content["not_listed"] == ["extended care", "transportation", "meals", "financial aid"]
    assert out.content["not_listed_note"].startswith(
        "The listing doesn't say whether this camp has extended care, transportation, meals or financial aid.")
    assert not any(f in out.content for f in FACTS)
    out = await tools.run_tool("get_camp_details", {"camp_id": SAYS_NO})
    assert out.content["extended_care"] is False and "not_listed" not in out.content


async def test_compare_tool_flags_unlisted_facts(listed) -> None:
    out = await tools.run_tool("compare_camps", {"camp_ids": [SILENT, SAYS_NO]})
    silent = next(c for c in out.content["camps"] if c["name"] == "Silent Sailing")
    # A compare row has no financial_aid, so it isn't called unlisted either.
    assert silent["not_listed"] == ["extended care", "transportation", "meals"]
    assert "That is not a no" in out.content["note"]


async def test_mcp_cards_carry_null_and_the_note(listed) -> None:
    from campfinder.mcp_server import _widget_payload

    args = {"location": "Providence, RI"}
    out = await tools.run_tool("search_camps", args)
    payload = _widget_payload("search_camps", args, out, "chatgpt")
    card = next(c for c in payload["camps"] if c["name"] == "Silent Sailing")
    assert card["extended_care"] is None and card["transportation"] is None and card["financial_aid"] is None
    assert "That is not a no" in payload["note"]


def test_widget_shows_a_chip_only_for_a_listed_yes() -> None:
    from pathlib import Path

    html = (Path(__file__).resolve().parents[1] / "campfinder" / "chatgpt" / "widget.html").read_text()
    for f in ("extended_care", "transportation", "financial_aid"):
        assert f"if (c.{f} === true)" in html


def test_activity_api_logistics_are_null_when_unlisted() -> None:
    silent = program_from_camp({**CAMPS[0], "location": None}, api_base="")
    assert silent.logistics.extended_care is None and silent.logistics.transportation is None
    assert silent.logistics.meals_included is None and silent.price.financial_aid is None
    says_no = program_from_camp({**CAMPS[1], "location": None}, api_base="")
    assert says_no.logistics.extended_care is False and says_no.price.financial_aid is False


def test_assistant_is_told_not_listed_is_not_no() -> None:
    assert "never tell the parent the camp doesn't have it" in SYSTEM_PROMPT
