-- Camp claims: the code goes only to an address the camp published (campfinder/services/claims.py,
-- docs/security.md). A claim from any other address waits for a person ('needs_review').
-- Codes are kept as a hash, used once, and expire 72 hours after they are sent.
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS route TEXT;            -- contact_on_file, camp_domain, review
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS token_sent_at TIMESTAMPTZ;

ALTER TABLE claim_requests DROP CONSTRAINT IF EXISTS claim_requests_status_check;
ALTER TABLE claim_requests ADD CONSTRAINT claim_requests_status_check
    CHECK (status IN ('pending', 'needs_review', 'verified', 'rejected'));

CREATE INDEX IF NOT EXISTS claim_requests_token_hash_idx ON claim_requests (token_hash);

-- A code sent under the old rule went to whatever address was typed: it can't complete a claim.
-- (None existed on the live project on 16 November 2026.)
UPDATE claim_requests SET status = 'rejected', verification_token = NULL
WHERE status = 'pending' AND verification_token IS NOT NULL;
