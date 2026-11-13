"""The reviewed real-camp dataset validates and loads into the migrated schema."""

from __future__ import annotations

import asyncpg

import copy

from campfinder.seed.import_real import (
    DATA_DIR, build_contacts, build_rows, camp_id, load_dataset, to_sql, validate,
)


def test_dataset_validates() -> None:
    records = load_dataset(DATA_DIR)
    assert records
    assert validate(records) == []


async def test_dataset_loads_into_migrated_schema(migrated: asyncpg.Connection) -> None:
    records = load_dataset(DATA_DIR)
    camps, sessions, sources = build_rows(records)
    contacts = build_contacts(records)
    tx = migrated.transaction()
    await tx.start()
    try:
        for statement in to_sql(camps, sessions, sources, contacts):
            await migrated.execute(statement)
        assert await migrated.fetchval("SELECT count(*) FROM camps") >= len(camps)
        assert await migrated.fetchval("SELECT count(*) FROM camp_contacts") == len(contacts)
        assert await migrated.fetchval("SELECT count(*) FROM sessions") >= len(sessions)
        # Running the import again updates in place rather than duplicating.
        for statement in to_sql(camps, sessions, sources, contacts):
            await migrated.execute(statement)
        assert await migrated.fetchval("SELECT count(*) FROM camp_contacts") == len(contacts)
        ids = [c["id"] for c in camps]
        assert await migrated.fetchval("SELECT count(*) FROM camps WHERE id = ANY($1::uuid[])", ids) == len(camps)
    finally:
        await tx.rollback()


def _with_contacts(contacts: list[dict]) -> list[tuple[str, dict]]:
    metro, camp = copy.deepcopy(load_dataset(DATA_DIR)[0])
    camp["contacts"] = contacts
    return [(metro, camp)]


def test_contact_needs_email_page_and_date() -> None:
    ok = {"email": "director@camp.org", "name": "Pat Lee", "role": "Camp Director",
          "url": "https://camp.org/staff", "checked": "2026-11-13"}
    assert validate(_with_contacts([ok])) == []
    errors = validate(_with_contacts([
        {"email": "not-an-email", "url": "https://camp.org/staff", "checked": "2026-11-13"},
        {"email": "a@camp.org", "checked": "2026-11-13"},
        {"email": "b@camp.org", "url": "https://camp.org/staff"},
        {"email": "c@camp.org", "url": "https://camp.org/staff", "checked": "2026-11-13", "phone": "1"},
    ]))
    assert any("contact 0 needs a valid email" in e for e in errors)
    assert any("contact 1 needs the url" in e for e in errors)
    assert any("contact 2 needs checked" in e for e in errors)
    assert any("contact 3 has unknown keys ['phone']" in e for e in errors)
    assert any("listed twice" in e for e in validate(_with_contacts([ok, ok | {"email": "Director@camp.org"}])))


async def test_contacts_add_without_overriding_a_verified_owner(migrated: asyncpg.Connection) -> None:
    records = _with_contacts([{"email": "director@camp.org", "name": "Pat Lee", "role": "Camp Director",
                               "url": "https://camp.org/staff", "checked": "2026-11-13"}])
    camps, sessions, sources = build_rows(records)
    contacts = build_contacts(records)
    cid = camp_id(records[0][1]["slug"])
    tx = migrated.transaction()
    await tx.start()
    try:
        for statement in to_sql(camps, sessions, sources):
            await migrated.execute(statement)
        await migrated.execute(
            "INSERT INTO camp_contacts (camp_id, email, is_primary, verified_at) VALUES ($1, 'DIRECTOR@camp.org', true, now())",
            cid)
        for statement in to_sql(camps, sessions, sources, contacts):
            await migrated.execute(statement)
        rows = await migrated.fetch("SELECT email, is_primary, verified_at FROM camp_contacts WHERE camp_id = $1", cid)
        assert len(rows) == 1 and rows[0]["is_primary"] and rows[0]["verified_at"] is not None
    finally:
        await tx.rollback()
