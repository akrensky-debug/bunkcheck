"""Replies to the season update email, in the owner's own words: read, proposed, applied, and
told back in full. Where "same weeks as last year" is ambiguous, we ask instead of guessing."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from campfinder.alerts import service as alerts
from campfinder.owners import season, service, updates
from campfinder.owners.updates import ReadMessage, SeasonRead, SeasonSession

CAMP = "55555555-5555-5555-5555-555555555555"
OWNER = "director@lakeside.example"


@pytest.fixture
def camp(db):
    db.table("camps").insert({
        "id": CAMP, "slug": "lakeside", "name": "Lakeside Arts", "city": "Providence", "state": "RI", "zip": "02906",
        "region": "Providence, RI", "camp_type": "day", "is_active": True, "verification_status": "unverified",
        "season_year": 2026, "price_per_week": 310.0, "email": OWNER,
    }).execute()
    return service.find_camp(CAMP)


def weeks(db, *spans):
    db.table("sessions").insert([{"camp_id": CAMP, "name": f"Week {i}", "start_date": s, "end_date": e,
                                  "price": 310.0, "availability": "open"}
                                 for i, (s, e) in enumerate(spans, 1)]).execute()


def reader(season_read: SeasonRead | None = None, **kw):
    async def read(camp, sessions, body):
        return ReadMessage(season=season_read, needs_person=kw.get("needs_person", False), reason=kw.get("reason"))
    return read


SAME = SeasonRead(dates="same_as_last_year", dates_quote="Same weeks as last year",
                  price="given", price_per_week=295, price_quote="$295 a week",
                  registration="given", registration_opens="2027-01-15", registration_quote="registration opens Jan 15")


def rows(db, table, **match):
    return [r for r in db.tables.get(table, []) if all(str(r.get(k)) == str(v) for k, v in match.items())]


async def test_same_weeks_price_and_registration_day_from_a_reply(camp, db, outbox):
    weeks(db, ("2026-07-13", "2026-07-17"), ("2026-07-20", "2026-07-24"))     # no holiday moves: not ambiguous
    await season.send(camp, sent_by="Andrew")
    # The address the season email went to may answer it, without having confirmed a listing before.
    row = await updates.receive(OWNER, "Same weeks as last year, $295 a week, registration opens Jan 15. Thanks!",
                                reader=reader(SAME))
    assert row["status"] == "proposed", row.get("reason")
    assert rows(db, "camps", id=CAMP)[0]["season_year"] == 2026          # proposed, not applied

    done = await updates.apply(row["id"], handled_by="Andrew")
    assert done["status"] == "applied"
    camp_row = rows(db, "camps", id=CAMP)[0]
    assert camp_row["season_year"] == 2027 and camp_row["price_per_week"] == 295
    assert sorted(s["start_date"] for s in rows(db, "sessions", camp_id=CAMP)) == ["2027-07-12", "2027-07-19"]
    [window] = rows(db, "registration_windows", camp_id=CAMP)
    assert window["verified"] and window["opens_at"].startswith("2027-01-15")
    log = [c for c in rows(db, "listing_changes", camp_id=CAMP) if c["changed_by"] == "owner_email"]
    assert {"sessions", "season_year", "price_per_week", "registration_opens"} <= {c["field_name"] for c in log}
    assert all(c["actor"] == OWNER and "Same weeks as last year" in c["raw_message"] for c in log)
    assert season.count().owner_confirmed == 1

    back = outbox[-1]
    assert back.to == OWNER and back.subject == "Updated for 2027: Lakeside Arts"
    assert '(you wrote: "Same weeks as last year")' in back.text and '(you wrote: "$295 a week")' in back.text
    assert "Week 1: Mon Jul 13 to Fri Jul 17, 2026, $310" in back.text     # before, in full
    assert "Week 1: Mon Jul 12 to Fri Jul 16, 2027, $295" in back.text     # after, in full
    assert "Registration opens: Friday, January 15, 2027" in back.text and "Andrew" not in back.text

    db.table("registration_alerts").insert({"camp_id": CAMP, "email": "mom@example.com", "token": "t",
                                            "confirmed_at": "2026-11-01T00:00:00+00:00"}).execute()
    assert [i.kind for i in alerts.due(datetime(2026, 11, 20, 15, tzinfo=timezone.utc))] == ["announced"]


async def test_ambiguous_same_weeks_asks_back_then_takes_yes(camp, db, outbox):
    weeks(db, ("2026-06-29", "2026-07-03"), ("2026-07-06", "2026-07-10"))     # the Fourth moves weeks in 2027
    await season.send(camp, sent_by="Andrew")
    first = await updates.receive(OWNER, "Same weeks as last year, $295 a week, registration opens Jan 15.",
                                  reader=reader(SAME))
    assert first["status"] == "proposed" and first["proposal"]["ask"]
    assert first["proposal"]["season_facts"]["sessions"] is None             # dates not assumed

    done = await updates.apply(first["id"], handled_by="Andrew")
    assert done["status"] == "asked"
    camp_row = rows(db, "camps", id=CAMP)[0]
    assert camp_row["season_year"] == 2026 and camp_row["price_per_week"] == 295   # the clear parts are in
    question = outbox[-1]
    assert question.subject == "One question about your 2027 dates: Lakeside Arts"
    assert "Week 2: Mon Jul 5 to Fri Jul 9, 2027" in question.text
    assert "Mon Jul 5 is the Fourth of July holiday" in question.text
    assert 'Reply "yes" if these are right' in question.text and "We haven't put them on your listing yet" in question.text

    # Their next reply is read against the question.
    yes = await updates.receive(OWNER, "Yes, those are right.", reader=reader(SeasonRead(accepts_our_dates=True,
                                                                                         dates_quote="Yes")))
    assert yes["status"] == "proposed" and yes["proposal"]["answers"] == str(first["id"])
    await updates.apply(yes["id"], handled_by="Andrew")
    assert rows(db, "camps", id=CAMP)[0]["season_year"] == 2027
    assert sorted(s["start_date"] for s in rows(db, "sessions", camp_id=CAMP)) == ["2027-06-28", "2027-07-05"]
    assert updates.get_message(first["id"])["status"] == "applied"
    assert updates.pending_question(CAMP) is None


async def test_owner_corrects_the_dates_we_asked_about(camp, db, outbox):
    weeks(db, ("2026-06-29", "2026-07-03"), ("2026-07-06", "2026-07-10"))
    await season.send(camp, sent_by="Andrew")
    first = await updates.receive(OWNER, "same as last year", reader=reader(SeasonRead(dates="same_as_last_year")))
    await updates.apply(first["id"], handled_by="Andrew")
    fix = SeasonRead(dates="given", dates_quote="Week 2 starts Tuesday July 6", sessions=[
        SeasonSession(name="Week 1", start_date="2027-06-28", end_date="2027-07-02"),
        SeasonSession(name="Week 2", start_date="2027-07-06", end_date="2027-07-09")])
    row = await updates.receive(OWNER, "Week 2 starts Tuesday July 6", reader=reader(fix))
    await updates.apply(row["id"], handled_by="Andrew")
    assert sorted(s["start_date"] for s in rows(db, "sessions", camp_id=CAMP)) == ["2027-06-28", "2027-07-06"]
    assert "Week 2: Tue Jul 6 to Fri Jul 9, 2027" in outbox[-1].text


@pytest.mark.parametrize("read, why", [
    (SeasonRead(dates="given", sessions=[SeasonSession(start_date="2026-07-12", end_date="2026-07-16")]), "isn't in 2027"),
    (SeasonRead(registration="given", registration_opens="2027-01-15", registration_time="9ish"), "doesn't read as a time"),
    (SeasonRead(), "Nothing to change"),
])
async def test_what_doesnt_check_out_goes_to_a_person(camp, db, outbox, read, why):
    weeks(db, ("2026-07-13", "2026-07-17"))
    await season.send(camp, sent_by="Andrew")
    row = await updates.receive(OWNER, "...", reader=reader(read))
    assert row["status"] == "needs_person" and why in row["reason"]
    with pytest.raises(service.ConfirmationError):
        await updates.apply(row["id"], handled_by="Andrew")
    assert rows(db, "camps", id=CAMP)[0]["season_year"] == 2026


async def test_same_price_with_no_price_on_file_goes_to_a_person(camp, db, outbox):
    db.table("camps").update({"price_per_week": None}).eq("id", CAMP).execute()
    await season.send(service.find_camp(CAMP), sent_by="Andrew")
    row = await updates.receive(OWNER, "Same price", reader=reader(SeasonRead(price="same_as_last_year")))
    assert row["status"] == "needs_person" and "don't have last year's" in row["reason"]


async def test_a_refund_question_goes_to_a_person_even_with_facts(camp, db, outbox):
    await season.send(camp, sent_by="Andrew")
    row = await updates.receive(OWNER, "$295. Also can you refund a family?",
                                reader=reader(SeasonRead(price="given", price_per_week=295), needs_person=True,
                                              reason="Asks about a refund"))
    assert row["status"] == "needs_person" and row["reason"] == "Asks about a refund"


async def test_a_stranger_cant_answer_for_the_camp(camp, db, outbox):
    await season.send(camp, sent_by="Andrew")
    row = await updates.receive("someone@else.example", "Same weeks, $1", reader=reader(SAME))
    assert row["status"] == "needs_person" and "isn't a contact" in row["reason"]


async def test_auto_apply_takes_season_facts_from_a_verified_sender(camp, db, outbox, monkeypatch):
    weeks(db, ("2026-07-13", "2026-07-17"))
    await season.send(camp, sent_by="Andrew")
    monkeypatch.setenv("OWNER_UPDATES_AUTO_APPLY", "1")
    row = await updates.receive(OWNER, "Same weeks, $295, Jan 15", reader=reader(SAME))
    assert row["status"] == "proposed"                                       # SPF/DKIM not reported
    row = await updates.receive(OWNER, "Same weeks, $295, Jan 15", reader=reader(SAME), sender_verified=True)
    assert row["status"] == "applied" and rows(db, "camps", id=CAMP)[0]["season_year"] == 2027
