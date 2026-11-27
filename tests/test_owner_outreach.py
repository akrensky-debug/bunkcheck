"""Emails we start to camps: never to the do-not-contact list, a daily cap, and a footer with our
postal address and how to stop. Bounces, complaints and "stop" replies fill the list."""

from __future__ import annotations

import pytest

from campfinder.owners import emails, inbound, outreach, service
from campfinder.owners.__main__ import main as cli
from tests.test_owner_confirmation import CAMP_ID, camp  # noqa: F401
from tests.test_owner_inbound import MSG, SECRET, signed

ADDRESS = "info@riverside.example"


@pytest.fixture
def checked(camp, db):  # noqa: F811
    service.mark_checked(camp, "Andrew")
    return service.find_camp(CAMP_ID)


def many_ready(db, n: int) -> list[str]:
    ids = [f"55555555-0000-0000-0000-{i:012d}" for i in range(n)]
    db.table("camps").insert([{"id": cid, "name": f"Camp {i}", "city": "Providence", "state": "RI", "zip": "02906",
                               "camp_type": "day", "is_active": True, "season_year": 2026,
                               "email": f"camp{i}@x.example", "verification_status": "team_verified"}
                              for i, cid in enumerate(ids)]).execute()
    return ids


async def test_no_postal_address_no_outreach(checked, db, outbox, monkeypatch) -> None:
    monkeypatch.delenv("OWNER_POSTAL_ADDRESS")
    with pytest.raises(service.ConfirmationError, match="OWNER_POSTAL_ADDRESS"):
        await service.send(checked, sent_by="Andrew")
    assert outbox == [] and not db.tables.get("listing_confirmations")   # nothing recorded either
    assert "[postal address not set]" in emails.listing_confirmation(ADDRESS, None, checked,
                                                                     {"camp": {}, "sessions": []}, "t").text


async def test_the_footer_says_who_we_are_and_how_to_stop(checked, outbox) -> None:
    await service.send(checked, sent_by="Andrew")
    email = outbox[-1]
    assert "Bunkcheck is built by PromptBridge LLC, 1 Test Street, Providence, RI 02906" in email.text
    assert 'Reply "stop" and we won\'t email this address again.' in email.text
    assert "1 Test Street" in email.html and "stop" in email.html


async def test_do_not_contact_blocks_the_send_and_the_queue(checked, db, outbox) -> None:
    outreach.suppress(" Info@Riverside.example ", "complained", source="resend webhook")
    with pytest.raises(service.ConfirmationError, match="do-not-contact list"):
        await service.send(checked, sent_by="Andrew")
    assert outbox == []
    why = {c["name"]: w for c, w in service.queue().waiting}
    assert why["Riverside Soccer Camp"] == f"do not contact {ADDRESS}: complained"
    assert outreach.unsuppress(ADDRESS) and service.queue().ready[0][1] == ADDRESS


def test_the_daily_cap_stops_a_batch(db, outbox, capsys, monkeypatch) -> None:
    monkeypatch.setenv("OWNER_OUTREACH_DAILY_CAP", "2")
    many_ready(db, 3)
    assert cli(["send-ready", "--by", "Andrew", "--limit", "3", "--yes"]) == 1
    assert len(outbox) == 2
    err = capsys.readouterr().err
    assert "stopped after 2 of 3" in err and "Today's limit is reached (2 camp emails in 24 hours" in err
    assert len(db.tables["listing_confirmations"]) == 2   # the third wasn't recorded


def test_cli_manages_the_list(db, capsys) -> None:
    assert cli(["suppress", "Pat@Camp.example", "--by", "Andrew", "--note", "asked on the phone"]) == 0
    assert cli(["suppressed"]) == 0
    out = capsys.readouterr().out
    assert "pat@camp.example" in out and "manual" in out and "person: Andrew" in out and "asked on the phone" in out
    assert cli(["unsuppress", "pat@camp.example", "--by", "Andrew"]) == 0
    assert outreach.suppressed("pat@camp.example") is None


