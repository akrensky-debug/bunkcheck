"""Inquiries: an assistant prepares a parent's question, the parent says yes, the camp gets it and answers."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest

from campfinder import mailer
from campfinder.activity import auth as activity_auth
from campfinder.agent.tools import ToolError, run_tool
from campfinder.inquiries import service
from tests.conftest import OWNER, h

CAMP = "11111111-1111-1111-1111-111111111111"
OTHER_CAMP = "22222222-2222-2222-2222-222222222222"
SESSION = "aaaaaaaa-0000-0000-0000-000000000001"
KEY, OTHER_KEY = "cfa_live_partner_key_one", "cfa_live_partner_key_two"
API = "/api/activity/v1"
QUESTION = "Do you take kids with a peanut allergy, and is there a nurse on site?"


@pytest.fixture(autouse=True)
def camp(db) -> dict[str, Any]:
    service._ip_windows.clear()
    activity_auth._client_cache.clear()
    activity_auth._windows.clear()
    now = datetime.now(timezone.utc).isoformat()
    db.table("camps").insert([
        {"id": CAMP, "name": "Riverside Soccer", "city": "Providence", "state": "RI", "verification_status": "camp_verified"},
        {"id": OTHER_CAMP, "name": "Hilltop Arts", "city": "Cranston", "state": "RI",
         "verification_status": "unverified", "website_url": "https://hilltop.example.org"},
    ]).execute()
    db.table("sessions").insert({"id": SESSION, "camp_id": CAMP, "name": "Week 3", "start_date": "2027-07-06",
                                 "end_date": "2027-07-10"}).execute()
    db.table("camp_contacts").insert([
        {"camp_id": CAMP, "email": "coach@riverside.example.org", "is_primary": True, "verified_at": now},
        {"camp_id": CAMP, "email": "office@riverside.example.org", "is_primary": False, "verified_at": None},
    ]).execute()
    db.table("api_clients").insert([
        {"id": "client-1", "name": "Planner", "key_hash": activity_auth.hash_key(KEY), "rate_limit_per_minute": 1000,
         "active": True, "may_confirm_for_parent": False, "may_share_contact": False},
        {"id": "client-2", "name": "Other", "key_hash": activity_auth.hash_key(OTHER_KEY), "rate_limit_per_minute": 1000,
         "active": True, "may_confirm_for_parent": False, "may_share_contact": False},
    ]).execute()
    return db.tables["camps"][0]


def auth(key: str = KEY) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def partner_create(client, **body) -> Any:
    return client.post(f"{API}/inquiries", headers=auth(), json={"program_id": CAMP, "question": QUESTION, **body})


def token_of(url: str) -> str:
    return url.rsplit("/", 1)[1].split("?", 1)[0]


def opt_in(db, cap: int | None = None) -> None:
    db.table("camp_inquiry_settings").insert({"camp_id": CAMP, "billing_opted_in": True, "monthly_cap": cap}).execute()


def share(db, family_id: str, *, camp_id: str | None = CAMP, revoked: bool = False) -> str:
    token = f"share-token-{len(db.tables.get('kit_shares', []))}"
    db.table("kit_shares").insert({
        "family_id": family_id, "recipient": "Riverside Soccer", "camp_id": camp_id, "children": ["Maya"],
        "household_fields": ["emergency_contacts"], "child_fields": ["allergies", "medications"],
        "token_hash": hashlib.sha256(token.encode()).hexdigest(), "open_count": 0,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "revoked_at": datetime.now(timezone.utc).isoformat() if revoked else None,
    }).execute()
    return token


# ── Her yes comes first ───────────────────────────────────────────────────────

async def test_assistant_prepares_and_nothing_is_sent_until_the_parent_confirms(client, db, outbox) -> None:
    out = await run_tool("send_inquiry", {"program_id": CAMP, "session_id": SESSION, "question": QUESTION,
                                          "channel": "site"}, channel="chatgpt")
    c = out.content
    assert c["status"] == "pending" and outbox == []
    assert QUESTION in c["preview"]["text"] and "Week 3, 2027-07-06 to 2027-07-10" in c["preview"]["text"]
    assert "private reply link" in c["preview"]["text"]  # the camp's reply link stays hidden
    row = db.tables["inquiries"][0]
    assert row["channel"] == "chatgpt"  # from the server, not the model's "channel"
    assert row["question"] == QUESTION and row["status"] == "pending"

    # Opening the link changes nothing.
    token = token_of(c["confirm_url"])
    assert client.get(f"/api/v1/inquiries/link/{token}").json()["status"] == "pending" and outbox == []

    res = client.post(f"/api/v1/inquiries/link/{token}/confirm", json={})
    assert res.status_code == 200 and res.json()["status"] == "delivered"
    assert len(outbox) == 1
    email = outbox[0]
    assert email.to == "coach@riverside.example.org"  # the verified contact, not the unverified one
    assert QUESTION in email.text and "did not share contact details" in email.text
    assert email.text.replace(re.search(r"/owners/inquiries/(\S+)", email.text).group(1), "X") \
        == c["preview"]["text"].replace("[the camp's private reply link]", "http://localhost:3000/owners/inquiries/X")
    assert db.tables["inquiries"][0]["delivered_at"] and db.tables["inquiries"][0]["confirmed_via"] == "campfinder"

    # A second click sends nothing more; the assistant reads the status with its token.
    client.post(f"/api/v1/inquiries/link/{token}/confirm", json={})
    assert len(outbox) == 1
    seen = (await run_tool("check_inquiry", {"inquiry_id": c["inquiry_id"], "read_token": c["read_token"]})).content
    assert seen["status"] == "delivered" and seen["replies"] == []
    with pytest.raises(ToolError):
        await run_tool("check_inquiry", {"inquiry_id": c["inquiry_id"], "read_token": "wrong"})


async def test_mcp_hosts_set_the_channel_and_mark_the_tool_as_a_write() -> None:
    from campfinder.mcp_server import _widget_payload, servers
    tools = {t.name: t for t in await servers["/chatgpt/mcp"].list_tools()}
    send = tools["send_inquiry"]
    assert send.annotations.read_only_hint is False and send.annotations.open_world_hint is True
    assert set(send.input_schema["properties"]) == {"program_id", "session_id", "question", "kit_share_token"}
    assert tools["check_inquiry"].annotations.read_only_hint is True
    await servers["/claude/mcp"].call_tool("send_inquiry", {"program_id": CAMP, "question": QUESTION})
    from campfinder.database import get_supabase
    assert get_supabase().tables["inquiries"][-1]["channel"] == "claude"

    out = await run_tool("send_inquiry", {"program_id": CAMP, "question": "Is there a bus from East Side?"},
                         channel="chatgpt")
    payload = _widget_payload("send_inquiry", {}, out, "chatgpt")
    assert payload["inquiry"]["preview"]["to"] == "Riverside Soccer"
    assert "/inquiries/" in payload["inquiry"]["confirm_url"] and "utm_source=chatgpt" in payload["inquiry"]["confirm_url"]


async def test_site_agent_gets_a_card_to_confirm_in_the_app(client, db, family, outbox) -> None:
    out = await run_tool("send_inquiry", {"program_id": CAMP, "question": QUESTION}, family_id=family["id"])
    assert "confirm_url" not in out.content and out.ui["type"] == "inquiry" and out.ui["confirm_token"]
    assert db.tables["inquiries"][0]["channel"] == "site" and db.tables["inquiries"][0]["family_id"] == family["id"]
    client.post(f"/api/v1/inquiries/link/{out.ui['confirm_token']}/confirm", json={})
    assert len(outbox) == 1


def test_parent_can_cancel_and_expired_ones_are_never_sent(client, db, outbox) -> None:
    token = token_of(partner_create(client).json()["confirm_url"])
    assert client.post(f"/api/v1/inquiries/link/{token}/cancel").json()["status"] == "cancelled"
    assert client.post(f"/api/v1/inquiries/link/{token}/confirm", json={}).status_code == 409

    token = token_of(partner_create(client, question="Is there extended care until 5:30?").json()["confirm_url"])
    db.tables["inquiries"][-1]["expires_at"] = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    assert client.post(f"/api/v1/inquiries/link/{token}/confirm", json={}).status_code == 409
    assert outbox == [] and db.tables["inquiries"][-1]["status"] == "expired"


# ── Partners ──────────────────────────────────────────────────────────────────

def test_partner_creates_and_reads_but_never_sees_the_family(client, db, outbox) -> None:
    res = partner_create(client, session_id=SESSION, channel="site")
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "pending" and body["token"] and "/inquiries/" in body["confirm_url"]
    assert db.tables["inquiries"][0]["channel"] == "partner:Planner"  # from the key, never the caller

    url = f"{API}/inquiries/{body['id']}"
    assert client.get(url).status_code == 401
    assert client.get(url, headers=auth()).status_code == 422          # no inquiry token
    assert client.get(url, headers={**auth(), "X-Inquiry-Token": "nope"}).status_code == 404
    assert client.get(url, headers={**auth(OTHER_KEY), "X-Inquiry-Token": body["token"]}).status_code == 404
    assert client.get(url, headers={**auth(), "X-Inquiry-Token": body["token"]}).json()["status"] == "pending"

    # She confirms on CampFinder and chooses to share her email; the partner never gets it back.
    client.post(f"/api/v1/inquiries/link/{token_of(body['confirm_url'])}/confirm",
                json={"contact": {"name": "Dana", "email": "Dana@Example.com"}})
    assert "dana@example.com" in outbox[0].text
    seen = client.get(url, headers={**auth(), "X-Inquiry-Token": body["token"]}).json()
    assert seen["status"] == "delivered"
    flat = json.dumps(seen).lower()
    assert "dana" not in flat and "family" not in flat and "contact" not in flat


def test_partner_confirm_is_off_unless_the_key_is_allowed(client, db, outbox) -> None:
    body = partner_create(client).json()
    url, hdr = f"{API}/inquiries/{body['id']}/confirm", {**auth(), "X-Inquiry-Token": body["token"]}
    assert client.post(url, headers=hdr, json={"parent_agreed": True}).status_code == 403
    assert outbox == []

    db.tables["api_clients"][0]["may_confirm_for_parent"] = True
    activity_auth._client_cache.clear()
    assert client.post(url, headers=hdr, json={"parent_agreed": False}).status_code == 422
    with_contact = {"parent_agreed": True, "contact": {"email": "dana@example.com"}}
    assert client.post(url, headers=hdr, json=with_contact).status_code == 403  # contact needs its own permission
    res = client.post(url, headers=hdr, json={"parent_agreed": True, "user_ref": "parent-123"})
    assert res.status_code == 200 and res.json()["status"] == "delivered"
    assert db.tables["inquiries"][0]["confirmed_via"] == "partner" and len(outbox) == 1


def test_partner_requests_use_the_key_rate_limit(client, db) -> None:
    db.tables["api_clients"][0]["rate_limit_per_minute"] = 2
    activity_auth._client_cache.clear()
    assert partner_create(client).status_code == 201
    assert partner_create(client, question="Is there extended care until 5:30?").status_code == 201
    assert partner_create(client, question="Do you run a bus from East Side?").status_code == 429


# ── What the question may hold ────────────────────────────────────────────────

@pytest.mark.parametrize("question,detail", [
    ("Hi, please email me at dana@example.com about week 3", "contact details"),
    ("Call me on 401-555-0199 about week 3 openings", "contact details"),
    ("short", None),
    ("x" * 1001, None),
    ("AAAAAAAAAAAAAAAAAAAAAA!!!!!!", "question for a camp"),
    ("See http://a.example and http://b.example for my questions", "links"),
    ("Text me at (401) 555-0199 please about the week", "contact details"),
])
def test_spam_and_contact_details_are_refused(client, question, detail) -> None:
    res = partner_create(client, question=question)
    assert res.status_code == 422
    if detail:
        assert detail in res.text


@pytest.mark.parametrize("question", [
    "Is the session from 2027-07-06 to 2027-07-10 still open?",
    "Is the price on https://www.riverside.example.org/summer still right?",
    "Is drop-off at 8:15 and pickup at 3:30, ages 6-12, for 2027?",
])
def test_ordinary_questions_pass_the_checks(client, question) -> None:
    assert partner_create(client, question=question).status_code == 201


def test_the_same_question_twice_is_refused(client) -> None:
    assert partner_create(client, user_ref="p1").status_code == 201
    assert partner_create(client, user_ref="p1", question=QUESTION.upper()).status_code == 409


def test_camps_without_a_verified_contact_and_programs_that_arent_camps(client, db) -> None:
    res = partner_create(client, program_id=OTHER_CAMP)
    assert res.status_code == 409 and "hilltop.example.org" in res.text
    assert partner_create(client, program_id="99999999-9999-9999-9999-999999999999").status_code == 404
    db.table("programs").insert({"id": "88888888-8888-8888-8888-888888888888", "name": "Swim"}).execute()
    assert partner_create(client, program_id="88888888-8888-8888-8888-888888888888").status_code == 422
    other_session = partner_create(client, session_id="aaaaaaaa-0000-0000-0000-000000000099")
    assert other_session.status_code == 404


# ── The info kit travels only as a package link ───────────────────────────────

async def test_kit_goes_as_the_package_link_never_its_contents(client, db, family, outbox) -> None:
    token = share(db, family["id"])
    out = await run_tool("send_inquiry", {"program_id": CAMP, "question": QUESTION,
                                          "kit_share_token": f"http://localhost:3000/share/{token}"}, channel="claude")
    seen_by_model = json.dumps(out.content)
    assert token not in seen_by_model and "Maya" not in seen_by_model
    assert "allergies, medications" in seen_by_model and "[the link to your info package]" in seen_by_model
    row = db.tables["inquiries"][0]
    assert row["family_id"] == family["id"]  # her inquiry: in her export and her deletion
    client.post(f"/api/v1/inquiries/link/{token_of(out.content['confirm_url'])}/confirm", json={})
    assert f"/share/{token}" in outbox[0].text

    with pytest.raises(ToolError, match="different camp"):
        await run_tool("send_inquiry", {"program_id": CAMP, "question": "Another question about week 3?",
                                        "kit_share_token": share(db, family["id"], camp_id=OTHER_CAMP)})
    with pytest.raises(ToolError, match="expired or been withdrawn"):
        await run_tool("send_inquiry", {"program_id": CAMP, "question": "Another question about week 3?",
                                        "kit_share_token": share(db, family["id"], revoked=True)})


async def test_a_package_withdrawn_before_delivery_is_left_out(client, db, family, outbox) -> None:
    token = share(db, family["id"])
    out = await run_tool("send_inquiry", {"program_id": CAMP, "question": QUESTION, "kit_share_token": token},
                         channel="claude")
    db.tables["kit_shares"][0]["revoked_at"] = datetime.now(timezone.utc).isoformat()
    client.post(f"/api/v1/inquiries/link/{token_of(out.content['confirm_url'])}/confirm", json={})
    assert "/share/" not in outbox[0].text


# ── Billing ───────────────────────────────────────────────────────────────────

async def _sent(client, family_id: str | None = None, question: str = QUESTION, contact: dict | None = None) -> dict:
    out = await run_tool("send_inquiry", {"program_id": CAMP, "question": question}, family_id=family_id, channel="claude")
    body = {"contact": contact} if contact else {}
    res = client.post(f"/api/v1/inquiries/link/{token_of(out.content['confirm_url'])}/confirm", json=body)
    assert res.status_code == 200, res.text
    return _row(out.content["inquiry_id"])


def _row(inquiry_id: str) -> dict:
    from campfinder.database import get_supabase
    return next(r for r in get_supabase().tables["inquiries"] if r["id"] == inquiry_id)


async def test_camps_that_havent_opted_in_still_get_every_inquiry_unbilled(client, db, family, outbox) -> None:
    row = await _sent(client, family["id"])
    assert row["status"] == "delivered" and row["billable"] is False and row["bill_reason"] == "camp_not_opted_in"


async def test_billing_one_per_family_per_camp_per_week_and_the_monthly_cap(client, db, family, outbox) -> None:
    opt_in(db, cap=2)
    first = await _sent(client, family["id"])
    assert first["billable"] is True and first["price_cents"] == 1000
    again = await _sent(client, family["id"], question="And is there a sibling discount for week 4?")
    assert again["status"] == "delivered" and again["billable"] is False and again["bill_reason"] == "repeat_within_7_days"
    other = await _sent(client, None, question="Do you have spots for a 9 year old in July?",
                        contact={"email": "sam@example.com"})
    assert other["billable"] is True
    third = await _sent(client, None, question="Is lunch included or do we pack one?",
                        contact={"email": "lee@example.com"})
    assert third["status"] == "delivered" and third["bill_reason"] == "monthly_cap_reached"
    anon = await _sent(client, None, question="What time is pick up on Fridays?")
    assert anon["status"] == "delivered" and anon["bill_reason"] == "no_family_to_count"


async def test_not_billable_unless_delivered_and_retried_on_the_tick(client, db, family, outbox) -> None:
    opt_in(db)
    mailer.set_mailer(mailer.LogMailer())  # nothing leaves
    row = await _sent(client, family["id"])
    assert row["status"] == "confirmed" and row["billable"] is False and row["delivery_attempts"] == 1
    m = mailer.MemoryMailer()
    mailer.set_mailer(m)
    assert (await service.run_scheduled())["delivered"] == 1
    assert _row(row["id"])["status"] == "delivered" and _row(row["id"])["billable"] is True and len(m.outbox) == 1


async def test_a_family_can_send_only_so_many_a_day(client, db, family, outbox) -> None:
    for i in range(service.FAMILY_DAILY_CAP):
        await _sent(client, family["id"], question=f"Question number {'abcdefgh'[i]} about the summer weeks?")
    out = await run_tool("send_inquiry", {"program_id": CAMP, "question": "One more question about July?"},
                         family_id=family["id"], channel="claude")
    res = client.post(f"/api/v1/inquiries/link/{token_of(out.content['confirm_url'])}/confirm", json={})
    assert res.status_code == 429 and len(outbox) == service.FAMILY_DAILY_CAP


# ── Replies ───────────────────────────────────────────────────────────────────

async def test_camp_answers_on_the_web_and_the_assistant_reads_it(client, db, outbox) -> None:
    body = partner_create(client).json()
    client.post(f"/api/v1/inquiries/link/{token_of(body['confirm_url'])}/confirm", json={"contact": {"email": "dana@example.com"}})
    reply_token = re.search(r"/owners/inquiries/(\S+)", outbox[0].text).group(1)

    view = client.get(f"/api/v1/owners/inquiries/{reply_token}").json()
    assert view["inquiry"]["question"] == QUESTION and view["inquiry"]["source"] == "Partner app: Planner"
    assert view["inquiry"]["contact"] == {"email": "dana@example.com"}
    assert view["inquiries"][0]["source"] == "Partner app: Planner" and view["billing"]["opted_in"] is False

    res = client.post(f"/api/v1/owners/inquiries/{reply_token}/reply", json={"text": "Yes, our nurse is on site daily."})
    assert res.status_code == 200 and res.json()["inquiry"]["replies"][0]["text"] == "Yes, our nurse is on site daily."
    seen = client.get(f"{API}/inquiries/{body['id']}", headers={**auth(), "X-Inquiry-Token": body["token"]}).json()
    assert seen["replies"][0]["text"] == "Yes, our nurse is on site daily."
    # She shared her email with the camp, so she hears about the answer too.
    assert outbox[-1].to == "dana@example.com" and "nurse" in outbox[-1].text


async def test_email_replies_only_from_the_camps_own_address(client, db, outbox, monkeypatch) -> None:
    body = partner_create(client).json()
    client.post(f"/api/v1/inquiries/link/{token_of(body['confirm_url'])}/confirm", json={})
    reply_token = re.search(r"/owners/inquiries/(\S+)", outbox[0].text).group(1)
    url = "/api/v1/internal/inquiry-mail"
    mail = {"to_email": f"CampFinder <reply+{reply_token}@in.campfinder.example>", "from_email": "someone@else.org",
            "text": "Buy cheap watches", "message_id": "m1"}
    assert client.post(url, json=mail).status_code == 404  # no secret configured
    monkeypatch.setenv("INQUIRY_INBOUND_SECRET", "s3cret")
    hdr = {"X-Inbound-Secret": "s3cret"}
    assert client.post(url, json=mail, headers=hdr).json()["outcome"] == "rejected"
    mail |= {"from_email": "Office@Riverside.example.org",
             "text": "Week 3 has a nurse.\n\nOn Tue, CampFinder wrote:\n> A parent has a question"}
    assert client.post(url, json=mail, headers=hdr).json()["outcome"] == "accepted"
    assert client.post(url, json=mail, headers=hdr).json()["outcome"] == "accepted"  # redelivered: stored once
    assert [r["text"] for r in db.tables["inquiries"][0]["replies"]] == ["Week 3 has a nurse."]
    assert len(outbox) == 1  # she shared no email, so only the agent reads the answer


def test_reply_address_is_used_when_inbound_mail_is_set_up(client, outbox, monkeypatch) -> None:
    monkeypatch.setenv("INQUIRY_REPLY_DOMAIN", "in.campfinder.example")
    body = partner_create(client).json()
    client.post(f"/api/v1/inquiries/link/{token_of(body['confirm_url'])}/confirm", json={})
    assert outbox[0].reply_to.startswith("reply+") and outbox[0].reply_to.endswith("@in.campfinder.example")
    assert "Reply to this email" in outbox[0].text


# ── The site's own form, data rules, and counts ───────────────────────────────

def test_ask_this_camp_form_on_the_site(client, db, family, outbox) -> None:
    res = client.post("/api/v1/inquiries", json={"program_id": CAMP, "question": QUESTION, "family_id": family["id"]},
                      headers=h(OWNER))
    assert res.status_code == 201 and res.json()["status"] == "pending" and outbox == []
    assert db.tables["inquiries"][0]["channel"] == "site"
    confirmed = client.post(f"/api/v1/inquiries/link/{res.json()['confirm_token']}/confirm",
                            json={"contact": {"name": "Dana", "phone": "401-555-0100"}})
    # Her page says she shared them, but never shows them: the link passes through assistants.
    assert confirmed.json()["contact_included"] is True and "401-555-0100" not in confirmed.text
    assert "401-555-0100" in outbox[0].text
    # Someone else's family can't be attached.
    stranger = client.post("/api/v1/inquiries", json={"program_id": CAMP, "question": "Another question on week 3?",
                                                      "family_id": family["id"]}, headers=h("u-stranger"))
    assert stranger.status_code == 403


def test_site_form_is_limited_per_ip(client) -> None:
    for i in range(service.IP_HOURLY_CAP):
        client.post("/api/v1/inquiries", json={"program_id": CAMP, "question": f"Question {i} about the summer?"})
    res = client.post("/api/v1/inquiries", json={"program_id": CAMP, "question": "One more about the summer?"})
    assert res.status_code == 429


async def test_inquiries_are_in_the_family_export_and_go_when_the_family_is_deleted(client, db, family, outbox) -> None:
    await _sent(client, family["id"], contact={"email": "dana@example.com"})
    export = client.get(f"/api/v1/families/{family['id']}/export", headers=h(OWNER)).json()
    [row] = export["inquiries"]
    assert row["question"] == QUESTION and row["contact"] == {"email": "dana@example.com"}
    assert not {"token_hash", "confirm_token_hash", "reply_token_hash", "kit_token", "family_key"} & set(row)
    db.table("families").delete().eq("id", family["id"]).execute()
    assert db.tables["inquiries"] == []


async def test_retention_expires_deletes_and_redacts(client, db, family, outbox) -> None:
    sent = await _sent(client, family["id"], contact={"email": "dana@example.com"})
    partner_create(client, question="Is there extended care until 5:30?")
    soon = datetime.now(timezone.utc) + timedelta(hours=service.PENDING_HOURS + 1)
    assert await service.run_scheduled(soon) == {"expired": 1, "retried": 0, "delivered": 0, "deleted": 0, "redacted": 0}
    later = datetime.now(timezone.utc) + timedelta(days=service.RETENTION_DAYS + 1)
    out = await service.run_scheduled(later)
    assert out["deleted"] == 1 and out["redacted"] == 1  # the unsent one is gone, the sent one redacted
    row = _row(sent["id"])
    assert row["question"] is None and row["contact"] is None and row["family_id"] is None and row["redacted_at"]
    assert row["status"] == "delivered" and row["delivered_at"]  # counts stay for the camp's records
    assert len(db.tables["inquiries"]) == 1


def test_appearances_in_api_results_are_counted_for_the_camp(client, db, monkeypatch, outbox) -> None:
    from campfinder.routers import activity as activity_router

    async def fake_find_programs(**_kw):
        from types import SimpleNamespace
        return [SimpleNamespace(id=CAMP)], 1
    monkeypatch.setattr(activity_router, "find_programs", fake_find_programs)
    monkeypatch.setattr(activity_router, "ProgramList", lambda **kw: {"data": [], "total": kw["total"]})
    assert client.get(f"{API}/programs", params={"near": "Providence, RI"}, headers=auth()).status_code == 200
    [row] = db.tables["result_appearances"]
    assert row["channel"] == "partner:Planner" and row["surface"] == "programs" and row["program_ids"] == [CAMP]
    service.record_appearances("chatgpt", "search_camps", [CAMP, OTHER_CAMP])

    body = partner_create(client).json()
    client.post(f"/api/v1/inquiries/link/{token_of(body['confirm_url'])}/confirm", json={})
    reply_token = re.search(r"/owners/inquiries/(\S+)", outbox[0].text).group(1)
    assert client.get(f"/api/v1/owners/inquiries/{reply_token}").json()["agent_appearances_30_days"] == 2


def test_mcp_search_results_are_counted() -> None:
    from campfinder.agent.tools import ToolOutput
    from campfinder.database import get_supabase
    from campfinder.mcp_server import _after_call, hosts
    chatgpt = next(h for h in hosts() if h.utm_source == "chatgpt")
    _after_call(chatgpt, "search_camps", ToolOutput(content={"camps": [{"id": CAMP}]}))
    _after_call(chatgpt, "send_inquiry", ToolOutput(content={"inquiry_id": "x"}))
    rows = get_supabase().tables["result_appearances"]
    assert [(r["channel"], r["surface"], r["program_ids"]) for r in rows] == [("chatgpt", "search_camps", [CAMP])]
