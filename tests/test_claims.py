"""Claiming a camp: the code goes only to an address the camp published (services/claims.py)."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone

import asyncpg
import pytest

from campfinder.services import claims

CAMP = str(uuid.uuid4())
REAL_IP = {"X-Real-IP": "203.0.113.7"}


@pytest.fixture
def camp(db):
    row = {"id": CAMP, "name": "Riverside Soccer Camp", "email": "info@riversidesoccer.org",
           "website_url": "https://www.riversidesoccer.org/summer", "verification_status": "unverified"}
    db.tables["camps"] = [row]
    db.tables["camp_contacts"] = [{"id": str(uuid.uuid4()), "camp_id": CAMP, "email": "Dana.Director@Gmail.com"}]
    return row


def claim(client, email, headers=REAL_IP, camp_id=CAMP):
    return client.post("/api/v1/claims", headers=headers, json={"camp_id": camp_id, "email": email})


def code_in(outbox) -> str:
    return re.search(r"Your verification code: (\S+)", outbox[-1].text).group(1)


def verify(client, code):
    return client.get("/api/v1/claims/verify", params={"token": code})


# ---------------------------------------------------------------------------
# Who gets a code
# ---------------------------------------------------------------------------


def test_a_stranger_with_their_own_address_gets_no_code_and_cant_claim(client, camp, db, outbox):
    res = claim(client, "attacker@gmail.com")
    assert res.status_code == 200
    assert outbox == []
    row = db.tables["claim_requests"][0]
    assert (row["status"], row["route"], row["token_hash"]) == ("needs_review", "review", None)
    assert camp["verification_status"] == "unverified"
    assert "camp_ownership" not in db.tables or db.tables["camp_ownership"] == []


def test_the_answer_is_the_same_whether_or_not_we_hold_the_address(client, camp):
    stranger = claim(client, "attacker@gmail.com").json()
    listed = claim(client, "info@riversidesoccer.org").json()
    assert stranger == listed
    assert "If that address is one Riverside Soccer Camp publishes" in listed["message"]


@pytest.mark.parametrize("email, route", [
    ("info@riversidesoccer.org", "contact_on_file"),        # the email on the listing
    ("INFO@RiversideSoccer.org ", "contact_on_file"),       # case and spaces don't matter
    ("dana.director@gmail.com", "contact_on_file"),        # a named contact, even on free mail
    ("coach@riversidesoccer.org", "camp_domain"),          # the website's own domain
])
def test_a_code_goes_to_an_address_the_camp_published(client, camp, db, outbox, email, route):
    assert claim(client, email).status_code == 200
    assert len(outbox) == 1 and outbox[0].to == email.strip().lower()
    row = db.tables["claim_requests"][0]
    assert (row["status"], row["route"]) == ("pending", route)


@pytest.mark.parametrize("website, email", [
    ("https://riversidesoccer.wixsite.com/camp", "me@riversidesoccer.wixsite.com"),  # shared host
    ("https://www.facebook.com/riversidesoccer", "me@facebook.com"),
    ("https://riversidesoccer.org", "me@riversidesoccer.org.evil.com"),             # lookalike
    ("https://riversidesoccer.org", "me@mail.riversidesoccer.org"),                 # subdomain: review
    (None, "me@riversidesoccer.org"),
])
def test_a_domain_only_counts_when_the_camp_owns_it(db, camp, website, email):
    camp.update(website_url=website, email=None)
    assert claims.route_for(camp, email) == "review"


# ---------------------------------------------------------------------------
# Completing a claim
# ---------------------------------------------------------------------------


def test_a_verified_claim_marks_the_listing_claimed_and_logs_it(client, camp, db, outbox):
    claim(client, "info@riversidesoccer.org")
    res = verify(client, code_in(outbox))
    assert res.status_code == 200 and res.json()["camp_name"] == "Riverside Soccer Camp"
    assert camp["verification_status"] == "claimed"
    owner = db.tables["camp_ownership"][0]
    assert (owner["email"], owner["verified"], owner["plan"]) == ("info@riversidesoccer.org", True, "claimed")
    changes = {(c["field_name"], c["changed_by"]) for c in db.tables["listing_changes"]}
    assert changes == {("verification_status", "owner_web"), ("claim", "owner_web")}


@pytest.mark.parametrize("status", ["team_verified", "camp_verified"])
def test_a_claim_never_lowers_a_verified_listing(client, camp, outbox, status):
    camp["verification_status"] = status
    claim(client, "info@riversidesoccer.org")
    assert verify(client, code_in(outbox)).status_code == 200
    assert camp["verification_status"] == status


def test_codes_are_stored_as_a_hash_and_work_once(client, camp, db, outbox):
    claim(client, "info@riversidesoccer.org")
    code = code_in(outbox)
    row = db.tables["claim_requests"][0]
    assert code not in str(row) and row["verification_token"] is None
    assert verify(client, code).status_code == 200
    assert verify(client, code).status_code == 404


def test_codes_expire_after_72_hours(client, camp, db, outbox):
    claim(client, "info@riversidesoccer.org")
    old = datetime.now(timezone.utc) - timedelta(hours=claims.CODE_HOURS, minutes=1)
    db.tables["claim_requests"][0]["token_sent_at"] = old.isoformat()
    res = verify(client, code_in(outbox))
    assert res.status_code == 404 and "expired" in res.json()["detail"]
    assert camp["verification_status"] == "unverified"


def test_a_held_claim_cant_be_completed_with_any_code(client, camp):
    claim(client, "attacker@gmail.com")
    assert verify(client, "anything").status_code == 404
    assert verify(client, " ").status_code == 404


# ---------------------------------------------------------------------------
# Abuse limits
# ---------------------------------------------------------------------------


def test_one_address_gets_at_most_three_claims_a_day(client, camp, outbox):
    codes = [claim(client, "info@riversidesoccer.org", headers={"X-Real-IP": f"203.0.113.{i}"}).status_code
             for i in range(4)]
    assert codes == [200, 200, 200, 429]
    assert len(outbox) == 3


def test_one_address_on_the_internet_gets_five_claims_an_hour(client, camp):
    codes = [claim(client, f"person{i}@gmail.com").status_code for i in range(6)]
    assert codes == [200] * 5 + [429]


def test_a_bad_address_or_unknown_camp_is_refused(client, camp, outbox):
    assert claim(client, "not-an-email").status_code == 422
    assert claim(client, "info@riversidesoccer.org", camp_id=str(uuid.uuid4())).status_code == 404
    assert outbox == []


# ---------------------------------------------------------------------------
# The migration (migrations/0032_claim_verification.sql)
# ---------------------------------------------------------------------------


async def test_claim_status_allows_review_and_codes_are_indexed(migrated: asyncpg.Connection) -> None:
    check = await migrated.fetchval(
        "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'claim_requests_status_check'")
    assert all(s in check for s in ("'pending'", "'needs_review'", "'verified'", "'rejected'"))
    cols = {r["column_name"] for r in await migrated.fetch(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'claim_requests'")}
    assert {"route", "token_hash", "token_sent_at"} <= cols
    assert await migrated.fetchval("SELECT to_regclass('public.claim_requests_token_hash_idx')") is not None
