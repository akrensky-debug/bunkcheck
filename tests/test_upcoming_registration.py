"""The home page's "Registration opening soon" list: checked dates only, soonest first."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi.testclient import TestClient

WHEELER, PCD, PARK, CLOSED = (f"0000000{n}-0000-0000-0000-000000000000" for n in range(1, 5))


def _in(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def test_only_checked_dates_still_ahead_soonest_first(client: TestClient, db: Any) -> None:
    db.table("camps").insert([
        {"id": WHEELER, "slug": "wheeler", "name": "Wheeler Summer Camp", "city": "Seekonk", "state": "MA", "is_active": True},
        {"id": PCD, "slug": "pcd", "name": "Summer at PCD", "city": "East Providence", "state": "RI", "is_active": True},
        {"id": PARK, "slug": "park", "name": "Summer at Park", "city": "Brookline", "state": "MA", "is_active": True},
        {"id": CLOSED, "slug": "closed", "name": "Closed Camp", "city": "Boston", "state": "MA", "is_active": False},
    ]).execute()
    db.table("registration_windows").insert([
        {"camp_id": PARK, "opens_at": _in(20), "verified": True, "source_url": "https://park.example.org"},
        {"camp_id": WHEELER, "opens_at": _in(3), "verified": True},
        {"camp_id": WHEELER, "opens_at": _in(9), "verified": True, "session_id": "5" * 8 + "-0000-0000-0000-000000000000"},
        {"camp_id": WHEELER, "opens_at": _in(-300), "verified": True},   # last season's
        {"camp_id": PCD, "opens_at": _in(5), "verified": False},         # found, not checked by a person yet
        {"camp_id": CLOSED, "opens_at": _in(2), "verified": True},       # the camp is not published
    ]).execute()

    openings = client.get("/api/v1/registration/upcoming").json()["openings"]
    assert [o["name"] for o in openings] == ["Wheeler Summer Camp", "Summer at Park"]
    assert openings[0]["slug"] == "wheeler" and openings[0]["city"] == "Seekonk"
    assert openings[1]["source_url"] == "https://park.example.org"
    assert [o["name"] for o in client.get("/api/v1/registration/upcoming?limit=1").json()["openings"]] == ["Wheeler Summer Camp"]


def test_nothing_checked_is_an_empty_list(client: TestClient, db: Any) -> None:
    assert client.get("/api/v1/registration/upcoming").json() == {"openings": []}
