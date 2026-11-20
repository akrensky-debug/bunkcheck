"""Parent checks: "still right" or "this is wrong" on a camp's facts (docs/parent-checks.md)."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient

from campfinder.checks.__main__ import main as cli
from campfinder.owners.__main__ import main as owners_cli
from campfinder.services import checks
from tests.conftest import CAMP, OWNER, h

WEEK1 = "22222222-2222-2222-2222-222222222221"
WEEK2 = "22222222-2222-2222-2222-222222222222"
URL = f"/api/v1/camps/{CAMP}/checks"


@pytest.fixture
def camp(db: Any, monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    monkeypatch.setenv("OWNER_FORWARD_TO", "person@bunkcheck.test")
    db.table("camps").insert({
        "id": CAMP, "name": "Riverside Soccer Camp", "slug": "riverside-soccer", "is_active": True,
        "verification_status": "unverified", "age_min": 6, "age_max": 12, "price_per_week": 340,
        "extended_care": True, "transportation": None, "meals_included": False, "financial_aid": None,
        "website_url": "https://riversidesoccer.org", "registration_url": None, "email": "info@riversidesoccer.org",
    }).execute()
    db.table("sessions").insert([
        {"id": WEEK1, "camp_id": CAMP, "name": "Week 1", "start_date": "2027-07-05", "end_date": "2027-07-09",
         "price": 340, "availability": "open"},
        {"id": WEEK2, "camp_id": CAMP, "name": "Week 2", "start_date": "2027-07-12", "end_date": "2027-07-16",
         "price": 340, "availability": "open"},
    ]).execute()
    return db.table("camps").select("*").execute().data[0]


def rows(db: Any, table: str = "parent_checks") -> list[dict[str, Any]]:
    return db.table(table).select("*").execute().data


def fact(client: TestClient, field: str, session_id: str | None = None) -> dict[str, Any]:
    facts = client.get(URL).json()["facts"]
    return next(f for f in facts if f["field"] == field and f["session_id"] == session_id)


def right(field: str = "price_per_week", **more: Any) -> dict[str, Any]:
    return {"field": field, "verdict": "right", **more}


def wrong(field: str = "price_per_week", says: str = "It's $360 a week now", **more: Any) -> dict[str, Any]:
    return {"field": field, "verdict": "wrong", "says": says, **more}


def send(client: TestClient, answers: list[dict[str, Any]], **body: Any) -> Any:
    return client.post(URL, json={"answers": answers, **body})


def link_token(outbox: Any, to: str) -> str:
    mail = [e for e in outbox if e.to == to][-1]
    return re.search(r"/checks/([\w-]+)", mail.text).group(1)


def confirmed(client: TestClient, outbox: Any, email: str, answers: list[dict[str, Any]]) -> str:
    """Send answers from a typed address and press Confirm on the emailed link."""
    assert send(client, answers, email=email).status_code == 202
    token = link_token(outbox, email)
    assert client.post(f"/api/v1/checks/{token}/confirm").status_code == 200
    return token


# ---------------------------------------------------------------------------
# What a parent can check
# ---------------------------------------------------------------------------

def test_the_facts_a_parent_can_check(client: TestClient, camp: dict) -> None:
    res = client.get(URL)
    assert res.status_code == 200
    facts = res.json()["facts"]
    by = {(f["field"], f["session_id"]): f for f in facts}
    assert by[("ages", None)]["shown"] == "6 to 12" and by[("price_per_week", None)]["shown"] == "$340 a week"
    assert by[("transportation", None)]["value"] is None and by[("transportation", None)]["shown"] == "not in the listing"
    assert by[("session_dates", WEEK1)]["shown"] == "2027-07-05 to 2027-07-09"
    assert by[("session_availability", WEEK2)]["session_name"] == "Week 2"
    assert all(f["right_count"] == 0 and not f["checking"] for f in facts)
    assert client.get("/api/v1/camps/riverside-soccer/checks").status_code == 200   # by slug too
    assert client.get("/api/v1/camps/no-such-camp/checks").status_code == 404


# ---------------------------------------------------------------------------
# A report: needs nothing, reaches a person, changes nothing
# ---------------------------------------------------------------------------

def test_a_report_needs_no_address_and_reaches_the_inbox(client: TestClient, db: Any, camp: dict, outbox: Any) -> None:
    res = send(client, [wrong(basis="registered", evidence_url="https://riversidesoccer.org/register")])
    assert res.status_code == 202 and res.json() == {"status": "received"}
    (row,) = rows(db)
    assert row["status"] == "open" and row["reporter_id"] is None and row["value_seen"] == 340.0
    (mail,) = outbox
    assert mail.to == "person@bunkcheck.test" and mail.subject == "Parent report: a fact at Riverside Soccer Camp"
    assert "The listing said: $340 a week" in mail.text and "It's $360 a week now" in mail.text
    assert "I registered there" in mail.text and str(row["id"])[:8] in mail.text
    # Nothing changed on the listing, and nothing shows on the page.
    assert db.table("camps").select("*").execute().data[0]["price_per_week"] == 340
    assert rows(db, "listing_changes") == []
    assert not fact(client, "price_per_week")["checking"]


def test_a_report_can_say_what_the_listing_lacks(client: TestClient, db: Any, camp: dict) -> None:
    assert send(client, [wrong("transportation", "There's a bus from Hope Street")]).status_code == 202
    assert rows(db)[0]["value_seen"] is None
    # "We don't know if it's full" is nothing to vouch for, but a parent can tell us.
    db.table("sessions").update({"availability": "unknown"}).eq("id", WEEK1).execute()
    assert fact(client, "session_availability", WEEK1)["value"] is None
    assert send(client, [right("session_availability", session_id=WEEK1)], email="mom@example.com").status_code == 422
    assert send(client, [wrong("session_availability", "Week 1 is full", session_id=WEEK1)]).status_code == 202


def test_what_we_refuse(client: TestClient, db: Any, camp: dict, outbox: Any) -> None:
    cases = [
        ([{"field": "description_full", "verdict": "wrong", "says": "boring"}], "can't take an answer"),
        ([wrong(says="  ")], "what it is now"),
        ([wrong(evidence_url="javascript:alert(1)")], "http"),
        ([wrong("session_price")], "session"),                                   # which session?
        ([wrong("session_price", session_id="33333333-3333-3333-3333-333333333333")], "session"),
        ([wrong("ages", session_id=WEEK1)], "about the camp"),
        ([right()], "needs your email address"),                                 # a "still right" with nobody behind it
    ]
    for answers, says in cases:
        res = send(client, answers)
        assert res.status_code == 422 and says in res.json()["detail"], (answers, res.text)
    nothing_listed = send(client, [right("transportation")], email="mom@example.com")   # nothing to vouch for
    assert nothing_listed.status_code == 422 and "doesn't say anything" in nothing_listed.json()["detail"]
    assert send(client, [wrong()], email="not an address").status_code == 422
    assert send(client, [wrong(says="x" * 281)]).status_code == 422
    assert send(client, []).status_code == 422
    assert rows(db) == [] and outbox == []                                       # one bad answer stores none of them


# ---------------------------------------------------------------------------
# "Still right": counts only from a proven address
# ---------------------------------------------------------------------------

def test_a_right_counts_only_after_confirm(client: TestClient, db: Any, camp: dict, outbox: Any) -> None:
    assert send(client, [right(), right("ages")], email=" Mom@Example.com ").status_code == 202
    assert {r["status"] for r in rows(db)} == {"unconfirmed"}
    (mail,) = outbox                                           # only the confirm email: a "right" isn't a report
    assert mail.to == "mom@example.com" and "Riverside Soccer Camp" in mail.subject
    token = link_token(outbox, "mom@example.com")
    (reporter,) = rows(db, "parent_reporters")
    assert token not in str(reporter) and reporter["confirmed_at"] is None       # only the hash is stored

    # Opening the link changes nothing, however often a mail scanner does it.
    for _ in range(3):
        page = client.get(f"/api/v1/checks/{token}").json()
        assert page["status"] == "pending" and page["email_hint"] == "m••@example.com"
        assert [(a["label"], a["verdict"], a["shown"]) for a in page["answers"]] == [
            ("Price a week", "right", "$340 a week"), ("Ages", "right", "6 to 12")]
    assert {r["status"] for r in rows(db)} == {"unconfirmed"}

    done = client.post(f"/api/v1/checks/{token}/confirm").json()
    assert done["status"] == "on" and done["answers"] == []
    assert {r["status"] for r in rows(db)} == {"counted"} and rows(db, "parent_reporters")[0]["confirmed_at"]
    assert client.get("/api/v1/checks/not-a-token").status_code == 404


def test_a_count_shows_from_two_parents_and_only_for_the_value_listed(client: TestClient, db: Any, camp: dict, outbox: Any) -> None:
    confirmed(client, outbox, "mom@example.com", [right()])
    assert fact(client, "price_per_week")["right_count"] == 0                  # one parent shows nothing
    confirmed(client, outbox, "dad@example.com", [right()])
    seen = fact(client, "price_per_week")
    assert seen["right_count"] == 2 and seen["latest_right"] == datetime.now(timezone.utc).date().isoformat()
    assert fact(client, "ages")["right_count"] == 0

    # The price moves: the checks were for $340, so they stop counting.
    db.table("camps").update({"price_per_week": 360}).eq("id", CAMP).execute()
    assert fact(client, "price_per_week")["right_count"] == 0
    db.table("camps").update({"price_per_week": 340}).eq("id", CAMP).execute()
    assert fact(client, "price_per_week")["right_count"] == 2


def test_one_parent_counts_once(client: TestClient, db: Any, camp: dict, outbox: Any) -> None:
    token = confirmed(client, outbox, "mom@example.com", [right()])
    # Her browser kept the token of the link she confirmed, so later answers count at once.
    assert send(client, [right()], token=token).status_code == 202
    assert send(client, [right()], token=token).status_code == 202
    assert [r["status"] for r in rows(db)] == ["counted"]                       # the newer answer replaced the older
    assert fact(client, "price_per_week")["right_count"] == 0
    # A newer "wrong" from her replaces her "right".
    assert send(client, [wrong()], token=token).status_code == 202
    assert [(r["verdict"], r["status"]) for r in rows(db)] == [("wrong", "open")]


def test_a_right_stops_counting_after_ninety_days(client: TestClient, db: Any, camp: dict, outbox: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    confirmed(client, outbox, "mom@example.com", [right()])
    confirmed(client, outbox, "dad@example.com", [right()])
    assert fact(client, "price_per_week")["right_count"] == 2
    later = datetime.now(timezone.utc) + checks.COUNT_FOR + timedelta(days=1)
    monkeypatch.setattr(checks, "_now", lambda: later)
    assert fact(client, "price_per_week")["right_count"] == 0


def test_a_typed_address_proves_nothing_even_a_confirmed_one(client: TestClient, db: Any, camp: dict, outbox: Any) -> None:
    confirmed(client, outbox, "mom@example.com", [right()])
    confirmed(client, outbox, "dad@example.com", [right()])
    # Someone types mom's address. Her counted answer stays; theirs waits for her inbox.
    assert send(client, [wrong(says="closed for good")], email="mom@example.com").status_code == 202
    mine = sorted(rows(db), key=lambda r: r["verdict"])
    assert [(r["verdict"], r["status"], bool(r["confirmed_at"])) for r in mine if r["verdict"] == "right"] == [
        ("right", "counted", True)] * 2
    assert [(r["status"], r["confirmed_at"]) for r in mine if r["verdict"] == "wrong"] == [("open", None)]
    assert fact(client, "price_per_week")["right_count"] == 2
    # A token that isn't a confirmed link is no identity at all.
    assert send(client, [right()], token="made-up").status_code == 422


def test_a_signed_in_parent_skips_the_email(client: TestClient, db: Any, camp: dict, outbox: Any) -> None:
    assert client.post(URL, json={"answers": [right()]}, headers=h(OWNER)).status_code == 202
    assert outbox == [] and rows(db)[0]["status"] == "counted"
    (reporter,) = rows(db, "parent_reporters")
    assert reporter["email"] == "mom@example.com" and reporter["confirmed_at"]


def test_the_link_expires_after_seven_days(client: TestClient, db: Any, camp: dict, outbox: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    send(client, [right()], email="mom@example.com")
    token = link_token(outbox, "mom@example.com")
    later = datetime.now(timezone.utc) + checks.CONFIRM_FOR + timedelta(hours=1)
    monkeypatch.setattr(checks, "_now", lambda: later)
    assert client.get(f"/api/v1/checks/{token}").json()["status"] == "expired"
    assert client.post(f"/api/v1/checks/{token}/confirm").status_code == 410
    assert rows(db)[0]["status"] == "unconfirmed"


def test_stop_deletes_the_address_and_keeps_proven_answers(client: TestClient, db: Any, camp: dict, outbox: Any) -> None:
    token = confirmed(client, outbox, "mom@example.com", [right()])
    confirmed(client, outbox, "dad@example.com", [right()])
    send(client, [right("ages")], email="mom@example.com")      # typed again, never confirmed
    assert client.post(f"/api/v1/checks/{token}/stop").json() == {"status": "stopped", "email_hint": None, "answers": []}
    assert [r["email"] for r in rows(db, "parent_reporters")] == ["dad@example.com"]
    kept = rows(db)
    assert [r["field_name"] for r in kept] == ["price_per_week"] * 2           # the unproven answer went with her
    assert sum(1 for r in kept if r["reporter_id"] is None) == 1
    assert fact(client, "price_per_week")["right_count"] == 2                  # her answer still counts, without her
    assert client.post(f"/api/v1/checks/{token}/stop").status_code == 404


# ---------------------------------------------------------------------------
# Limits
# ---------------------------------------------------------------------------

def test_one_address_cannot_flood_the_queue(client: TestClient, db: Any, camp: dict) -> None:
    for _ in range(10):
        assert send(client, [wrong()]).status_code == 202
    assert send(client, [wrong()]).status_code == 429
    assert len(rows(db)) == 10


def test_a_camp_cannot_be_buried_in_email(client: TestClient, db: Any, camp: dict, outbox: Any) -> None:
    for n in range(checks.CAMP_DAILY_REPORTS + 2):
        checks.ip_hourly.clear()                                   # as if from many addresses
        assert send(client, [wrong(says=f"report {n}")]).status_code == 202
    assert len(rows(db)) == checks.CAMP_DAILY_REPORTS + 2          # all stored
    assert len(outbox) == checks.CAMP_DAILY_REPORTS                # the person hears about the first thirty


def test_an_inbox_cannot_be_mail_bombed(client: TestClient, db: Any, camp: dict, outbox: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    send(client, [right()], email="victim@example.com")
    send(client, [right("ages")], email="victim@example.com")     # within the hour: no second email
    assert len(outbox) == 1
    start = datetime.now(timezone.utc)
    for hours in (2, 4, 6, 8):
        monkeypatch.setattr(checks, "_now", lambda hours=hours: start + timedelta(hours=hours))
        send(client, [right()], email="victim@example.com")
    assert len(outbox) == 3                                        # three confirm emails a day, then none
    assert len(rows(db)) == 6                                      # the answers are kept, waiting


def test_the_answer_never_says_whose_address_we_hold(client: TestClient, camp: dict, outbox: Any) -> None:
    confirmed(client, outbox, "mom@example.com", [right()])
    known = send(client, [right()], email="mom@example.com")
    new = send(client, [right()], email="new@example.com")
    assert known.status_code == new.status_code == 202 and known.json() == new.json() == {"status": "received"}


# ---------------------------------------------------------------------------
# The person's side: the four outcomes
# ---------------------------------------------------------------------------

def report_id(db: Any) -> str:
    return str(next(r for r in rows(db) if r["verdict"] == "wrong")["id"])


def test_fixed_needs_the_listing_changed_and_logs_the_parents_words(client: TestClient, db: Any, camp: dict, capsys: Any) -> None:
    send(client, [wrong(basis="camp_site")])
    rid = report_id(db)
    assert cli(["inbox"]) == 0
    out = capsys.readouterr().out
    assert "1 waiting" in out and "Riverside Soccer Camp" in out and rid[:8] in out

    assert cli(["fixed", rid[:8], "--by", "Andrew"]) == 1                      # the listing still says $340
    assert "still says $340 a week" in capsys.readouterr().err
    assert rows(db)[0]["status"] == "open" and rows(db, "listing_changes") == []

    db.table("camps").update({"price_per_week": 360}).eq("id", CAMP).execute()  # changed the way it's changed today
    db.table("field_sources").insert({"camp_id": CAMP, "field_name": "price_per_week", "source_type": "public_web",
                                      "source_url": "https://old"}).execute()
    assert cli(["fixed", rid[:8], "--by", "Andrew", "--source", "https://riversidesoccer.org/rates"]) == 0
    (row,) = rows(db)
    (change,) = rows(db, "listing_changes")
    assert row["status"] == "fixed" and row["handled_by"] == "Andrew" and row["listing_change_id"] == change["id"]
    assert (change["changed_by"], change["actor"], change["old_value"], change["new_value"]) == ("team", "Andrew", 340.0, 360.0)
    assert "It's $360 a week now" in change["raw_message"] and "camp_site" in change["raw_message"]
    (source,) = rows(db, "field_sources")                                      # upgraded in place, not doubled
    assert source["source_type"] == "team_verified" and source["source_url"] == "https://riversidesoccer.org/rates"

    assert cli(["as-listed", rid, "--by", "Andrew"]) == 1                      # handled once
    assert "already handled" in capsys.readouterr().err
    assert cli(["inbox"]) == 0 and "0 waiting" in capsys.readouterr().out


def test_as_listed_and_close(client: TestClient, db: Any, camp: dict, capsys: Any) -> None:
    send(client, [wrong(), wrong("ages", "The counselors are careless and my son Max hated it",
                                 evidence_url="https://example.com/rant")])
    price, ages = (str(next(r for r in rows(db) if r["field_name"] == f)["id"]) for f in ("price_per_week", "ages"))
    assert cli(["as-listed", price, "--by", "Andrew"]) == 0
    assert cli(["close", ages, "--by", "Andrew", "--reason", "not_a_fact"]) == 0
    by = {r["field_name"]: r for r in rows(db)}
    assert by["price_per_week"]["status"] == "as_listed" and by["price_per_week"]["says"]
    closed = by["ages"]
    assert (closed["status"], closed["reason"], closed["says"], closed["evidence_url"]) == ("closed", "not_a_fact", None, None)
    assert rows(db, "listing_changes") == []
    assert cli(["show", "nope"]) == 1


def test_ask_camp_sends_nothing_and_shows_on_the_page_and_in_the_owner_queue(
        client: TestClient, db: Any, camp: dict, outbox: Any, capsys: Any) -> None:
    send(client, [wrong("session_availability", "Week 1 is full", session_id=WEEK1)])
    outbox.clear()
    rid = report_id(db)
    assert not fact(client, "session_availability", WEEK1)["checking"]         # nothing shows before a person looks
    assert cli(["ask-camp", rid, "--by", "Andrew"]) == 0
    assert outbox == []                                                        # writing to a camp is Andrew's call
    assert fact(client, "session_availability", WEEK1)["checking"]
    assert not fact(client, "session_availability", WEEK2)["checking"]
    capsys.readouterr()
    assert cli(["inbox"]) == 0 and "asking_camp" in capsys.readouterr().out    # still waiting
    assert owners_cli(["queue"]) == 0
    assert "Riverside Soccer Camp: full or open" in capsys.readouterr().out
    # The camp answers by phone; the team records the spots, then closes the report.
    db.table("sessions").update({"availability": "full"}).eq("id", WEEK1).execute()
    assert cli(["fixed", rid, "--by", "Andrew"]) == 0
    assert not fact(client, "session_availability", WEEK1)["checking"]
    assert rows(db, "field_sources") == []                                     # no page was read, so no source changes


# ---------------------------------------------------------------------------
# The owner's export
# ---------------------------------------------------------------------------

def test_the_export_has_the_accounts_own_checks(client: TestClient, db: Any, camp: dict, outbox: Any, family: dict) -> None:
    assert client.post(URL, json={"answers": [right(), wrong("ages", "It's 5 to 12")]}, headers=h(OWNER)).status_code == 202
    confirmed(client, outbox, "someone@else.com", [right()])
    data = client.get(f"/api/v1/families/{family['id']}/export", headers=h(OWNER)).json()
    mine = data["parent_checks"]
    assert sorted((c["field_name"], c["verdict"]) for c in mine) == [("ages", "wrong"), ("price_per_week", "right")]
    assert "confirm_token_hash" not in str(data) and "someone@else.com" not in str(data)


# ---------------------------------------------------------------------------
# The real schema (the fakes don't know a CHECK constraint)
# ---------------------------------------------------------------------------

async def test_the_schema_takes_what_the_service_writes(migrated: Any) -> None:
    import asyncpg

    from campfinder.models.checks import SAYS_MAX

    tx = migrated.transaction()
    await tx.start()
    try:
        camp = await migrated.fetchval(
            "INSERT INTO camps (name, city, state, zip, camp_type, location) VALUES "
            "('Check Camp', 'Providence', 'RI', '02906', 'day', ST_GeogFromText('POINT(-71.4 41.8)')) RETURNING id")
        who = await migrated.fetchval("INSERT INTO parent_reporters (email) VALUES ('mom@example.com') RETURNING id")
        insert = ("INSERT INTO parent_checks (camp_id, field_name, verdict, value_seen, says, basis, reporter_id, status) "
                  "VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)")
        for status in ("unconfirmed", "counted"):
            await migrated.execute(insert, camp, "price_per_week", "right", "340.0", None, None, who, status)
        for status in (*checks.WAITING, "fixed", "as_listed", "closed"):
            for basis in (None, "registered", "camp_site", "camp_told_me", "other"):
                await migrated.execute(insert, camp, "ages", "wrong", '{"min": 6, "max": 12}', "x" * SAYS_MAX, basis, who, status)

        async def refused(*args: Any) -> None:
            inner = migrated.transaction()
            await inner.start()
            try:
                with pytest.raises(asyncpg.CheckViolationError):
                    await migrated.execute(insert, *args)
            finally:
                await inner.rollback()

        await refused(camp, "ages", "wrong", None, "x" * (SAYS_MAX + 1), None, who, "open")
        await refused(camp, "ages", "maybe", None, None, None, who, "open")
        await refused(camp, "ages", "wrong", None, "x", "a hunch", who, "open")
        await refused(camp, "ages", "wrong", None, "x", None, who, "shown")
        with pytest.raises(asyncpg.UniqueViolationError):
            inner = migrated.transaction()
            await inner.start()
            try:
                await migrated.execute("INSERT INTO parent_reporters (email) VALUES ('mom@example.com')")
            finally:
                await inner.rollback()

        # "Stop" deletes the address; the answers stay without it.
        await migrated.execute("DELETE FROM parent_reporters WHERE id = $1", who)
        assert await migrated.fetchval("SELECT count(*) FROM parent_checks WHERE camp_id = $1 AND reporter_id IS NULL", camp) == 27
    finally:
        await tx.rollback()
