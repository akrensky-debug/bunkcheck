-- We open state by state, so the hand-raiser form now asks which state the parent is in.
-- Two-letter code. Null for the few rows saved before the form asked.
ALTER TABLE hand_raisers ADD COLUMN IF NOT EXISTS state TEXT;
CREATE INDEX IF NOT EXISTS hand_raisers_state_idx ON hand_raisers (state);
