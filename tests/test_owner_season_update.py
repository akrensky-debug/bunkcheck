"""The season update email: 'here is your 2026 season; send us 2027'. The owner is the checker."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import pytest

from campfinder.alerts import service as alerts
from campfinder.owners import season, service
from campfinder.owners.__main__ import main as cli

CAMP = "44444444-4444-4444-4444-444444444444"
FAR = "44444444-4444-4444-4444-444444444445"
WEEK_1, WEEK_2 = "77777777-0000-0000-0000-000000000001", "77777777-0000-0000-0000-000000000002"
OWNER = "director@riverside.example"


@pytest.fixture
def camp(db):
    base = {"state": "RI", "zip": "02906", "camp_type": "day", "age_min": 6, "age_max": 12, "is_active": True,
            "primary_categories": ["sports"], "season_year": 2026, "website_url": "https://riverside.example"}
    db.table("camps").insert([
        # Not checked by a person: the season update doesn't need it.
        {**base, "id": CAMP, "slug": "riverside", "name": "Riverside Soccer Camp", "city": "Providence",
         "region": "Providence, RI", "price_per_week": 325.0, "verification_status": "unverified"},
        {**base, "id": FAR, "slug": "far-away", "name": "Far Away Camp", "city": "Burlington", "state": "VT",
         "region": "Vermont", "price_per_week": 300.0, "verification_status": "unverified", "email": "hi@far.example"},
    ]).execute()
    db.table("sessions").insert([
        {"id": WEEK_1, "camp_id": CAMP, "name": "Week 1", "start_date": "2026-06-29", "end_date": "2026-07-03",
         "price": 325.0, "availability": "full", "spots_total": 20, "spots_available": 0},
        {"id": WEEK_2, "camp_id": CAMP, "name": "Week 2", "start_date": "2026-07-06", "end_date": "2026-07-10",
         "price": 325.0, "availability": "open"},
    ]).execute()
    db.table("camp_contacts").insert({"camp_id": CAMP, "email": OWNER, "name": "Dana Reyes", "is_primary": True}).execute()
    db.table("field_sources").insert({"camp_id": CAMP, "field_name": "price_per_week", "source_type": "public_web",
                                      "source_url": "https://riverside.example/rates"}).execute()
    return service.find_camp(CAMP)


def token_from(email) -> str:
    link = next(line for line in email.text.splitlines() if "/owners/update/" in line)
    return link.rsplit("/owners/update/", 1)[1].strip()


def rows(db, table, **match):
    return [r for r in db.tables.get(table, []) if all(str(r.get(k)) == str(v) for k, v in match.items())]


# ---------------------------------------------------------------------------
# "Same weeks as last year"
# ---------------------------------------------------------------------------

def test_same_weeks_keeps_weekdays_and_flags_the_fourth_of_july():
    assert season.shift_date(date(2026, 6, 29)) == date(2027, 6, 28)          # Monday to Monday
    assert season.shift_date(date(2027, 7, 5)) == date(2028, 7, 3)            # across 29 February
    weeks = season.same_weeks([
        {"name": "Week 1", "start_date": "2026-06-29", "end_date": "2026-07-03"},
        {"name": "Week 2", "start_date": "2026-07-06", "end_date": "2026-07-10"},
        {"name": "Week 3", "start_date": "2026-07-13", "end_date": "2026-07-17"},
    ], 2027)
    assert [(w.start_date, w.end_date) for w in weeks] == [
        (date(2027, 6, 28), date(2027, 7, 2)), (date(2027, 7, 5), date(2027, 7, 9)), (date(2027, 7, 12), date(2027, 7, 16))]
    # 2026: the Fourth (a Saturday) was observed Friday 3 July, in Week 1. 2027: Monday 5 July, in Week 2.
    assert "Last year this session had the Fourth of July holiday" in weeks[0].note
    assert weeks[1].note == "Mon Jul 5 is the Fourth of July holiday. Last year this session had no holiday."
    assert weeks[2].note is None


def test_midnight_shows_as_the_day_alone():
    from campfinder.booking.service import _fmt_when, local_tz
    assert _fmt_when(datetime(2027, 1, 15, tzinfo=local_tz())) == "Fri Jan 15"
    assert _fmt_when(datetime(2027, 1, 15, 9, tzinfo=local_tz())) == "Fri Jan 15 at 9:00 am"


# ---------------------------------------------------------------------------
# The email
# ---------------------------------------------------------------------------

async def test_preview_shows_2026_labeled_and_asks_three_things(camp, db, outbox, capsys):
    assert cli(["preview", CAMP, "--update"]) == 0
    out = capsys.readouterr().out
    assert "To: director@riverside.example" in out and "Hi Dana," in out
    assert "still shows Riverside Soccer Camp's 2026 season" in out
    for ask in ("Your 2027 session dates", "Your 2027 price per week", "The day 2027 registration opens"):
        assert ask in out
    assert "from your 2026 season" in out and "Price per week (2026): $325" in out
    assert "Week 1: Mon Jun 29 to Fri Jul 3, 2026, $325" in out
    assert "/owners/update/" in out and "reply to this email in your own words" in out.lower()
    assert "(preview only: nothing recorded or sent" in out
    assert "Thanks,\nBunkcheck" in out and "Andrew" not in out
    assert "—" not in out and "–" not in out                     # house style: no dashes
    assert not db.tables.get("listing_confirmations") and outbox == []


async def test_the_owner_is_the_checker(camp, db, outbox):
    # The old email still needs a person's check first...
    with pytest.raises(service.ConfirmationError, match="checked by a person"):
        await service.send(camp, sent_by="Andrew")
    assert [c["name"] for c, _ in service.queue().ready] == []
    # ...the season update doesn't.
    assert [c["name"] for c, _ in season.queue().ready] == ["Far Away Camp", "Riverside Soccer Camp"]
    assert [c["name"] for c, _ in season.queue(region="Providence, RI").ready] == ["Riverside Soccer Camp"]
    await season.send(camp, sent_by="Andrew")
    row = db.tables["listing_confirmations"][0]
    assert row["kind"] == "season_update" and row["season_year"] == 2027 and row["status"] == "sent"
    assert row["snapshot"]["sessions"][0]["start_date"] == "2026-06-29"
    assert rows(db, "listing_changes", field_name="season_update")[0]["actor"] == "Andrew"
    waiting = dict((c["name"], why) for c, why in season.queue().waiting)
    assert waiting["Riverside Soccer Camp"].startswith("asked; link works until")


def test_send_ready_update_lists_then_sends(camp, db, outbox, capsys):
    assert cli(["send-ready", "--update", "--by", "Andrew", "--limit", "1"]) == 0
    assert "would ask Far Away Camp" in capsys.readouterr().out and outbox == []
    assert cli(["send-ready", "--update", "--by", "Andrew", "--limit", "5", "--yes"]) == 0
    assert "/owners/update/" in capsys.readouterr().out and len(outbox) == 2


# ---------------------------------------------------------------------------
# The form
# ---------------------------------------------------------------------------

ANSWER = {
    "sessions": [{"name": "Week 1", "start_date": "2027-06-28", "end_date": "2027-07-02"},
                 {"name": "Week 2", "start_date": "2027-07-06", "end_date": "2027-07-09"},
                 {"name": "Week 3", "start_date": "2027-07-12", "end_date": "2027-07-16"}],
    "price_per_week": 295, "registration_opens": "2027-01-15", "rest_is_right": True,
}


async def test_form_puts_2027_on_the_listing_and_tells_the_owner(client, camp, db, outbox):
    await season.send(camp, sent_by="Andrew")
    token = token_from(outbox[-1])
    assert client.get(f"/api/v1/owners/confirm/{token}").status_code == 404     # each link fits one page

    view = client.get(f"/api/v1/owners/update/{token}").json()                 # looking changes nothing
    assert view["season_year"] == 2027 and view["shown_season"] == 2026 and view["registration"] is None
    assert [s["start_date"] for s in view["suggested"]] == ["2027-06-28", "2027-07-05"]
    assert "Fourth of July" in view["suggested"][1]["note"]
    assert db.tables["camps"][0]["season_year"] == 2026

    res = client.post(f"/api/v1/owners/update/{token}", json=ANSWER)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["camp_verified"] and body["registration_now"] == "Friday, January 15, 2027"

    camp_row = rows(db, "camps", id=CAMP)[0]
    assert camp_row["season_year"] == 2027 and camp_row["price_per_week"] == 295
    assert camp_row["verification_status"] == "camp_verified"
    sessions = sorted(rows(db, "sessions", camp_id=CAMP), key=lambda s: s["start_date"])
    # Same rows, new dates: a family's saved pick of Week 1 still points at Week 1.
    assert [s["id"] for s in sessions[:2]] == [WEEK_1, WEEK_2]
    assert [(s["start_date"], s["price"]) for s in sessions] == [
        ("2027-06-28", 295), ("2027-07-06", None), ("2027-07-12", None)]
    # $325 was the weekly rate, so Week 1 is now $295. Week 2 is a four-day holiday week and Week 3
    # is new: their prices are left blank, not guessed.
    assert sessions[0]["availability"] == "unknown" and sessions[0]["spots_available"] is None  # last year's "full" is gone

    sources = {f["field_name"]: f for f in rows(db, "field_sources", camp_id=CAMP)}
    assert {"sessions", "price_per_week", "registration_opens", "name", "city", "website_url"} <= set(sources)
    assert all(f["source_type"] == "camp_verified" for f in sources.values())
    assert sources["price_per_week"]["source_url"] == "https://riverside.example/rates"   # upgraded in place

    [window] = rows(db, "registration_windows", camp_id=CAMP)
    assert window["verified"] and window["opens_at"].startswith("2027-01-15T00:00:00-05:00")
    assert rows(db, "camp_contacts", camp_id=CAMP)[0]["verified_at"] is not None

    log = {c["field_name"]: c for c in rows(db, "listing_changes", camp_id=CAMP) if c["changed_by"] == "owner_web"}
    assert {"sessions", "season_year", "price_per_week", "registration_opens", "verification_status"} <= set(log)
    assert log["season_year"]["old_value"] == 2026 and log["season_year"]["actor"] == OWNER
    assert '"price_per_week":295' in log["price_per_week"]["raw_message"]

    back = outbox[-1]
    assert back.to == OWNER and back.subject == "Updated for 2027: Riverside Soccer Camp"
    assert "Week 1: Mon Jun 29 to Fri Jul 3, 2026, $325" in back.text      # before
    assert "Week 1: Mon Jun 28 to Fri Jul 2, 2027, $295" in back.text      # after
    assert "Price per week (2027)" in back.text and "$325" in back.text and "$295" in back.text
    assert "Registration opens: Friday, January 15, 2027" in back.text
    assert "reply to this email and a person will fix it" in back.text.lower() and "Andrew" not in back.text

    assert client.post(f"/api/v1/owners/update/{token}", json=ANSWER).status_code == 404   # used up
    c = season.count()
    assert (c.live, c.owner_confirmed, c.shows_season) == (1, 1, 1)
    assert [c["name"] for c, _ in season.queue(region="Providence, RI").ready] == []


async def test_a_bad_answer_changes_nothing(client, camp, db, outbox):
    await season.send(camp, sent_by="Andrew")
    token = token_from(outbox[-1])
    bad = {**ANSWER, "sessions": [{"name": "Week 1", "start_date": "2026-06-28", "end_date": "2026-07-02"}]}
    res = client.post(f"/api/v1/owners/update/{token}", json=bad)
    assert res.status_code == 422 and "isn't in 2027" in res.json()["detail"]
    assert rows(db, "camps", id=CAMP)[0]["season_year"] == 2026
    assert client.get(f"/api/v1/owners/update/{token}").status_code == 200    # the link still works
    assert client.post(f"/api/v1/owners/update/{token}", json={}).status_code == 422


async def test_registration_day_only_feeds_alerts_and_keeps_2026(client, camp, db, outbox):
    db.table("registration_alerts").insert({"camp_id": CAMP, "email": "dad@example.com", "token": "t1",
                                            "confirmed_at": "2026-11-01T00:00:00+00:00"}).execute()
    assert alerts.due(datetime.now(timezone.utc)) == []
    await season.send(camp, sent_by="Andrew")
    token = token_from(outbox[-1])
    res = client.post(f"/api/v1/owners/update/{token}", json={
        "dates_not_set": True, "price_not_set": True, "registration_opens": "2027-01-15",
        "registration_time": "09:00", "note": "We may add a fifth week."})
    assert res.status_code == 200 and not res.json()["camp_verified"]
    assert rows(db, "camps", id=CAMP)[0]["season_year"] == 2026          # no dates, so still the 2026 season
    assert "aren't set yet" in outbox[-1].text and "Friday, January 15, 2027 at 9:00 am" in outbox[-1].text

    # The parent who asked hears about it.
    [item] = alerts.due(datetime(2026, 11, 20, 15, tzinfo=timezone.utc))
    assert item.kind == "announced" and item.opens_at.astimezone(timezone.utc).hour == 14

    # The note goes where a person reads owners' email.
    [note] = rows(db, "owner_messages", camp_id=CAMP)
    assert note["status"] == "needs_person" and note["body"] == "We may add a fifth week."

    c = season.count()
    assert (c.owner_confirmed, c.answered_without_dates) == (0, 1)
    [(_, why)] = [w for w in season.queue().waiting if w[0]["id"] == CAMP]
    assert why.startswith("answered") and "without 2027 dates" in why
    later = datetime.now(timezone.utc) + timedelta(days=22)
    assert CAMP in [c["id"] for c, _ in season.queue(now=later).ready]


async def test_the_owner_moves_an_existing_registration_date(client, camp, db, outbox):
    db.table("registration_windows").insert({"camp_id": CAMP, "opens_at": "2027-01-10T14:00:00+00:00",
                                             "verified": False, "source_url": "https://riverside.example"}).execute()
    db.table("registration_windows").insert({"camp_id": CAMP, "opens_at": "2026-01-12T14:00:00+00:00",
                                             "verified": True}).execute()   # last season's stays as it was
    await season.send(camp, sent_by="Andrew")
    client.post(f"/api/v1/owners/update/{token_from(outbox[-1])}", json={"registration_opens": "2027-01-15"})
    wins = sorted(rows(db, "registration_windows", camp_id=CAMP), key=lambda w: w["opens_at"])
    assert len(wins) == 2 and wins[0]["opens_at"].startswith("2026-01-12")
    assert wins[1]["opens_at"].startswith("2027-01-15") and wins[1]["verified"]
    assert "(not checked)" in outbox[-1].text


async def test_rest_is_right_is_refused_if_we_changed_the_listing(client, camp, db, outbox):
    await season.send(camp, sent_by="Andrew")
    db.table("camps").update({"age_max": 13}).eq("id", CAMP).execute()
    res = client.post(f"/api/v1/owners/update/{token_from(outbox[-1])}", json=ANSWER).json()
    assert not res["camp_verified"] and "didn't mark the rest" in res["skipped"][0]
    assert rows(db, "camps", id=CAMP)[0]["season_year"] == 2027        # the facts they sent still count
    assert not rows(db, "field_sources", camp_id=CAMP, field_name="name")


async def test_queue_prints_the_january_number(camp, db, capsys):
    assert cli(["queue", "--update"]) == 0
    out = capsys.readouterr().out
    assert out.startswith("Providence, RI: 0 of 1 live camps have 2027 facts confirmed by the owner.")
    assert "Ready to ask, the season update (2):" in out


async def test_a_price_without_dates_waits_for_the_dates(client, camp, db, outbox):
    await season.send(camp, sent_by="Andrew")
    res = client.post(f"/api/v1/owners/update/{token_from(outbox[-1])}",
                      json={"dates_not_set": True, "price_per_week": 295}).json()
    # $295 next to 2026 dates would read as the 2026 price, so the listing keeps $325 for now.
    assert rows(db, "camps", id=CAMP)[0]["price_per_week"] == 325
    assert "once your 2027 dates are on the listing" in res["held"][0] and res["held"][0] in outbox[-1].text
    assert season.held_price(CAMP, 2027) == 295

    # The dates arrive later (here, a second email's form): they bring the price with them.
    await season.send(service.find_camp(CAMP), sent_by="Andrew")
    client.post(f"/api/v1/owners/update/{token_from(outbox[-1])}", json={"sessions": ANSWER["sessions"][:1]})
    camp_row = rows(db, "camps", id=CAMP)[0]
    assert camp_row["season_year"] == 2027 and camp_row["price_per_week"] == 295
    [week] = rows(db, "sessions", camp_id=CAMP)
    assert week["price"] == 295                       # last year's $325 weekly rate, moved to $295
    assert "Price per week (2027)" in outbox[-1].text
