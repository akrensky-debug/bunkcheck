-- Hardening, from the Supabase security and performance advisors (13 October 2026).
-- Re-runnable: every statement is idempotent.

-- 1. Trigger functions run with a fixed search_path, so a role that can create objects in
--    another schema can't shadow the tables or functions they use.
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.camps_default_slug() SET search_path = public, pg_temp;

-- 2. An index behind every foreign key. Without one, deleting a camp or session scans each
--    referencing table, and lookups by the key slow down as the tables grow.
--    tests/test_migrations.py fails if a foreign key is added without one.
CREATE INDEX IF NOT EXISTS agent_conversations_started_by_idx   ON agent_conversations (started_by);
CREATE INDEX IF NOT EXISTS booking_attempts_registration_idx    ON booking_attempts (registration_id);
CREATE INDEX IF NOT EXISTS family_audit_log_actor_idx           ON family_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS family_events_camp_idx               ON family_events (camp_id);
CREATE INDEX IF NOT EXISTS family_events_offering_idx           ON family_events (offering_id);
CREATE INDEX IF NOT EXISTS family_events_program_idx            ON family_events (program_id);
CREATE INDEX IF NOT EXISTS family_events_session_idx            ON family_events (session_id);
CREATE INDEX IF NOT EXISTS family_members_invited_by_idx        ON family_members (invited_by);
CREATE INDEX IF NOT EXISTS family_registrations_camp_idx        ON family_registrations (camp_id);
CREATE INDEX IF NOT EXISTS family_registrations_session_idx     ON family_registrations (session_id);
CREATE INDEX IF NOT EXISTS family_tasks_camp_idx                ON family_tasks (camp_id);
CREATE INDEX IF NOT EXISTS family_tasks_completed_by_idx        ON family_tasks (completed_by);
CREATE INDEX IF NOT EXISTS family_tasks_created_by_idx          ON family_tasks (created_by);
CREATE INDEX IF NOT EXISTS family_tasks_event_idx               ON family_tasks (event_id);
CREATE INDEX IF NOT EXISTS kit_shares_camp_idx                  ON kit_shares (camp_id);
CREATE INDEX IF NOT EXISTS listing_changes_session_idx          ON listing_changes (session_id);
CREATE INDEX IF NOT EXISTS owner_messages_camp_idx              ON owner_messages (camp_id);
CREATE INDEX IF NOT EXISTS program_field_sources_offering_idx   ON program_field_sources (offering_id);
CREATE INDEX IF NOT EXISTS registration_alerts_session_idx      ON registration_alerts (session_id);
CREATE INDEX IF NOT EXISTS registration_windows_session_idx     ON registration_windows (session_id);
-- These three were created on the live project by hand and never written down; same names here,
-- so the live database is unchanged and a fresh one matches it.
CREATE INDEX IF NOT EXISTS idx_claim_requests_camp              ON claim_requests (camp_id);
CREATE INDEX IF NOT EXISTS kit_share_events_share_idx           ON kit_share_events (share_id);
CREATE INDEX IF NOT EXISTS activity_demand_client_idx           ON activity_demand (client_id);

-- 3. Only the backend (service key) reads tables. Row-level security with no policies already
--    turns the public anon and authenticated roles away; also take their table privileges, so a
--    table that someday ships without RLS still exposes nothing. The site uses Supabase only
--    for sign-in (auth schema), never these tables. Skipped where the roles don't exist.
DO '
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''anon'')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''authenticated'') THEN
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    END IF;
END';
