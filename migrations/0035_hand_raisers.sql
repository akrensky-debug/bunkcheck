-- Parents who asked to hear when Bunkcheck opens near them (the hand-raiser page on
-- www.bunkcheck.ai while the app itself lives on dev.bunkcheck.ai). One row per address.
-- Not family data: there is no family behind a row, only an email, an optional town and the
-- kids' ages. See campfinder/services/hand_raisers.py and docs/DEPLOY.md.
CREATE TABLE IF NOT EXISTS hand_raisers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL UNIQUE,
    town        TEXT,
    kids_ages   SMALLINT[] NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hand_raisers ENABLE ROW LEVEL SECURITY;
