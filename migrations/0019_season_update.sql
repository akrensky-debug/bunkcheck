-- The "your 2027 update" email to camp owners (docs/owner-confirmation.md).
--
-- It reuses listing_confirmations: one link per camp, a snapshot of the facts shown, 30-day
-- expiry. `kind` tells the two emails apart, so a link for one can never be used on the
-- other's page. The owner's answer is stored as they sent it.
-- Re-runnable: IF NOT EXISTS, and the status check is dropped and re-added.

ALTER TABLE listing_confirmations ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'listing';
ALTER TABLE listing_confirmations ADD COLUMN IF NOT EXISTS season_year INTEGER;   -- the season asked about
ALTER TABLE listing_confirmations ADD COLUMN IF NOT EXISTS answer JSONB;          -- what the owner sent

ALTER TABLE listing_confirmations DROP CONSTRAINT IF EXISTS listing_confirmations_kind_check;
ALTER TABLE listing_confirmations ADD CONSTRAINT listing_confirmations_kind_check
    CHECK (kind IN ('listing', 'season_update'));

-- 'answered': the owner sent the season's facts through the form.
ALTER TABLE listing_confirmations DROP CONSTRAINT IF EXISTS listing_confirmations_status_check;
ALTER TABLE listing_confirmations ADD CONSTRAINT listing_confirmations_status_check
    CHECK (status IN ('sent', 'confirmed', 'removed', 'superseded', 'answered'));

CREATE INDEX IF NOT EXISTS listing_confirmations_kind_idx ON listing_confirmations (kind, status);
