# Launch checklist: what the founder does by hand

Everything here needs your accounts, your judgement or a legal sign-off. The listing text,
screenshots and portal steps are in `docs/directory-submissions.md`.

Addresses (13 November 2026):
- Site: `https://www.bunkcheck.ai` (the bare `bunkcheck.ai` redirects to www).
- Claude connector: `https://www.bunkcheck.ai/mcp`, proxied by the site to the API's `/claude/mcp`.
- API today: `https://api-production-4a03.up.railway.app`. Planned: `https://api.bunkcheck.ai`,
  which ChatGPT needs (step 3). `assistant-apps/chatgpt/mcp.json` already points there.

## 1. Before anything is submitted

- [ ] **Real data is live.** The Providence and Boston listings from `claude/real-camp-data` are
      in the Supabase project "campfinder", and the synthetic seed is **not**.
- [x] **API and site deployed.** The API answers at `api-production-4a03.up.railway.app/health`
      and the site at `www.bunkcheck.ai`.
- [ ] **Custom API domain.** Add `api.bunkcheck.ai` to the Railway service `api` and the CNAME it
      gives you at the DNS host. Needed before the ChatGPT submission, not before Claude's.
- [ ] **Railway env vars** (service `api`):
      - `FRONTEND_URL=https://www.bunkcheck.ai` (set; the card links already use it);
      - `PUBLIC_API_URL=https://api.bunkcheck.ai` once that domain answers;
      - `DATABASE_URL` (set; `/health` reports the database connected), `ANTHROPIC_API_KEY`
        and `KIT_ENCRYPTION_KEY` (the site chat and info kit need them);
      - `OPENAI_APPS_CHALLENGE` (step 3);
      - optional: `CHATGPT_WIDGET_DOMAIN` (defaults to `FRONTEND_URL`) and
        `MCP_RATE_PER_MINUTE` (default 600).
- [ ] **Vercel env:** `NEXT_PUBLIC_API_URL` (today the Railway URL; it also sets where `/mcp`
      proxies to, so change it only to an address that serves `/claude/mcp`), the Supabase URL and anon
      key, and optionally `NEXT_PUBLIC_SUPPORT_EMAIL`.
- [ ] **Smoke test production:** `python -m campfinder.scripts.check_mcp https://www.bunkcheck.ai/mcp`,
      then the API's `/chatgpt/mcp`. All checks must pass. (13 November: all three API
      endpoints pass directly.)
- [ ] **Support inbox.** `hello@bunkcheck.ai` receives mail and someone answers within one
      business day (the support page promises this).
- [ ] **Uptime alert** on the API's `/health` and on `https://www.bunkcheck.ai/mcp` (for example Better Stack or UptimeRobot).

## 2. Legal review (flagged, not decided)

- [ ] Privacy policy (`/privacy`) and terms (`/terms`) are drafts. Have counsel check:
      - the legal entity name ("PromptBridge LLC");
      - the list of processors;
      - retention periods;
      - whether request-info messages are forwarded to camps (the policy says they are);
      - state privacy notices (CA, CT and others);
      - governing law and liability terms, which the terms leave out.
- [ ] Confirm we may show each camp's details and link to it (Claude's policy requires that we
      own or control what we render; we render only our own pages and data).

## 3. ChatGPT

- [ ] Create or verify the OpenAI developer identity (individual or organization) on
      platform.openai.com. Org owners can submit; others need *Apps Management Write*.
- [ ] Open the Plugins dashboard. Copy the domain challenge token into Railway as
      `OPENAI_APPS_CHALLENGE`, redeploy, then confirm that
      `https://api.bunkcheck.ai/.well-known/openai-apps-challenge` shows it.
- [ ] Turn on developer mode in ChatGPT, add `https://api.bunkcheck.ai/chatgpt/mcp`, and run all
      8 test cases in `docs/chatgpt-app.md` on web **and** mobile. Check that cards and links work
      and that the Ohio prompt shows no continue link.
- [ ] Record a 2-3 minute demo video of those cases. Upload it unlisted (YouTube or Loom) and put
      the URL in the dashboard's review details, or add `"demo_recording_url"` under `review` in
      `plugin.json`.
- [ ] Pick the category from the dashboard's list (the package says "Lifestyle").
- [ ] Run `assistant-apps/build.sh` and upload `assistant-apps/dist/campfinder-chatgpt.zip`. Fix
      any automated findings, attest to the policies, submit. After approval, choose when to publish.

## 4. Claude

- [ ] Use a paid Claude plan (Pro, Max, Team or Enterprise). Free can add the connector but
      can't submit.
- [ ] Add `https://www.bunkcheck.ai/mcp` as a custom connector, following
      `www.bunkcheck.ai/connect`. Run the 5 example prompts on web, desktop and mobile.
- [x] Screenshots: four PNGs in `assistant-apps/screenshots/` (1440 px, one dark), each with its
      prompt. Rerun `node assistant-apps/card-screenshots.js` after a deploy.
- [ ] Submit at claude.ai/directory/manage > MCP connector, following
      `docs/directory-submissions.md`. Allowed link URIs: `https://www.bunkcheck.ai`. Auth: none.
- [ ] After listing, put the directory link on `/connect` and `/support`.

## 5. After launch, weekly

- [ ] Funnel by assistant: `mcp_tool_call`, `assistant_handoff`, `family_saved`, `calendar_subscribed` in `analytics_events`.
- [ ] Empty searches in `activity_demand`: add coverage where parents are asking.
- [ ] Claude listing health (2% or fewer errors) and ChatGPT dashboard scan status.
- [ ] Rerun the golden prompts after any change to tool descriptions.
