"""Nearest first: a camp in the searched town (0 miles) comes first, not last.

Found 20 November 2026: "Nearest" on camp search put a camp 2.3 miles away above five camps in
Providence itself, because a distance of 0 was read as "no distance".
"""

from __future__ import annotations

import pytest

from campfinder.services.search import search_camps

BASE = {"camp_type": "day", "is_active": True, "verification_status": "unverified"}


@pytest.fixture
def listed(db):
    db.table("camps").insert([
        {**BASE, "id": "bbbbbbbb-0000-0000-0000-000000000001", "name": "Over In Pawtucket", "city": "Pawtucket", "state": "RI"},
        {**BASE, "id": "bbbbbbbb-0000-0000-0000-000000000002", "name": "Right In Providence", "city": "Providence", "state": "RI"},
        {**BASE, "id": "bbbbbbbb-0000-0000-0000-000000000003", "name": "Down In Warwick", "city": "Warwick", "state": "RI"},
    ]).execute()
    return db


async def test_nearest_puts_the_searched_town_first(listed) -> None:
    rows = await search_camps(listed, location="Providence, RI", sort="distance", limit=10)
    assert [r["name"] for r in rows] == ["Right In Providence", "Over In Pawtucket", "Down In Warwick"]
    assert rows[0]["distance_miles"] == 0
