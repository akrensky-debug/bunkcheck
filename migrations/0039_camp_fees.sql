-- Extra costs a camp charges beyond tuition, for the cost breakdown on the camp page and in the
-- summer plan: a membership, registration fee, deposit, bus, extended care, lunch. Each item is
-- {"name", "amount", "per": once|year|summer|session|week|day, "required": bool, "note"?}.
-- Sourced like any other field (field_sources.field_name = 'fees'). Safe to run again.
ALTER TABLE camps ADD COLUMN IF NOT EXISTS fees jsonb NOT NULL DEFAULT '[]'::jsonb;
