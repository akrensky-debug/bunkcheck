"""The summer brief: one question at a time, Skip for now / Not sure yet, and chips to edit answers."""

from __future__ import annotations

from datetime import date
from typing import Any

from campfinder.agent import tools
from campfinder.services import summer_brief as sb
from campfinder.services.school_calendars import SchoolCalendar
from tests.conftest import GRANDMA, OWNER, h, invite, join

OCT = date(2026, 10, 15)
JAN = date(2027, 1, 12)


def ask(profile: dict[str, Any], today: date = OCT, context: tuple[str, ...] = ()) -> str | None:
    q = sb.next_question(profile, today, context)  # type: ignore[arg-type]
    return q.field if q else None


def said(profile: dict[str, Any], **data: Any) -> dict[str, Any]:
    return sb.apply_update(profile, data, "said", OCT)


def test_core_questions_come_in_order_constraints_first() -> None:
    p: dict[str, Any] = {}
    assert ask(p) == "kids"
    p = said(p, kids=[{"name": "Maya", "age": 7}, {"name": "Leo", "age": 10}])
    assert ask(p) == "home"
    p = said(p, home_location="Providence, RI")
    assert ask(p) == "school"
    p = said(p, summer_start="2027-06-18", summer_end="2027-08-31")
    # Which weeks need camp, then whether those weeks can be overnight, before anything about hours.
    assert ask(p) == "camp_weeks"
    p = said(p, camp_weeks=["2027-06-21", "2027-06-28", "2027-07-14", "2027-07-12"])  # any day of the week counts
    assert p["camp_weeks"] == ["2027-06-21", "2027-06-28", "2027-07-12"]
    assert ask(p) == "sleepaway"
    assert sb.next_question(p, OCT).prompt == "Are you open to overnight camp for Maya and Leo?"
    p = said(p, sleepaway=False)
    assert ask(p) == "care_hours"
    p = said(p, work_schedule=[{"parent": "Mom", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "start": "8", "end": "6pm"}])
    assert ask(p) == "interests"
    assert sb.next_question(p, OCT).prompt == "What are Maya and Leo into?"
    p = said(p, kids=[{"name": "Maya", "age": 7, "interests": ["soccer"]}, {"name": "Leo", "age": 10, "interests": ["lego"]}])
    # Core done; budget waits until prices are on screen.
    assert ask(p) is None
    assert [c.label for c in sb.chips(p)][4:6] == ["Camp 3 weeks", "Day camp only"]
    assert ask(p, context=("prices",)) == "weekly_budget"
    assert ask(p, context=("suggestions",)) == "max_drive_minutes"
    assert ask(p, today=JAN) == "booked_elsewhere"  # registration season


def test_skip_moves_on_and_waits_in_finish_later() -> None:
    p = said({}, kids=[{"name": "Maya", "age": 7}], home_location="Cranston, RI")
    p = sb.apply_skip(p, "school", OCT)
    assert ask(p) == "camp_weeks"
    # The board still gets dates to work with, marked as a guess.
    assert (p["summer_start"], p["summer_end"]) == ("2027-06-18", "2027-08-31")
    assert p["brief"]["facts"]["school"]["source"] == "guessed"
    brief = sb.build_brief(p, OCT)
    assert [(i.field, i.why) for i in brief.finish_later] == [("school", "skipped")]
    chip = next(c for c in brief.chips if c.field == "school")
    assert chip.label == "Summer Jun 18 to Aug 31" and chip.source == "guessed"
    # A skipped question never comes back on its own, even in registration season.
    p = said(p, camp_weeks=["2027-06-21"], sleepaway=True, work_schedule=sb.GUESS_WORK,
             kids=[{"name": "Maya", "age": 7, "interests": ["art"]}])
    assert ask(p, today=JAN) == "booked_elsewhere"


