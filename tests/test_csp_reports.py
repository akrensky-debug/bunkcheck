"""The site's CSP reports: both browser formats, nothing private kept, and capped (services/csp_reports.py)."""

from __future__ import annotations

import json

import asyncpg

from campfinder.services import csp_reports

LEGACY = {"csp-report": {
    "document-uri": "https://www.bunkcheck.ai/share/s3cr3tToken?x=1",
    "violated-directive": "script-src-elem 'self'",
    "effective-directive": "script-src-elem",
    "blocked-uri": "https://evil.example/x.js?user=me",
    "disposition": "report",
}}
REPORTING = [{"type": "csp-violation", "url": "https://www.bunkcheck.ai/camps/riverside", "body": {
    "documentURL": "https://www.bunkcheck.ai/camps/riverside", "effectiveDirective": "connect-src",
    "blockedURL": "https://tracker.example:8443/beacon", "disposition": "report"}},
    {"type": "deprecation", "body": {"id": "x"}}]


def post(client, payload, content_type="application/csp-report"):
    body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
    return client.post("/api/v1/csp-report", content=body, headers={"Content-Type": content_type})


def test_the_legacy_format_is_stored_without_the_token_or_query(client, db):
    assert post(client, LEGACY).status_code == 204
    row = db.tables["csp_reports"][0]
    assert row == {**row, "site": "www.bunkcheck.ai", "page": "/share", "directive": "script-src-elem",
                   "blocked": "https://evil.example", "disposition": "report"}
    assert "s3cr3t" not in json.dumps(row) and "user=me" not in json.dumps(row)


def test_the_reporting_api_format_keeps_only_csp_violations(client, db):
    assert post(client, REPORTING, "application/reports+json").status_code == 204
    rows = db.tables["csp_reports"]
    assert len(rows) == 1
    assert (rows[0]["page"], rows[0]["directive"], rows[0]["blocked"]) == ("/camps", "connect-src",
                                                                            "https://tracker.example:8443")


def test_inline_code_and_eval_are_stored_as_keywords(client, db):
    for blocked in ("inline", "eval", "data:image/png;base64,AAAA"):
        post(client, {"csp-report": {**LEGACY["csp-report"], "blocked-uri": blocked, "document-uri": "https://www.bunkcheck.ai/"}})
    assert [r["blocked"] for r in db.tables["csp_reports"]] == ["inline", "eval", "data"]
    assert {r["page"] for r in db.tables["csp_reports"]} == {"/"}


def test_junk_is_ignored_and_always_answered_204(client, db):
    for body in (b"", b"not json", b"[1, 2]", b'{"csp-report": "x"}', b"x" * (csp_reports.MAX_BODY + 1)):
        assert post(client, body).status_code == 204
    assert not db.tables.get("csp_reports")


def test_reports_are_capped_per_hour(client, db, monkeypatch):
    monkeypatch.setattr(csp_reports.hourly, "_limit", lambda: 3)
    for _ in range(5):
        assert post(client, LEGACY).status_code == 204
    assert len(db.tables["csp_reports"]) == 3


async def test_the_report_table_has_row_level_security(migrated: asyncpg.Connection) -> None:
    assert await migrated.fetchval("SELECT relrowsecurity FROM pg_class WHERE relname = 'csp_reports'") is True
