-- Addresses we never send outreach to (the listing and season emails): hard bounces, spam
-- complaints, "stop" replies, and ones a person added. See campfinder/owners/outreach.py.
CREATE TABLE IF NOT EXISTS email_suppressions (
    email       TEXT PRIMARY KEY,
    reason      TEXT NOT NULL CHECK (reason IN ('bounced', 'complained', 'asked', 'manual')),
    source      TEXT NOT NULL,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