def test_not_sure_comes_back_when_it_matters() -> None:
    p = said({}, kids=[{"name": "Maya", "age": 6, "interests": ["art"]}], home_location="Providence, RI",
             summer_start="2027-06-21", summer_end="2027-08-27", camp_weeks=["2027-06-21"])
    p = sb.apply_skip(p, "care_hours", OCT, not_sure=True)
    assert p["work_schedule"] == sb.GUESS_WORK  # 8 to 6, marked as a guess
    assert ask(p) is None
    assert ask(p, context=("suggestions",)) == "max_drive_minutes"  # not the same sitting
    later = date(2026, 10, 20)
    q = sb.next_question(p, later, ["suggestions"])
    assert q and q.field == "care_hours" and q.returning
    chip = next(c for c in sb.chips(p) if c.field == "care_hours")
    assert chip.label == "Care about 8 to 6" and chip.source == "guessed"
    # Answering it clears the guess and the Finish later entry.
    p = said(p, work_schedule=[{"parent": "Sam", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "start": "8:30", "end": "17:30"}])
    assert ask(p, today=later, context=("suggestions",)) == "max_drive_minutes"
    assert sb.build_brief(p, OCT).finish_later == []
    assert next(c for c in sb.chips(p) if c.field == "care_hours").label == "Care about 8:30 to 5:30"


def test_editing_a_chip_keeps_later_answers() -> None:
    p = said({}, kids=[{"name": "Maya", "age": 7}, {"name": "Leo", "age": 10}], summer_start="2027-06-21",
             summer_end="2027-08-27", away=[{"start_date": "2027-07-26", "end_date": "2027-07-30", "label": "Cape Cod"}])
    p = said(p, kids=[{"name": "Maya", "age": 7}, {"name": "Leo", "age": 9}])  # "actually Leo is 9"
    assert p["away"][0]["label"] == "Cape Cod" and p["summer_start"] == "2027-06-21"
    assert [c.label for c in sb.chips(p)] == ["Maya, 7", "Leo, 9", "Summer Jun 21 to Aug 27"]
    p = said(p, camp_weeks=["2027-06-21"])
    assert sb.chips(p)[-1].label == "Camp 1 week · Away: Cape Cod"


def test_school_dates_are_looked_up_or_guessed(monkeypatch) -> None:
    cal = SchoolCalendar("Wheeler School", ("Wheeler",), date(2027, 6, 9), date(2027, 9, 8),
                         "https://example.org/wheeler-calendar", date(2026, 10, 15))
    monkeypatch.setattr("campfinder.services.school_calendars.SCHOOLS", [cal])
    p = said({}, school="wheeler")
    assert (p["summer_start"], p["summer_end"]) == ("2027-06-10", "2027-09-07")
    assert p["brief"]["facts"]["school"]["source"] == "looked_up"
    p = said({}, school="Somewhere Else Academy")
    assert p["summer_start"] == "2027-06-18" and p["brief"]["facts"]["school"]["source"] == "guessed"
    assert sb.answered(p, "school")  # the question was answered; only the dates are a guess
    # Dates the parent gave are kept when they name a school we don't know.
    p = said({}, summer_start="2027-06-15", summer_end="2027-09-01")
    p = said(p, school="Somewhere Else Academy")
    assert p["summer_start"] == "2027-06-15" and p["brief"]["facts"]["school"]["source"] == "said"


def test_profiles_from_before_the_brief_count_as_answered() -> None:
    legacy = {"kids": [{"name": "Maya", "age": 8}], "home_location": "Providence, RI", "summer_start": "2027-06-21", "summer_end": "2027-08-13"}
    assert ask(legacy) == "camp_weeks"
    # Answering the older "Any weeks already sorted?" question counts: we never ask twice.
    sorted_before = {**legacy, "away": [], "brief": {"facts": {"sorted_weeks": {"source": "said", "at": "2026-11-01"}}}}
    assert ask(sorted_before) == "sleepaway"
    assert sb.chips(sorted_before)[-1].label == "Camp all summer"


def test_overnight_is_asked_only_when_a_kid_is_old_enough() -> None:
    p = said({}, kids=[{"name": "Ada", "age": 5}, {"name": "Ben", "age": 6}], home_location="Providence, RI",
             summer_start="2027-06-21", summer_end="2027-08-27", camp_weeks=["2027-06-21"])
    assert ask(p) == "care_hours"  # nobody is 7 yet
    p = said(p, kids=[{"name": "Ada", "age": 5}, {"name": "Ben", "age": 7}])
    q = sb.next_question(p, OCT)
    assert q and q.field == "sleepaway" and q.prompt == "Are you open to overnight camp for Ben?"
    p = said(p, sleepaway=True)
    assert next(c for c in sb.chips(p) if c.field == "sleepaway").label == "Overnight OK"


