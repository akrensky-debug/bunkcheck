-- Content-Security-Policy reports from the site (frontend/csp.js, campfinder/services/csp_reports.py).
-- The policy is report-only until these show that real pages break nothing; then it is enforced.
-- Only what is needed to act on a report is kept: the site's host, the first segment of the page
-- path (never the rest: /share/<token> holds a private token), the directive and the blocked origin.
CREATE TABLE IF NOT EXISTS csp_reports (
    id           BIGSERIAL PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    site         TEXT,         -- www.bunkcheck.ai, a preview host
    page         TEXT,         -- '/share', '/camps', '/'
    directive    TEXT NOT NULL,
    blocked      TEXT,         -- an origin, or a keyword such as 'inline' or 'eval'
    disposition  TEXT          -- 'report' while report-only, 'enforce' after
);
CREATE INDEX IF NOT EXISTS csp_reports_created_idx ON csp_reports (created_at);
ALTER TABLE csp_reports ENABLE ROW LEVEL SECURITY;
