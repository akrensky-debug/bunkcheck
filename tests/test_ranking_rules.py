"""Payment never changes rank (decided 5 November 2026; the public page is /ranking).

The same camps are ranked with and without every kind of billing we have proposed: a paid
verified profile, inquiry billing, a billing table, a row touched by a billing write. Order and
scores must come out identical.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

import pytest

from campfinder.activity.programs import score_activity
from campfinder.services.ranking import CAMP_FIELDS, SESSION_FIELDS, score_camp
from campfinder.services.search import search_camps

RECENT = (date.today() - timedelta(days=3)).isoformat()
OLD = (date.today() - timedelta(days=200)).isoformat()

# Spread across distance, price, age, data and confirmation, so the order has real ties to break.
CAMPS: list[dict[str, Any]] = [
    {"id": "c-1", "name": "Riverside Soccer", "city": "Providence", "price_per_week": 300, "age_min": 6, "age_max": 12,
     "primary_categories": ["sports"], "description_short": "Soccer.", "verification_status": "camp_verified",
     "last_updated_date": RECENT},
    {"id": "c-2", "name": "Cranston Arts", "city": "Cranston", "price_per_week": 450, "age_min": 5, "age_max": 10,
     "primary_categories": ["arts"], "description_short": "Painting.", "verification_status": "team_verified",
     "last_updated_date": OLD},
    {"id": "c-3", "name": "Warwick Sailing", "city": "Warwick", "price_per_week": 600, "age_min": 8, "age_max": 14,
     "primary_categories": ["sailing", "sports"], "verification_status": "unverified", "last_updated_date": OLD},
    {"id": "c-4", "name": "Newport Robotics", "city": "Newport", "price_per_week": 350, "age_min": 7, "age_max": 13,
     "primary_categories": ["stem"], "description_short": "Robots.", "verification_status": "unverified",
     "last_updated_date": RECENT},
]

# Every billing shape proposed in the pricing doc, as a column a migration might add to `camps`.
PAID = {
    "verified_profile_paid": True, "verified_profile_price": 199, "founding_camp": True,
    "billing_plan": "verified", "billing_status": "active", "stripe_customer_id": "cus_test",
    "inquiry_billing": True, "inquiry_monthly_cap": 50, "inquiries_delivered": 40,
    "paid_through": "2027-09-01", "featured": True, "sponsored": True,
    "updated_at": datetime.now(timezone.utc).isoformat(),  # a billing write moves updated_at
}


def _load(db, camps: list[dict[str, Any]]) -> None:
    base = {"state": "RI", "camp_type": "day", "is_active": True}
    db.table("camps").insert([{**base, **c} for c in camps]).execute()
    db.table("sessions").insert([
        {"id": f"s-{c['id']}", "camp_id": c["id"], "start_date": "2027-07-05", "end_date": "2027-07-16"}
        for c in camps
    ]).execute()


async def _rank(db, **query: Any) -> list[tuple[str, float, list[str]]]:
    rows = await search_camps(db, location="Providence, RI", radius_miles=50, limit=50, **query)
    return [(r["id"], r["match_score"], r["match_reasons"]) for r in rows]


QUERIES = [
    {},
    {"age": 9},
    {"age": 8, "weeks": ["2027-07-05", "2027-07-12"], "max_price_per_week": 500},
]


@pytest.mark.parametrize("query", QUERIES)
@pytest.mark.parametrize("who_pays", [{"c-3", "c-4"}, {"c-1", "c-2", "c-3", "c-4"}])
async def test_paying_camps_rank_exactly_where_they_would_for_free(db, query, who_pays) -> None:
    _load(db, CAMPS)
    free = await _rank(db, **query)
    assert len(free) >= 3

    db.tables.clear()
    paying = [{**c, **PAID} if c["id"] in who_pays else c for c in CAMPS]
    _load(db, paying)
    # A billing table next to the camps, as the billing migration will add.
    db.table("camp_billing").insert([
        {"camp_id": cid, "product": "verified_profile", "amount": 199, "status": "paid"} for cid in who_pays
    ]).execute()
    db.table("inquiries").insert([
        {"camp_id": cid, "billable": True, "fee": 10, "status": "delivered"} for cid in who_pays
    ]).execute()

    assert await _rank(db, **query) == free


def test_our_check_does_not_count_and_the_owners_confirmation_does() -> None:
    """The paid verified profile is our check of a listing, so team_verified adds nothing."""
    base = {"age_min": 6, "age_max": 12, "price_per_week": 300, "last_updated_date": OLD}
    unverified, _ = score_camp({**base, "verification_status": "unverified"}, [])
    checked, _ = score_camp({**base, "verification_status": "team_verified"}, [])
    confirmed, reasons = score_camp({**base, "verification_status": "camp_verified"}, [])
    assert checked == unverified
    assert confirmed == pytest.approx(unverified + 0.10)
    assert "Confirmed by the camp" in reasons


def test_freshness_ignores_updated_at() -> None:
    """updated_at moves on any write to the row, so a billing write must not make a camp look fresh."""
    old = {"last_updated_date": OLD, "verification_status": "unverified"}
    touched = {**old, "updated_at": datetime.now(timezone.utc).isoformat()}
    assert score_camp(old, []) == score_camp(touched, [])
    assert score_camp({**old, "last_updated_date": None}, []) == score_camp(
        {**old, "last_updated_date": None, "updated_at": datetime.now(timezone.utc).isoformat()}, [])


PAYMENT_WORDS = re.compile(r"pa(y|id)|bill|invoice|stripe|fee|plan|subscri|sponsor|featur|inquir|lead|founding|tier")


def test_ranking_reads_no_payment_field() -> None:
    """A new field in the allowlist that sounds like money fails here first."""
    assert [f for f in CAMP_FIELDS | SESSION_FIELDS if PAYMENT_WORDS.search(f)] == []


def test_activity_rank_ignores_our_check_and_billing() -> None:
    from campfinder.activity.programs import ActivityQuery

    q = ActivityQuery(location="Providence, RI")
    base = {"id": "p-1", "name": "Swim", "offerings": [], "prices": [], "verification_status": "unverified"}
    plain, _ = score_activity(base, [], q, 2.0, [])
    checked, _ = score_activity({**base, "verification_status": "team_verified"}, [], q, 2.0, [])
    paying, _ = score_activity({**base, **PAID}, [], q, 2.0, [])
    confirmed, _ = score_activity({**base, "verification_status": "provider_verified"}, [], q, 2.0, [])
    assert plain == checked == paying
    assert confirmed == pytest.approx(plain + 0.02)


def test_reason_line_keeps_acronym_categories_uppercase():
    """Categories are matched lowercase; the reason a parent reads says STEM, not stem."""
    _, reasons = score_camp(CAMPS[3], [], age=8, categories=["STEM"])
    assert "Offers STEM programs" in reasons
