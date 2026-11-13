-- Inquiries: when a contracted partner confirms an anonymous question for the parent, record which
-- key made the statement, so records can be checked and the key revoked. See docs/inquiries.md,
-- "Decided". The key's name is kept too, so the record still reads if the key row is removed.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS confirmed_by_client_id   UUID REFERENCES api_clients(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS confirmed_by_client_name TEXT;

-- Every foreign key gets an index (migrations/0015_hardening.sql, tests/test_migrations.py).
CREATE INDEX IF NOT EXISTS inquiries_session_idx         ON inquiries (session_id);
CREATE INDEX IF NOT EXISTS inquiries_api_client_idx      ON inquiries (api_client_id);
CREATE INDEX IF NOT EXISTS inquiries_kit_share_idx       ON inquiries (kit_share_id);
CREATE INDEX IF NOT EXISTS inquiries_camp_contact_idx    ON inquiries (camp_contact_id);
CREATE INDEX IF NOT EXISTS inquiries_confirmed_by_idx    ON inquiries (confirmed_by_client_id);
