-- Review an owner's email from a link in the forwarded copy, instead of the command line.
-- The link's token is stored only as its SHA-256 hash; it expires, and a message can be
-- applied or closed once (the status check in campfinder/owners/updates.py).
ALTER TABLE owner_messages ADD COLUMN IF NOT EXISTS review_token_hash TEXT;
ALTER TABLE owner_messages ADD COLUMN IF NOT EXISTS review_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS owner_messages_review_token_idx
    ON owner_messages (review_token_hash) WHERE review_token_hash IS NOT NULL;
