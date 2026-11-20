-- Parent checks: a parent says a fact on a camp's page is still right, or that it's wrong and
-- what it is now (docs/parent-checks.md). A report goes to a person and never changes a listing
-- by itself. Re-runnable. Only the backend touches these tables.

-- One row per address. No name, no child, no family: like a registration alert, a check belongs
-- to an address. "Stop" deletes the row; the answers stay without it.
CREATE TABLE IF NOT EXISTS parent_reporters (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT NOT NULL UNIQUE,      -- stored lowercase
    confirm_token_hash  TEXT UNIQUE,               -- sha256 of the link token; the token is never stored
    confirm_sent_at     TIMESTAMPTZ,
    confirmed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per answer.
CREATE TABLE IF NOT EXISTS parent_checks (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id            UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    session_id         UUID REFERENCES sessions(id) ON DELETE CASCADE,   -- when the fact is a session's
    field_name         TEXT NOT NULL,             -- one of services/checks.FACTS
    verdict            TEXT NOT NULL CHECK (verdict IN ('right', 'wrong')),
    value_seen         JSONB,                     -- what the listing said; a 'right' vouches for this value only
    says               TEXT CHECK (says IS NULL OR char_length(says) <= 280),  -- "what is it now?"
    basis              TEXT CHECK (basis IS NULL OR basis IN ('registered', 'camp_site', 'camp_told_me', 'other')),
    evidence_url       TEXT,
    reporter_id        UUID REFERENCES parent_reporters(id) ON DELETE SET NULL,
    confirmed_at       TIMESTAMPTZ,               -- when the address behind this answer was proven
    status             TEXT NOT NULL
                           CHECK (status IN ('unconfirmed', 'counted',                             -- right
                                             'open', 'asking_camp', 'fixed', 'as_listed', 'closed')),  -- wrong
    reason             TEXT,                      -- why it was closed
    handled_by         TEXT,
    handled_at         TIMESTAMPTZ,
    listing_change_id  UUID REFERENCES listing_changes(id) ON DELETE SET NULL,   -- the change a report led to
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parent_checks_camp_idx ON parent_checks (camp_id, field_name);
CREATE INDEX IF NOT EXISTS parent_checks_session_idx ON parent_checks (session_id);
CREATE INDEX IF NOT EXISTS parent_checks_reporter_idx ON parent_checks (reporter_id);
CREATE INDEX IF NOT EXISTS parent_checks_change_idx ON parent_checks (listing_change_id);
CREATE INDEX IF NOT EXISTS parent_checks_status_idx ON parent_checks (status, created_at);

ALTER TABLE parent_reporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_checks    ENABLE ROW LEVEL SECURITY;