def test_api_answer_skip_and_not_sure(client, family) -> None:
    fid = family["id"]
    brief = client.get(f"/api/v1/families/{fid}/brief", headers=h(OWNER)).json()
    assert brief["next_question"]["field"] == "school"  # the fixture family has Maya, 8
    brief = client.post(f"/api/v1/families/{fid}/brief/school/not-sure", headers=h(OWNER)).json()
    assert brief["next_question"]["field"] == "camp_weeks"
    assert brief["finish_later"] == [{"field": "school", "prompt": "Which school do they go to?", "why": "not_sure"}]
    brief = client.patch(f"/api/v1/families/{fid}/brief", headers=h(OWNER), json={"camp_weeks": ["2027-07-05"]}).json()
    assert brief["next_question"]["field"] == "sleepaway"  # Maya is 8
    brief = client.patch(f"/api/v1/families/{fid}/brief", headers=h(OWNER), json={"sleepaway": False}).json()
    assert brief["next_question"]["field"] == "care_hours"
    brief = client.post(f"/api/v1/families/{fid}/brief/care_hours/skip", headers=h(OWNER)).json()
    assert brief["next_question"]["field"] == "interests"
    assert {i["field"] for i in brief["finish_later"]} == {"school", "care_hours"}
    assert client.post(f"/api/v1/families/{fid}/brief/nonsense/skip", headers=h(OWNER)).status_code == 422


def test_caregivers_cant_read_or_change_the_brief(client, family) -> None:
    fid = family["id"]
    join(client, invite(client, fid, "Grandma", "grandma@example.com", "caregiver"), GRANDMA)
    assert client.get(f"/api/v1/families/{fid}/brief", headers=h(GRANDMA)).status_code == 403
    assert client.patch(f"/api/v1/families/{fid}/brief", headers=h(GRANDMA), json={"away": []}).status_code == 403


async def test_assistant_saves_through_the_brief_and_hears_the_next_question(db) -> None:
    fam = "88888888-8888-8888-8888-888888888888"
    db.table("families").insert({"id": fam, "profile": {}}).execute()
    out = await tools.run_tool("update_family_profile", {"kids": [{"name": "Ada", "age": 6}]}, family_id=fam)
    assert out.content["profile"]["brief"]["facts"]["kids"]["source"] == "said"
    assert out.content["next_question"]["field"] == "home"
    out = await tools.run_tool("not_sure_yet", {"field": "school"}, family_id=fam)
    assert out.content["profile"]["summer_start"].endswith("-06-18")
    assert out.content["next_question"]["field"] == "home"  # still unanswered; school is behind us
    assert tools.ALL_TOOLS["not_sure_yet"].family
    assert "not_sure_yet" not in {t.name for t in tools.CAMP_TOOLS}


def test_real_calendars_set_the_start_of_summer(client) -> None:
    p = said({}, school="providence")
    assert p["summer_start"] == "2027-06-18" and p["summer_end"] == "2027-08-31"
    assert "Providence Public Schools" in client.get("/api/v1/schools").json()


def test_a_grade_alone_gives_an_estimated_age() -> None:
    p = said({}, kids=[{"name": "Maya", "grade": 3}, {"name": "Leo", "grade": 0}, {"name": "Ada", "grade": -1}])
    assert [(k["age"], k["age_estimated"]) for k in p["kids"]] == [(8, True), (5, True), (4, True)]
    # Counts as an answer: the parent told us something, and camps can filter on it.
    assert ask(p) == "home"
    assert sb.next_question({}, OCT).help == "First names, and ages or grades."


def test_an_age_the_parent_gives_wins_over_the_grade() -> None:
    p = said({}, kids=[{"name": "Maya", "age": 9, "grade": 3}])
    assert p["kids"][0]["age"] == 9 and not p["kids"][0].get("age_estimated")
    # Telling us the age later replaces the estimate.
    p = said(p, kids=[{"name": "Leo", "grade": 0}])
    p = said(p, kids=[{"name": "Leo", "grade": 0, "age": 6, "age_estimated": False}])
    assert p["kids"][0]["age"] == 6 and p["kids"][0]["age_estimated"] is False


def test_grade_labels() -> None:
    assert [sb.grade_label(g) for g in (-1, 0, 1, 2, 3, 4, 11, 12)] == [
        "pre-K", "kindergarten", "1st grade", "2nd grade", "3rd grade", "4th grade", "11th grade", "12th grade",
    ]


def test_the_assistant_tool_accepts_a_grade() -> None:
    from campfinder.models.brief import BriefUpdate

    update = BriefUpdate.model_validate({"kids": [{"name": "Maya", "grade": 3}]})
    assert update.kids and update.kids[0].grade == 3 and update.kids[0].age is None
