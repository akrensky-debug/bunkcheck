"""Reviewing an owner's email from the link in the forwarded copy: no command line, no keys on a laptop."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from campfinder.owners import inbound, updates
from tests.test_owner_inbound import MSG, SECRET, signed
from tests.test_owner_updates import FULL_3, OWNER, WEEK_3, listed, reader_saying, session  # noqa: F401

API = "/api/v1/owners/review"


def token_of(link: str) -> str:
    assert link.startswith("http") and "/owners/review/" in link
    return link.rsplit("/", 1)[1]


async def proposed(db, *changes, **kw):
    row = await updates.receive(OWNER, "Hi! Week 3 is full. Thanks", reader=reader_saying(*(changes or (FULL_3,)), **kw))
    return row, token_of(updates.issue_review_link(row))


async def test_open_review_then_apply(listed, client, outbox) -> None:
    row, token = await proposed(listed)
    stored = next(m for m in listed.tables["owner_messages"] if m["id"] == row["id"])
    assert stored["review_token_hash"] != token and len(stored["review_token_hash"]) == 64   # only the hash is kept

    # Opening the link shows the email and the proposal, and changes nothing.
    for _ in range(2):
        view = client.get(f"{API}/{token}").json()
    assert view["camp_name"] == "Riverside Soccer" and view["from_email"] == OWNER and view["can_apply"] is True
    assert view["lines"] == ['Week 3: open -> full   (they wrote: "Week 3 is full")']
    assert "Week 3 is full" in view["body"]
    assert session(listed, WEEK_3)["availability"] == "open" and outbox == []

    done = client.post(f"{API}/{token}", json={"action": "apply"})
    assert done.status_code == 200 and done.json()["status"] == "applied" and done.json()["handled_by"] == "review link"
    assert session(listed, WEEK_3)["availability"] == "full"
    assert outbox[-1].to == OWNER and outbox[-1].subject == "Updated: Riverside Soccer"   # the owner hears what changed
    assert listed.tables["listing_changes"][-1]["changed_by"] == "owner_email"

    again = client.post(f"{API}/{token}", json={"action": "apply"})
    assert again.status_code == 409 and len(outbox) == 1                                # once only
    after = client.get(f"{API}/{token}").json()                                         # still opens, says who
    assert after["status"] == "applied" and after["can_apply"] is False and after["handled_by"] == "review link"


async def test_close_without_changes(listed, client, outbox) -> None:
    row, token = await proposed(listed)
    res = client.post(f"{API}/{token}", json={"action": "reject", "reason": "Called them; week 3 has 2 spots"})
    assert res.status_code == 200 and res.json()["status"] == "rejected"
    assert res.json()["reason"] == "Called them; week 3 has 2 spots"
    assert session(listed, WEEK_3)["availability"] == "open" and outbox == []
    assert client.post(f"{API}/{token}", json={"action": "apply"}).status_code == 409


async def test_needs_a_person_can_be_closed_not_applied(listed, client) -> None:
    row, token = await proposed(listed, needs_person=True, reason="Asks about a refund")
    view = client.get(f"{API}/{token}").json()
    assert view["status"] == "needs_person" and view["reason"] == "Asks about a refund" and view["can_apply"] is False
    assert client.post(f"{API}/{token}", json={"action": "apply"}).status_code == 409
    assert client.post(f"{API}/{token}", json={"action": "reject"}).json()["reason"] == "Closed from the review link"


async def test_unknown_expired_and_handled_links(listed, client) -> None:
    assert client.get(f"{API}/not-a-token").status_code == 404
    assert client.post(f"{API}/not-a-token", json={"action": "apply"}).status_code == 404
    row, token = await proposed(listed)
    past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    listed.table("owner_messages").update({"review_expires_at": past}).eq("id", row["id"]).execute()
    assert client.get(f"{API}/{token}").status_code == 404
    assert client.post(f"{API}/{token}", json={"action": "apply"}).status_code == 404
    assert session(listed, WEEK_3)["availability"] == "open"
    # Nothing left to decide, no link.
    assert updates.issue_review_link({**row, "status": "applied"}) is None


async def test_the_forwarded_copy_carries_the_proposal_and_the_link(listed, client, outbox, monkeypatch) -> None:
    """The whole loop: Resend's webhook, the reader, the forward with a link, the click, the owner's reply."""
    monkeypatch.setenv("RESEND_WEBHOOK_SECRET", SECRET)
    monkeypatch.setenv("OWNER_FORWARD_TO", "reader@example.com")
    monkeypatch.setenv("OWNER_UPDATES_FROM_MAIL", "1")

    async def fetch(email_id):
        return {**MSG, "from": f"Pat Director <{OWNER}>"}
    monkeypatch.setattr(inbound, "fetch_received", fetch)
    monkeypatch.setattr(updates, "read_message", reader_saying(FULL_3))

    body, h = signed({"type": "email.received", "data": {"email_id": "e_1"}})
    res = client.post("/api/v1/internal/resend-inbound", content=body, headers=h).json()
    assert res["status"] == "forwarded" and res["update"]["status"] == "proposed"

    fwd = outbox[-1]
    assert fwd.to == "reader@example.com" and fwd.subject == "Owner update: Re: Confirm your listing"
    assert "Nothing changes until you apply it" in fwd.text
    assert 'Week 3: open -> full   (they wrote: "Week 3 is full")' in fwd.text
    assert fwd.text.index("Week 3: open -> full") < fwd.text.index("----- The owner's email -----")
    link = next(line for line in fwd.text.splitlines() if "/owners/review/" in line)
    assert "Review the update" in fwd.html and link in fwd.html

    assert client.post(f"{API}/{token_of(link)}", json={"action": "apply"}).json()["status"] == "applied"
    assert session(listed, WEEK_3)["availability"] == "full" and outbox[-1].to == OWNER


async def test_the_forward_goes_out_even_if_reading_fails(listed, outbox, monkeypatch) -> None:
    monkeypatch.setenv("OWNER_FORWARD_TO", "reader@example.com")
    monkeypatch.setenv("OWNER_UPDATES_FROM_MAIL", "1")

    async def broken(*a, **kw):
        raise RuntimeError("database down")
    monkeypatch.setattr(updates, "receive", broken)

    async def fetch(email_id):
        return dict(MSG)
    out = await inbound.handle({"type": "email.received", "data": {"email_id": "e_1"}}, fetch=fetch)
    assert out["status"] == "forwarded" and out["update"]["status"] == "error"
    assert outbox[-1].subject == "Owner reply: Re: Confirm your listing" and "Week 3 is full" in outbox[-1].text


def test_season_facts_read_in_plain_words(listed) -> None:
    msg = {"camp_id": None, "proposal": {
        "changes": [], "quotes": {"price": "$310 a week next summer", "registration": "Jan 15 at 9am"},
        "season_facts": {"season_year": 2027, "price_per_week": 310, "registration_opens": "2027-01-15",
                         "registration_time": "09:00", "rest_is_right": True},
        "ask": {"why": "July 4th moves into week 1", "sessions": [{}, {}]}}}
    assert updates.proposal_lines(msg) == [
        '2027 price per week: $310   (they wrote: "$310 a week next summer")',
        '2027 registration opens Friday, January 15, 2027 at 9:00 am   (they wrote: "Jan 15 at 9am")',
        "They say the rest of the listing is right",
        "Then we email them to check 2 dates, because July 4th moves into week 1",
    ]
