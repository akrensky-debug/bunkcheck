"""Fees beyond tuition: how the dataset carries them and how the summer plan adds them up."""

from __future__ import annotations

from datetime import date

from campfinder.seed.import_real import build_rows, to_sql, validate
from campfinder.services.planning import build_plan, fee_lines

CAMP = "11111111-1111-1111-1111-111111111111"
OTHER = "22222222-2222-2222-2222-222222222222"


def _record(**extra: object) -> dict:
    rec = {
        "slug": "fee-test-camp", "name": "Fee Test Camp", "website_url": "https://example.org/camp",
        "city": "Providence", "state": "RI", "zip": "02903", "camp_type": "day", "season_year": 2027,
        **extra,
    }
    filled = [k for k in rec if k not in ("slug", "season_year")]
    rec["sources"] = [{"url": "https://example.org/camp", "checked": "2026-11-26", "fields": filled}]
    return rec


def _session(sid: str, start: str, end: str, price: float | None, camp: str = CAMP) -> dict:
    return {"id": sid, "camp_id": camp, "camp_name": "Fee Test Camp" if camp == CAMP else "Other",
            "start_date": start, "end_date": end, "price": price}


def test_a_well_formed_fee_validates_and_needs_a_source() -> None:
    fee = {"name": "Membership", "amount": 125, "per": "year", "required": True}
    assert validate([("Providence, RI", _record(fees=[fee]))]) == []
    unsourced = _record(fees=[fee])
    unsourced["sources"][0]["fields"].remove("fees")
    assert any("fees" in e for e in validate([("Providence, RI", unsourced)]))


def test_bad_fees_are_named() -> None:
    errors = validate([("Providence, RI", _record(fees=[
        {"name": "", "amount": "125", "per": "month", "required": "yes"},
        {"name": "Bus", "amount": 40, "per": "week", "required": False, "colour": "red"},
    ]))])
    joined = " ".join(errors)
    assert "fees[0] needs a name" in joined
    assert "fees[0] amount" in joined
    assert "fees[0] per" in joined
    assert "fees[0] required" in joined
    assert "fees[1] must be an object" in joined


def test_fees_go_to_the_database_as_json() -> None:
    fee = {"name": "Registration fee", "amount": 50, "per": "once", "required": True}
    camps, _, _ = build_rows([("Providence, RI", _record(fees=[fee]))])
    assert camps[0]["fees"] == [fee]
    assert "'::jsonb" in to_sql(*build_rows([("Providence, RI", _record(fees=[fee]))]))[0]
    plain, _, _ = build_rows([("Providence, RI", _record())])
    assert plain[0]["fees"] == []


def test_fee_lines_count_each_unit() -> None:
    sessions = [_session("a", "2027-07-05", "2027-07-09", 400), _session("b", "2027-07-12", "2027-07-23", 760)]
    fees = [
        {"name": "Membership", "amount": 125, "per": "year", "required": True},
        {"name": "Bus", "amount": 40, "per": "week", "required": False},
        {"name": "Activity fee", "amount": 15, "per": "session", "required": True},
        {"name": "Lunch", "amount": 8, "per": "day", "required": False},
    ]
    lines = {line["item"]: line for line in fee_lines(sessions, fees)}
    assert lines["Membership"]["amount"] == 125 and lines["Membership"]["count"] == 1
    assert lines["Bus"]["count"] == 3 and lines["Bus"]["amount"] == 120      # one week plus two
    assert lines["Activity fee"]["amount"] == 30                               # two sessions
    assert lines["Lunch"]["count"] == 15 and lines["Lunch"]["amount"] == 120   # weekdays only


def test_plan_total_adds_required_fees_once_and_leaves_add_ons_out() -> None:
    sessions = [
        _session("a", "2027-07-05", "2027-07-09", 400),
        _session("b", "2027-07-12", "2027-07-16", 400),
        _session("c", "2027-07-19", "2027-07-23", 300, camp=OTHER),
    ]
    fees = {CAMP: [
        {"name": "Membership", "amount": 125, "per": "year", "required": True},
        {"name": "Extended care", "amount": 60, "per": "week", "required": False},
    ]}
    plan = build_plan(sessions, date(2027, 7, 5), date(2027, 7, 23), fees)
    assert plan["total_estimated_cost"] == 400 + 400 + 300 + 125
    items = [(line["camp_name"], line["item"], line["amount"], line["required"]) for line in plan["cost_breakdown"]]
    assert ("Fee Test Camp", "Tuition", 800, True) in items
    assert ("Fee Test Camp", "Membership", 125, True) in items
    assert ("Fee Test Camp", "Extended care", 120, False) in items
    assert ("Other", "Tuition", 300, True) in items


def test_plan_without_fees_is_unchanged() -> None:
    sessions = [_session("a", "2027-07-05", "2027-07-09", 400)]
    plan = build_plan(sessions, date(2027, 7, 5), date(2027, 7, 9))
    assert plan["total_estimated_cost"] == 400
    assert [line["item"] for line in plan["cost_breakdown"]] == ["Tuition"]
