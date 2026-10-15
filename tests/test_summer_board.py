"""The Summer Board: weeks per kid, the shortlist, one choice per week, and the hours check."""

from __future__ import annotations

from typing import Any

from campfinder.agent import tools
from tests.conftest import GRANDMA, OWNER, h, invite, join

KENT = "55555555-5555-5555-5555-555555555555"
KENT_W3 = "66666666-6666-6666-6666-666666666666"
ART = "77777777-7777-7777-7777-777777777777"
ART_W1 = "88888888-8888-8888-8888-888888888888"
EXTRA = [f"9999999{i}-9999-9999-9999-999999999999" for i in range(4)]


def seed(db: Any, fid: str) -> None:
    db.table("families").update({"profile": {
        "kids": [{"name": "Maya", "age": 8}], "home_location": "Providence, RI",
        "summer_start": "2027-07-05", "summer_end": "2027-07-23",
        "work_schedule": [{"parent": "Mom", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "start": "8:00", "end": "18:00"}],
    }}).eq("id", fid).execute()
    db.table("family_events").delete().eq("family_id", fid).execute()
    camp = {"state": "RI", "camp_type": "day", "is_active": True, "age_min": 5, "age_max": 14, "region": "Providence, RI"}
    db.table("camps").insert([
        {**camp, "id": KENT, "name": "Kent County Y", "city": "Warwick", "extended_care": True, "price_per_week": 310},
        {**camp, "id": ART, "name": "Sunny Art", "city": "Providence", "extended_care": False, "price_per_week": 280},
        *[{**camp, "id": e, "name": f"Camp {i}", "city": "Providence", "extended_care": True} for i, e in enumerate(EXTRA)],
    ]).execute()
    db.table("sessions").insert([
        {"id": KENT_W3, "camp_id": KENT, "name": "Week 3", "start_date": "2027-07-19", "end_date": "2027-07-23",
         "availability": "open", "price": 325},
        {"id": ART_W1, "camp_id": ART, "name": "Week 1", "start_date": "2027-07-05", "end_date": "2027-07-09",
         "availability": "open"},
    ]).execute()


def board(client, fid):
    res = client.get(f"/api/v1/families/{fid}/board", headers=h(OWNER))
    assert res.status_code == 200, res.text
    return res.json()


def pick(client, fid, **body):
    return client.post(f"/api/v1/families/{fid}/picks", headers=h(OWNER), json={"child_name": "Maya", **body})


def cell(b, week):
    return next(c for c in b["kids"][0]["cells"] if c["week_of"] == week)


def test_board_waits_for_names_and_dates(client, db, family):
    fid = family["id"]
    db.table("families").update({"profile": {"kids": [{"name": "Maya", "age": 8}]}}).eq("id", fid).execute()
    b = board(client, fid)
    assert not b["ready"] and b["kids"][0]["name"] == "Maya" and b["weeks"] == []


def test_weeks_shortlist_choice_and_hours(client, db, family):
    fid = family["id"]
    seed(db, fid)
    b = board(client, fid)
    assert b["ready"] and [w["week_of"] for w in b["weeks"]] == ["2027-07-05", "2027-07-12", "2027-07-19"]
    assert (b["planned"], b["weeks_needed"], b["start_with"]) == (0, 3, "2027-07-05")
    # Camps near home with a session that week are offered in the open week.
    assert any(o["name"] == "Kent County Y" for o in cell(b, "2027-07-19")["options"])

    # Shortlist an idea: the week shows it, nothing is planned yet.
    b = pick(client, fid, week_of="2027-07-21", camp_id=KENT, session_id=KENT_W3).json()
    w3 = cell(b, "2027-07-19")
    assert w3["state"] == "ideas" and w3["picks"][0]["name"] == "Kent County Y"
    assert w3["picks"][0]["price_per_week"] == 325  # the session's price beats the camp's

    # Choose a 9-to-3 camp against an 8-to-6 workday: planned, but the hours are short.
    b = pick(client, fid, week_of="2027-07-05", camp_id=ART, session_id=ART_W1, state="chosen").json()
    w1 = cell(b, "2027-07-05")
    assert (w1["state"], w1["label"], w1["hours"]) == ("chosen", "Sunny Art", "short")
    assert "no extended care" in w1["hours_note"]
    assert (b["planned"], b["cost"]) == (1, 280)

    # One choice per week: choosing Kent in week 1 puts Sunny Art back on the shortlist.
    b = pick(client, fid, week_of="2027-07-05", camp_id=KENT, state="chosen").json()
    states = {p["name"]: p["state"] for p in cell(b, "2027-07-05")["picks"]}
    assert states == {"Kent County Y": "chosen", "Sunny Art": "idea"}

    # Remove a pick.
    kent_w3 = cell(b, "2027-07-19")["picks"][0]["id"]
    b = client.delete(f"/api/v1/families/{fid}/picks/{kent_w3}", headers=h(OWNER)).json()
    assert cell(b, "2027-07-19")["state"] == "open"


def test_shortlist_limits_and_checks(client, db, family):
    fid = family["id"]
    seed(db, fid)
    for camp in EXTRA[:3]:
        assert pick(client, fid, week_of="2027-07-12", camp_id=camp).status_code == 200
    res = pick(client, fid, week_of="2027-07-12", camp_id=EXTRA[3])
    assert res.status_code == 422 and "Up to 3" in res.json()["detail"]
    assert pick(client, fid, child_name="Zed", week_of="2027-07-12", camp_id=KENT).status_code == 422
    assert pick(client, fid, week_of="2027-07-12", camp_id=KENT, session_id=ART_W1).status_code == 404
    # Picks are in the owner's download.
    data = client.get(f"/api/v1/families/{fid}/export", headers=h(OWNER)).json()
    assert len(data["summer_board_picks"]) == 3


def test_caregivers_dont_see_the_board(client, db, family):
    fid = family["id"]
    seed(db, fid)
    join(client, invite(client, fid, "Grandma", "grandma@example.com", "caregiver"), GRANDMA)
    assert client.get(f"/api/v1/families/{fid}/board", headers=h(GRANDMA)).status_code == 403


async def test_assistant_adds_to_the_board(client, db, family):
    fid = family["id"]
    seed(db, fid)
    out = await tools.run_tool("add_to_summer_board", {"child_name": "maya", "week_of": "2027-07-19",
                                                       "camp_id": KENT, "session_id": KENT_W3, "chosen": True},
                               family_id=fid)
    assert out.content["planned"] == "1 of 3 weeks planned"
    assert out.content["start_with"] == "2027-07-05"
    assert tools.ALL_TOOLS["add_to_summer_board"].family
