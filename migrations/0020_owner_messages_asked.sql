-- Listing updates by email, season facts: when "same weeks as last year" is ambiguous we email
-- the owner the dates it would mean and ask. 'asked' marks a message waiting for that answer;
-- the next reply from the camp is read against it. Re-runnable.

ALTER TABLE owner_messages DROP CONSTRAINT IF EXISTS owner_messages_status_check;
ALTER TABLE owner_messages ADD CONSTRAINT owner_messages_status_check
    CHECK (status IN ('received', 'proposed', 'applied', 'needs_person', 'rejected', 'asked'));
CREATE INDEX IF NOT EXISTS owner_messages_camp_idx ON owner_messages (camp_id, received_at DESC);
