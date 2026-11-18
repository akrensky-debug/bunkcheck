"""What the assistant says when a search comes back empty: outside our states, or just no match."""

from __future__ import annotations

from campfinder import mcp_server
from campfinder.agent import runner, tools
from campfinder.routers import activity


def test_only_states_with_camps_count_as_covered() -> None:
    assert tools.COVERED_STATES == {"CT", "MA", "ME", "NH", "RI", "VT"}


def test_an_empty_search_outside_those_states_says_so() -> None:
    # New Jersey, New York and Pennsylvania used to be listed as covered, with no camps in them.
    for place in ("Montclair, NJ", "Brooklyn, NY", "Philadelphia, PA", "Columbus, OH"):
        note = tools._empty_note(place, "No camps matched.")
        assert place in note and "CT, MA, ME, NH, RI, VT" in note


def test_an_empty_search_inside_them_keeps_the_ordinary_note() -> None:
    assert tools._empty_note("Providence, RI", "No camps matched.") == "No camps matched."
    assert tools._empty_note("Providence", "No camps matched.") == "No camps matched."  # no state given


def test_every_place_that_states_coverage_agrees() -> None:
    texts = [tools.LOCATION_HELP, tools.OUTSIDE_COVERAGE, mcp_server.INSTRUCTIONS, activity.NEAR_HELP, runner.SYSTEM_PROMPT]
    for text in texts:
        assert "NJ" not in text and "NY," not in text and "PA," not in text
        assert "CT, MA, ME, NH, RI" in text