@pytest.mark.parametrize("text,stop", [
    ("Stop", True), ("STOP.", True), ("  unsubscribe!\n\nOn Mon, Bunkcheck wrote:\n> Hi", True),
    ("Please stop emailing me", True), ("stop listing us, we closed", False), ("> stop", False),
    ("Week 3 is full\n\nstop", False), ("", False),
])
def test_what_counts_as_stop(text, stop) -> None:
    assert outreach.is_stop_reply(text) is stop


@pytest.fixture
def webhook(monkeypatch):
    monkeypatch.setenv("RESEND_WEBHOOK_SECRET", SECRET)
    monkeypatch.setenv("OWNER_FORWARD_TO", "reader@example.com")


def post(client, event):
    body, h = signed(event)
    return client.post("/api/v1/internal/resend-inbound", content=body, headers=h).json()


def test_hard_bounces_and_complaints_go_on_the_list(webhook, client, db) -> None:
    soft = {"type": "email.bounced", "data": {"to": ["Soft@x.example"], "subject": "s",
                                              "bounce": {"type": "Transient", "subType": "MailboxFull"}}}
    assert post(client, soft)["status"] == "ignored: Transient bounce"
    hard = {"type": "email.bounced", "data": {"to": ["Pat Director <Gone@x.example>"], "subject": "Your camp's listing",
                                              "bounce": {"type": "Permanent", "subType": "General",
                                                         "message": "mailbox does not exist"}}}
    assert post(client, hard) == {"status": "do not contact: bounced", "emails": ["gone@x.example"]}
    spam = {"type": "email.complained", "data": {"to": ["angry@x.example"], "subject": "Your camp's listing"}}
    assert post(client, spam)["status"] == "do not contact: complained"
    rows = {r["email"]: r for r in db.tables["email_suppressions"]}
    assert set(rows) == {"gone@x.example", "angry@x.example"}
    assert rows["gone@x.example"]["reason"] == "bounced" and "mailbox does not exist" in rows["gone@x.example"]["note"]
    assert outreach.suppressed("soft@x.example") is None


def test_a_stop_reply_goes_on_the_list_and_still_reaches_a_person(webhook, client, db, outbox, monkeypatch) -> None:
    monkeypatch.setenv("OWNER_UPDATES_FROM_MAIL", "1")
    called = []

    async def fetch(email_id):
        return {**MSG, "text": "Stop\n\nOn Mon, Bunkcheck wrote:\n> Is your listing right?"}
    monkeypatch.setattr(inbound, "fetch_received", fetch)

    async def receive(*a, **kw):
        called.append(a)
    monkeypatch.setattr("campfinder.owners.updates.receive", receive)

    res = post(client, {"type": "email.received", "data": {"email_id": "e_1"}})
    assert res["status"] == "forwarded" and res["update"]["status"] == "stopped" and called == []
    assert outreach.suppressed("director@riverside.example")["reason"] == "asked"
    assert "They asked us to stop emailing" in outbox[-1].text and "/owners/review/" not in outbox[-1].text


async def test_the_listing_email_introduces_us_as_new_and_says_who_is_behind_it(checked, outbox) -> None:
    await service.send(checked, sent_by="Andrew")
    email = outbox[-1]
    assert email.subject == f"Is our listing for {checked['name']} right?"
    for part in (email.text, email.html):
        assert "I'm Andrew, a parent near Providence" in part.replace("&#x27;", "'")
        assert "PromptBridge, is building Bunkcheck to make camp planning and booking easier for parents" in part
        assert "We open to families in January, starting in Rhode Island." in part
        assert "Being listed is free" in part
    assert "Thanks,\nAndrew\nBunkcheck" in email.text
    assert "Thanks,<br>Andrew<br>Bunkcheck" in email.html
