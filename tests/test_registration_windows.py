"""Registration dates from camps' own sites load into registration_windows without overriding owners."""

from __future__ import annotations

import asyncpg

from campfinder.seed import import_real
from campfinder.seed.registration_windows import (
    DATA_FILE, build_rows, live_slugs, load_windows, to_sql, validate, window_id,
)

RECORDS = import_real.load_dataset(import_real.DATA_DIR)
SLUG = RECORDS[0][1]["slug"]
OTHER = RECORDS[1][1]["slug"]


def _row(**over: object) -> dict:
    return {"slug": SLUG, "season": 2027, "opens": "2026-12-03", "time": "19:00", "opens_for": "everyone",
            "early_window": None, "closes": None, "url": "https://camp.example.org/register",
            "quote": "Registration opens 12/3 at 7:00 PM", "checked": "2026-11-13",
            "verified_by": None, "verified_on": None, **over}


def test_the_dataset_validates() -> None:
    assert validate(load_windows(DATA_FILE), live_slugs()) == []


def test_validation() -> None:
    live = {SLUG, OTHER}
    assert validate([_row()], live) == []
    errors = validate([
        _row(slug="no-such-camp"),
        _row(slug=OTHER, opens="2027-09-15"),
        _row(slug=OTHER, season=2028, time="7pm"),
        _row(slug=OTHER, season=2029, opens="2028-12-01", quote=" ", url=None),
        _row(slug=OTHER, season=2030, opens="2029-12-01", verified_by="Claude", verified_on="2026-11-13"),
        _row(slug=OTHER, season=2031, opens="2030-12-01", verified_by="Andrew Krensky"),
        _row(),
        _row(),
    ], live)
    assert any("no published camp" in e for e in errors)
    assert any("outside the 2027 registration season" in e for e in errors)
    assert any("time must be HH:MM" in e for e in errors)
    assert any("needs the url" in e for e in errors) and any("own words" in e for e in errors)
    assert any("must be a person" in e for e in errors)
    assert any("go together" in e for e in errors)
    assert any("two rows for the same camp" in e for e in errors)


def test_rows_are_local_time_and_unverified_until_a_person_checks() -> None:
    plain, checked, day_only = build_rows([
        _row(), _row(slug=OTHER, verified_by="Andrew Krensky", verified_on="2026-11-14"),
        _row(season=2028, opens="2027-12-03", time=None, opens_for="new families",
             early_window="returning families 2027-12-01"),
    ])
    assert plain["opens_at"] == "2026-12-03T19:00:00-05:00"   # Eastern, standard time in December
    assert plain["id"] == window_id(SLUG, 2027) and not plain["verified"]
    assert checked["verified"] and "verified by Andrew Krensky on 2026-11-14" in checked["notes"]
    assert day_only["opens_at"] == "2027-12-03T00:00:00-05:00"
    assert "day only" in day_only["notes"] and "for new families" in day_only["notes"]
    assert "returning families 2027-12-01" in day_only["notes"]


async def _load_camps(conn: asyncpg.Connection, slugs: set[str]) -> None:
    records = [r for r in RECORDS if r[1]["slug"] in slugs]
    camps, sessions, sources = import_real.build_rows(records)
    for statement in import_real.to_sql(camps, sessions, sources):
        await conn.execute(statement)


async def test_loads_again_in_place_and_leaves_owner_dates_alone(migrated: asyncpg.Connection) -> None:
    tx = migrated.transaction()
    await tx.start()
    try:
        await _load_camps(migrated, {SLUG, OTHER})
        first = build_rows([_row(), _row(slug=OTHER)])
        for s in to_sql(first):
            await migrated.execute(s)
        assert await migrated.fetchval("SELECT count(*) FROM registration_windows") == 2
        assert await migrated.fetchval("SELECT count(*) FROM registration_windows WHERE verified") == 0

        # A person's check, loaded later, updates the same row.
        for s in to_sql(build_rows([_row(verified_by="Andrew Krensky", verified_on="2026-11-14")])):
            await migrated.execute(s)
        row = await migrated.fetchrow("SELECT * FROM registration_windows WHERE id = $1", first[0]["id"])
        assert row["verified"] and await migrated.fetchval("SELECT count(*) FROM registration_windows") == 2

        # The owner confirms a different date on our row: a reload must not undo it.
        await migrated.execute("UPDATE registration_windows SET opens_at = '2026-12-05T10:00:00-05:00', "
                               "notes = 'From the owner (Pat), by email' WHERE id = $1", first[0]["id"])
        for s in to_sql(first):
            await migrated.execute(s)
        row = await migrated.fetchrow("SELECT * FROM registration_windows WHERE id = $1", first[0]["id"])
        assert row["notes"].startswith("From the owner") and row["opens_at"].day == 5
    finally:
        await tx.rollback()


async def test_skips_camps_with_their_own_window_or_not_in_the_database(migrated: asyncpg.Connection) -> None:
    tx = migrated.transaction()
    await tx.start()
    try:
        await _load_camps(migrated, {SLUG})
        own = build_rows([_row()])[0]["camp_id"]
        await migrated.execute("INSERT INTO registration_windows (camp_id, opens_at, verified, notes) "
                               "VALUES ($1, '2027-01-10T09:00:00-05:00', true, 'From the owner (Pat)')", own)
        for s in to_sql(build_rows([_row(), _row(slug=OTHER)])):   # OTHER isn't loaded here
            await migrated.execute(s)
        assert await migrated.fetchval("SELECT count(*) FROM registration_windows") == 1
    finally:
        await tx.rollback()
