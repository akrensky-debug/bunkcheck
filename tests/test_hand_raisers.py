"""The hand-raiser list: an email, an optional town and the kids' ages. Nothing is sent."""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from campfinder.services import hand_raisers


@pytest.fixture(autouse=True)
def _fresh_limits() -> None:
    hand_raisers._ip_windows.clear()


def rows(db: Any) -> list[dict[str, Any]]:
    return db.table("hand_raisers").select("*").execute().data


def test_a_parent_raises_her_hand(client: TestClient, db: Any, outbox: Any) -> None:
    res = client.post("/api/v1/hand-raisers", json={"email": " Mom@Example.com ", "town": "  East  Greenwich, RI ", "kids_ages": [8, 5, 40]})
    assert res.status_code == 202 and res.json() == {"status": "ok"}
    (row,) = rows(db)
    assert row["email"] == "mom@example.com" and row["town"] == "East Greenwich, RI"
    assert row["kids_ages"] == [5, 8]  # sorted, and 40 is not a kid's age
    assert outbox == []  # no confirmation, no welcome: sending is a separate decision


def test_email_alone_is_enough(client: TestClient, db: Any) -> None:
    assert client.post("/api/v1/hand-raisers", json={"email": "dad@example.com"}).status_code == 202
    (row,) = rows(db)
    assert row["town"] is None and row["kids_ages"] == []


def test_a_second_signup_updates_and_never_duplicates(client: TestClient, db: Any) -> None:
    client.post("/api/v1/hand-raisers", json={"email": "mom@example.com", "town": "Providence, RI", "kids_ages": [8]})
    # The answer is the same for an address already on the list, so the list can't be probed.
    again = client.post("/api/v1/hand-raisers", json={"email": "MOM@example.com"})
    assert again.status_code == 202 and again.json() == {"status": "ok"}
    (row,) = rows(db)
    assert row["town"] == "Providence, RI" and row["kids_ages"] == [8]  # a bare repeat keeps what she said
    client.post("/api/v1/hand-raisers", json={"email": "mom@example.com", "town": "Cranston, RI"})
    assert rows(db)[0]["town"] == "Cranston, RI" and len(rows(db)) == 1


def test_a_bad_address_is_refused(client: TestClient, db: Any) -> None:
    res = client.post("/api/v1/hand-raisers", json={"email": "not an email"})
    assert res.status_code == 422 and "email address" in res.json()["detail"]
    assert rows(db) == []


def test_one_address_cannot_fill_the_list(client: TestClient, db: Any) -> None:
    for n in range(hand_raisers.IP_HOURLY_CAP):
        assert client.post("/api/v1/hand-raisers", json={"email": f"p{n}@example.com"}).status_code == 202
    res = client.post("/api/v1/hand-raisers", json={"email": "one-more@example.com"})
    assert res.status_code == 429
    assert len(rows(db)) == hand_raisers.IP_HOURLY_CAP
