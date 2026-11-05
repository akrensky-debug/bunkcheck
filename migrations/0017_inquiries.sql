-- Inquiries: a parent's question to a camp, sent by any assistant (our site agent, ChatGPT,
-- Claude, a partner app) and delivered only after the parent says yes. See docs/inquiries.md.
--
-- Stored minimum: the question, the camp's reply, and her contact details only if she chose
-- to include them. Tokens are stored as sha256 hashes, except the info kit share token, which
-- has to go into the email to the camp (it is never returned by the API or exported).

-- A camp's choice about paying for inquiries. No row means not opted in: the camp still gets
-- every inquiry, unbilled.
CREATE TABLE IF NOT EXISTS camp_inquiry_settings (
    camp_id           UUID PRIMARY KEY REFERENCES camps(id) ON DELETE CASCADE,
    billing_opted_in  BOOLEAN NOT NULL DEFAULT false,
    monthly_cap       INTEGER CHECK (monthly_cap IS NULL OR monthly_cap >= 0),  -- billable inquiries per calendar month
    opted_in_at       TIMESTAMPTZ,
    changed_by        TEXT,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id             UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    session_id          UUID REFERENCES sessions(id) ON DELETE SET NULL,
    channel             TEXT NOT NULL,      -- site, chatgpt, claude, assistant, partner:<key name>
    api_client_id       UUID REFERENCES api_clients(id) ON DELETE SET NULL,
    family_id           UUID REFERENCES families(id) ON DELETE CASCADE,
    family_key          TEXT,               -- sha256 of who asked, for the 7-day and daily caps; never shown
    question            TEXT,
    kit_share_id        UUID REFERENCES kit_shares(id) ON DELETE SET NULL,
    kit_token           TEXT,               -- the share link's token, for the email to the camp only
    contact             JSONB,              -- only what she chose to include: name, email, phone
    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'confirmed', 'delivered', 'expired', 'cancelled')),
    confirmed_via       TEXT CHECK (confirmed_via IN ('campfinder', 'partner')),
    token_hash          TEXT NOT NULL UNIQUE,   -- the agent's read token
    confirm_token_hash  TEXT NOT NULL UNIQUE,   -- the parent's confirm link
    reply_token_hash    TEXT UNIQUE,            -- the camp's reply link and reply-to address, set when sent
    camp_contact_id     UUID REFERENCES camp_contacts(id) ON DELETE SET NULL,
    expires_at          TIMESTAMPTZ NOT NULL,   -- a pending inquiry not confirmed by then is never sent
    confirmed_at        TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    delivery_attempts   INTEGER NOT NULL DEFAULT 0,
    billable            BOOLEAN NOT NULL DEFAULT false,
    bill_reason         TEXT,               -- why it is or isn't billable
    price_cents         INTEGER,
    replies             JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{text, via, at}]
    last_reply_at       TIMESTAMPTZ,
    redacted_at         TIMESTAMPTZ,        -- retention: text and contact removed, counts kept
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inquiries_camp_idx ON inquiries (camp_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_family_key_idx ON inquiries (family_key, confirmed_at);
CREATE INDEX IF NOT EXISTS inquiries_family_idx ON inquiries (family_id);
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries (status, created_at);

-- Partners: whether a key may confirm for the parent itself, and pass her contact details.
-- Both off until Andrew decides (docs/inquiries.md, open decisions).
ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS may_confirm_for_parent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS may_share_contact BOOLEAN NOT NULL DEFAULT false;

-- How often programs appear in Activity API and MCP results: one row per response, ids only.
CREATE TABLE IF NOT EXISTS result_appearances (
    id           BIGSERIAL PRIMARY KEY,
    channel      TEXT NOT NULL,        -- chatgpt, claude, assistant, partner:<key name>
    surface      TEXT NOT NULL,        -- the tool or endpoint
    program_ids  TEXT[] NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS result_appearances_ids_idx ON result_appearances USING GIN (program_ids);
CREATE INDEX IF NOT EXISTS result_appearances_created_idx ON result_appearances (created_at);

ALTER TABLE camp_inquiry_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries             ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_appearances    ENABLE ROW LEVEL SECURITY;
