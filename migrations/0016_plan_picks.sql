-- The Summer Board's shortlist (docs/summer-board.md): camps a parent is considering for one
-- kid in one week. Run after 0015_hardening.sql. Additive: no existing table is altered.
-- 'idea' is on the shortlist (up to 3 per kid and week), 'chosen' is the pick, 'backup' is
-- plan B. Registered and waitlisted live in family_registrations, not here.
-- Only the backend (service key) touches this table.

CREATE TABLE IF NOT EXISTS plan_picks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_name  TEXT NOT NULL,
    week_of     DATE NOT NULL,                     -- the Monday of the week
    camp_id     UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
    state       TEXT NOT NULL DEFAULT 'idea' CHECK (state IN ('idea', 'chosen', 'backup')),
    note        TEXT,
    added_by    UUID REFERENCES family_members(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS plan_picks_unique_idx ON plan_picks (family_id, child_name, week_of, camp_id);
CREATE INDEX IF NOT EXISTS plan_picks_camp_idx ON plan_picks (camp_id);
CREATE INDEX IF NOT EXISTS plan_picks_session_idx ON plan_picks (session_id);
CREATE INDEX IF NOT EXISTS plan_picks_added_by_idx ON plan_picks (added_by);

ALTER TABLE plan_picks ENABLE ROW LEVEL SECURITY;
