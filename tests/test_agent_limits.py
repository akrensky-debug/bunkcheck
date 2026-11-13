"""The family assistant's limits: request rates, guest family creation, and daily spend caps.

Driven through the API with the shared fakes. The default fake response costs $0.014
(1,000 tokens in at $4 per million, 500 out at $20 per million, Opus 5.5)."""

from __future__ import annotations

import json
import uuid
from datetime import date

import asyncpg
import pytest

from campfinder.agent import budget, runner
from campfinder.agent.budget import FAMILY_LIMIT, GLOBAL_LIMIT, GUEST_LIMIT, cost_micros
from campfinder.config import get_settings
from tests.conftest import OWNER, h
from tests.fakes import Block, FakeAnthropic, usage

IP_A, IP_B = {"X-Real-IP": "203.0.113.7"}, {"X-Real-IP": "198.51.100.2"}


@pytest.fixture
def limits(monkeypatch):
    s = get_settings()

    def set_(**values):
        for k, v in values.items():
            monkeypatch.setattr(s, k, v)
    return set_


@pytest.fixture
def claude(monkeypatch):
    """Every model call answers with text, unless a test scripts tool calls."""
    fake = FakeAnthropic([])
    fake.turns = [[Block("text", text="Here's what I found.")] for _ in range(100)]
    monkeypatch.setattr(runner, "_client", lambda: fake)
    return fake


