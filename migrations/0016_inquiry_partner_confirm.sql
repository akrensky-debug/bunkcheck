-- Inquiries: when a contracted partner confirms an anonymous question for the parent, record which
-- key made the statement, so records can be checked and the key revoked. See docs/inquiries.md,
-- "Decided". The key's name is kept too, so the record still reads if the key row is removed.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS confirmed_by_client_id   UUID REFERENCES api_clients(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS confirmed_by_client_name TEXT;
