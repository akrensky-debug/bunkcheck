-- What the family assistant has cost today: one row per family per day, and one row with no
-- family for everyone together. The backend checks these before a chat and adds to them after
-- every model call (campfinder/agent/budget.py). See docs/security.md, gap 1.
--
-- The day is the backend's (US Eastern), passed in, so "come back tomorrow" means tomorrow.
-- Totals live here, not in memory, so caps hold across deploys and replicas.
CREATE TABLE IF NOT EXISTS ai_spend_daily (
    day          DATE        NOT NULL,
    family_id    UUID        REFERENCES families(id) ON DELETE CASCADE,
    cost_micros  BIGINT      NOT NULL DEFAULT 0,   -- US dollars times 1,000,000
    calls        INTEGER     NOT NULL DEFAULT 0,   -- model calls, not chat messages
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ai_spend_daily_day_family UNIQUE NULLS NOT DISTINCT (day, family_id)
);
CREATE INDEX IF NOT EXISTS ai_spend_daily_family_idx ON ai_spend_daily (family_id);
ALTER TABLE ai_spend_daily ENABLE ROW LEVEL SECURITY;

-- Today's totals for one family and for everyone. Read before each chat.
CREATE OR REPLACE FUNCTION ai_spend_today(p_day DATE, p_family_id UUID)
RETURNS TABLE (family_micros BIGINT, total_micros BIGINT)
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS '
BEGIN
    RETURN QUERY SELECT
        coalesce((SELECT s.cost_micros FROM ai_spend_daily s WHERE s.day = p_day AND s.family_id = p_family_id), 0)::BIGINT,
        coalesce((SELECT s.cost_micros FROM ai_spend_daily s WHERE s.day = p_day AND s.family_id IS NULL), 0)::BIGINT;
END';

-- Add one model call to the family and to everyone, atomically, and return the new totals.
-- A family deleted mid-chat still counts toward everyone.
CREATE OR REPLACE FUNCTION record_ai_spend(p_day DATE, p_family_id UUID, p_cost_micros BIGINT)
RETURNS TABLE (family_micros BIGINT, total_micros BIGINT)
LANGUAGE plpgsql SET search_path = public, pg_temp AS '
DECLARE
    f BIGINT := 0;
    t BIGINT;
BEGIN
    INSERT INTO ai_spend_daily AS s (day, family_id, cost_micros, calls)
    VALUES (p_day, NULL, p_cost_micros, 1)
    ON CONFLICT ON CONSTRAINT ai_spend_daily_day_family
    DO UPDATE SET cost_micros = s.cost_micros + EXCLUDED.cost_micros, calls = s.calls + 1, updated_at = now()
    RETURNING s.cost_micros INTO t;

    IF p_family_id IS NOT NULL AND EXISTS (SELECT 1 FROM families WHERE id = p_family_id) THEN
        INSERT INTO ai_spend_daily AS s (day, family_id, cost_micros, calls)
        VALUES (p_day, p_family_id, p_cost_micros, 1)
        ON CONFLICT ON CONSTRAINT ai_spend_daily_day_family
        DO UPDATE SET cost_micros = s.cost_micros + EXCLUDED.cost_micros, calls = s.calls + 1, updated_at = now()
        RETURNING s.cost_micros INTO f;
    END IF;

    RETURN QUERY SELECT f, t;
END';

-- Functions in public are executable by everyone by default, and Supabase exposes them over
-- its REST API to anyone holding the anon key (it ships in the site's JavaScript). Close both
-- to the public roles; only the backend's service role calls them.
REVOKE ALL ON FUNCTION ai_spend_today(DATE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_ai_spend(DATE, UUID, BIGINT) FROM PUBLIC;
DO '
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''anon'') THEN
        REVOKE ALL ON FUNCTION ai_spend_today(DATE, UUID) FROM anon, authenticated;
        REVOKE ALL ON FUNCTION record_ai_spend(DATE, UUID, BIGINT) FROM anon, authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''service_role'') THEN
        GRANT EXECUTE ON FUNCTION ai_spend_today(DATE, UUID) TO service_role;
        GRANT EXECUTE ON FUNCTION record_ai_spend(DATE, UUID, BIGINT) TO service_role;
    END IF;
END';