def guest(client, headers=IP_A) -> str:
    res = client.post("/api/v1/families", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["id"]


def chat(client, family_id, headers=IP_A, auth=None):
    res = client.post("/api/v1/agent/chat", headers={**headers, **(auth or {})},
                      json={"family_id": family_id, "message": "Soccer camps near Providence?"})
    events = [json.loads(line[6:]) for line in res.text.split("\n\n") if line.startswith("data: ")]
    return res, events


# ---------------------------------------------------------------------------
# Request rates
# ---------------------------------------------------------------------------


def test_guest_families_are_limited_per_address(client, limits):
    limits(guest_families_per_hour_ip=3)
    codes = [client.post("/api/v1/families", headers=IP_A).status_code for _ in range(4)]
    assert codes == [200, 200, 200, 429]
    assert client.post("/api/v1/families", headers=IP_B).status_code == 200


def test_guest_families_have_a_daily_limit_too(client, limits):
    limits(guest_families_per_hour_ip=100, guest_families_per_day_ip=2)
    codes = [client.post("/api/v1/families", headers=IP_A).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


def test_chat_is_limited_per_address_before_any_model_call(client, claude, limits):
    limits(agent_chats_per_minute_ip=2, agent_chats_per_minute_family=100)
    fids = [guest(client) for _ in range(3)]
    codes = [chat(client, fid)[0].status_code for fid in fids]
    assert codes == [200, 200, 429]
    res, _ = chat(client, fids[0], headers=IP_B)
    assert res.status_code == 200
    assert len(claude.calls) == 3


def test_chat_is_limited_per_family(client, claude, limits):
    limits(agent_chats_per_minute_ip=100, agent_chats_per_minute_family=2)
    fid = guest(client)
    codes = [chat(client, fid, headers={"X-Real-IP": f"203.0.113.{i}"})[0].status_code for i in range(3)]
    assert codes == [200, 200, 429]
    res, _ = chat(client, fid)
    assert res.headers["retry-after"] == "60"
    assert "faster than we can answer" in res.json()["detail"]


def test_a_spoofed_x_forwarded_for_does_not_reset_the_limit(client, claude, limits):
    limits(agent_chats_per_minute_ip=1, agent_chats_per_minute_family=100)
    fid = guest(client)
    assert chat(client, fid, headers={**IP_A, "X-Forwarded-For": "1.1.1.1"})[0].status_code == 200
    assert chat(client, fid, headers={**IP_A, "X-Forwarded-For": "2.2.2.2"})[0].status_code == 429


# ---------------------------------------------------------------------------
# Spend caps
# ---------------------------------------------------------------------------


def test_guest_family_stops_at_its_daily_cap(client, claude, limits, db):
    limits(agent_guest_daily_usd=0.02)
    fid = guest(client)
    assert chat(client, fid)[0].status_code == 200        # $0.014
    assert chat(client, fid)[0].status_code == 200        # $0.028, over from here
    res, _ = chat(client, fid)
    assert res.status_code == 429 and res.json()["detail"] == GUEST_LIMIT
    assert len(claude.calls) == 2
    row = next(r for r in db.tables["ai_spend_daily"] if r["family_id"] == fid)
    assert row["cost_micros"] == 28_000 and row["calls"] == 2


def test_signed_in_family_gets_the_higher_cap(client, claude, limits, family):
    limits(agent_guest_daily_usd=0.02, agent_family_daily_usd=0.05)
    codes = [chat(client, family["id"], auth=h(OWNER))[0].status_code for _ in range(4)]
    assert codes == [200, 200, 200, 200]                  # $0.056 spent; a guest stopped at 2
    res, _ = chat(client, family["id"], auth=h(OWNER))
    assert res.status_code == 429 and res.json()["detail"] == FAMILY_LIMIT


def test_new_guest_families_dont_buy_a_new_allowance(client, claude, limits):
    limits(agent_guest_daily_usd=1.00, agent_guest_ip_daily_usd=0.02)
    first = guest(client)
    chat(client, first)
    chat(client, first)                                   # $0.028 from this address
    res, _ = chat(client, guest(client))
    assert res.status_code == 429 and res.json()["detail"] == GUEST_LIMIT
    assert chat(client, guest(client, IP_B), headers=IP_B)[0].status_code == 200


def test_everyone_cap_pauses_the_assistant_for_signed_in_parents_too(client, claude, limits, family):
    limits(agent_global_daily_usd=0.02)
    chat(client, guest(client))
    chat(client, guest(client, IP_B), headers=IP_B)       # $0.028 across two guests
    res, _ = chat(client, family["id"], auth=h(OWNER))
    assert res.status_code == 503 and res.json()["detail"] == GLOBAL_LIMIT
    assert len(claude.calls) == 2
    # The rest of the site still works.
    assert client.get(f"/api/v1/families/{family['id']}", headers=h(OWNER)).status_code == 200


def test_a_chat_stops_after_the_call_that_crosses_the_cap(client, monkeypatch, limits, db):
    limits(agent_guest_daily_usd=0.03)
    fake = FakeAnthropic([[Block("tool_use", id=f"t{i}", name="list_household", input={})] for i in range(6)])
    monkeypatch.setattr(runner, "_client", lambda: fake)
    res, events = chat(client, guest(client))
    assert res.status_code == 200
    assert len(fake.calls) == 3                           # $0.014, $0.028, $0.042: stop
    assert {"type": "error", "message": GUEST_LIMIT} in events
    # The unanswered tool call is closed on the next turn, so the history stays valid.
    convo = db.tables["agent_conversations"][0]["messages"]
    assert convo[-1]["role"] == "assistant"


def test_a_final_answer_that_crosses_the_cap_is_delivered_whole(client, claude, limits):
    limits(agent_guest_daily_usd=0.01)
    res, events = chat(client, guest(client))
    assert res.status_code == 200
    assert not [e for e in events if e["type"] == "error"]
    assert {"type": "text", "text": "Here's what I found."} in events


def test_caps_start_over_the_next_day(client, claude, limits, monkeypatch):
    limits(agent_guest_daily_usd=0.01)
    monkeypatch.setattr(budget, "today", lambda: date(2027, 3, 1))
    fid = guest(client)
    chat(client, fid)
    assert chat(client, fid)[0].status_code == 429
    monkeypatch.setattr(budget, "today", lambda: date(2027, 3, 2))
    assert chat(client, fid)[0].status_code == 200


def test_deleting_a_family_keeps_everyone_total(client, claude, db):
    fid = guest(client)
    chat(client, fid)
    assert client.delete(f"/api/v1/families/{fid}").status_code == 204
    rows = db.tables["ai_spend_daily"]
    assert [r["family_id"] for r in rows] == [None] and rows[0]["cost_micros"] == 14_000


def test_owner_export_includes_assistant_usage(client, claude, family):
    chat(client, family["id"], auth=h(OWNER))
    data = client.get(f"/api/v1/families/{family['id']}/export", headers=h(OWNER)).json()
    assert [r["cost_micros"] for r in data["assistant_usage"]] == [14_000]


# ---------------------------------------------------------------------------
# Cost estimates
# ---------------------------------------------------------------------------


def test_cost_is_priced_from_token_counts():
    million = usage(input_tokens=1_000_000, output_tokens=0)
    assert cost_micros(million, "claude-opus-5-5") == 4_000_000
    assert cost_micros(usage(0, 1_000_000), "claude-opus-5-5") == 20_000_000
    assert cost_micros(usage(0, 0, cache_write=1_000_000), "claude-opus-5-5") == 5_000_000
    assert cost_micros(usage(0, 0, cache_read=1_000_000), "claude-opus-5-5") == 200_000


def test_a_fallback_or_unknown_model_errs_high():
    u = usage(1_000_000, 0)
    assert cost_micros(u, "claude-opus-4-8", primary="claude-opus-5-5") == 5_000_000
    assert cost_micros(u, "claude-opus-5-5-fast", primary="claude-opus-5-5") == 4_000_000
    assert cost_micros(u, "claude-next-9", primary="claude-opus-5-5") == 10_000_000
    assert cost_micros(None, "claude-opus-5-5") == 16_000 * 20


# ---------------------------------------------------------------------------
# The Postgres functions (migrations/0029_ai_spend.sql)
# ---------------------------------------------------------------------------


async def test_record_ai_spend_adds_up_and_cascades(migrated: asyncpg.Connection) -> None:
    fid = await migrated.fetchval("INSERT INTO families DEFAULT VALUES RETURNING id")
    day = date(2027, 6, 1)
    try:
        for cost in (14_000, 6_000):
            row = await migrated.fetchrow("SELECT * FROM record_ai_spend($1, $2, $3)", day, fid, cost)
        assert (row["family_micros"], row["total_micros"]) == (20_000, 20_000)
        row = await migrated.fetchrow("SELECT * FROM record_ai_spend($1, $2, $3)", day, uuid.uuid4(), 1_000)
        assert (row["family_micros"], row["total_micros"]) == (0, 21_000)   # unknown family: everyone only
        row = await migrated.fetchrow("SELECT * FROM ai_spend_today($1, $2)", day, fid)
        assert (row["family_micros"], row["total_micros"]) == (20_000, 21_000)

        await migrated.execute("DELETE FROM families WHERE id = $1", fid)
        row = await migrated.fetchrow("SELECT * FROM ai_spend_today($1, $2)", day, fid)
        assert (row["family_micros"], row["total_micros"]) == (0, 21_000)
    finally:
        await migrated.execute("DELETE FROM ai_spend_daily WHERE day = $1", day)


async def test_public_roles_cannot_call_the_spend_functions(migrated: asyncpg.Connection) -> None:
    for role in ("anon", "authenticated"):
        for fn in ("ai_spend_today(date, uuid)", "record_ai_spend(date, uuid, bigint)"):
            allowed = await migrated.fetchval("SELECT has_function_privilege($1, $2, 'EXECUTE')", role, fn)
            assert not allowed, f"{role} can execute {fn}"
