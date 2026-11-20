# Security and abuse protection

Owner: the security session, for Andrew. Written 13 November 2026 from `main` at `73f79d8`, the
live site's response headers and the Supabase security advisor for the `bunkcheck` project, all
read that day.

This doc covers how the product can be attacked or abused and what stops it. The security
program, admin accounts, key handling and the breach plan are in
[`docs/legal/security-and-breach.md`](legal/security-and-breach.md) (PR #56). This doc doesn't
repeat them.

## The short version

- **The biggest risk was our Anthropic bill.** Anyone could make a guest family without signing
  in and script the assistant without limit, up to ten Opus calls per message. PR #78
  caps it: per address, per family, per day, and for everyone.
- **Every per-IP limit could be skipped** by sending a new `X-Forwarded-For` header each time.
  PR #77 reads only the header Railway sets.
- **Anyone could mark any camp "Claimed by the camp"** with their own email address, and the
  same request removed a "Verified by our team" mark. Fixed: a claim's code now goes only to an
  address the camp published (`campfinder/services/claims.py`). Nobody had used the hole; the
  live project had no claims on 16 November 2026.
- Family data holds up. Guest family ids are random 122-bit UUIDs. Every family route checks
  access. Every link token carries at least 128 random bits, and share and invite tokens are
  stored only as hashes. Row-level security is on for every table, and the public roles reach
  none of them.

## Threat model

**What we protect, in order:** the info kit (medical, allergy, insurance, pickup people), the
rest of a family's data, the trust marks on camp listings, our sending domain's reputation, and
our spend on Anthropic, Railway and Supabase.

**Who would try:**

1. **Someone after free AI.** The cheapest attack on us and the most likely. A script makes guest
   families and chats. It needs nothing but our public API address.
2. **A competitor or prankster after a listing.** Claims a camp, floods submissions, or files
   questions to a camp.
3. **Someone after one family's data.** An ex-partner, a curious co-parent, a stranger with a
   forwarded link. They hold at most a link or an invite, never the database.
4. **Bots.** Credential stuffing on sign-in, junk in open forms, scraping the camp data.

**What they can reach:** the API on Railway (public, CORS limited to our site and addresses shaped like our Vercel
previews, no cookies), the
site on Vercel, the three MCP endpoints, and the Activity API with a partner key. Supabase is
reached only by the backend with the service key; the browser's anon key is used for sign-in and
reaches no table.

**Not in scope here:** someone holding an admin account or the service key. That is the legal
doc's ground.

## Every public route

Auth terms:

- **Guest or member** means anyone holding the family's id while it is a guest family; once saved
  to an account, the owner and the members whose role allows it (`campfinder/auth.py`).
- **Link** means the token in the URL is the key.
- **Secret** means a shared secret header compared in constant time.

Limits marked *new* come from #77 and #78. Everything else is on `main` today.

### The assistant and families

| Route | Auth | Limit | Abuse case |
| --- | --- | --- | --- |
| `POST /api/v1/families` | None | *New:* 10 an hour and 30 a day per IP | Mint guest families to multiply AI allowance |
| `POST /api/v1/agent/chat` | Guest or owner and co-parents | *New:* 20 a minute per IP, 6 per family; daily spend caps (below) | Free Opus calls on our bill |
| `GET, DELETE /families/{id}`, `GET /me/family`, `GET /me/families` | Guest or member; delete is owner only | None | Reading or deleting a family needs its id or an account |
| `POST /families/{id}/claim` | Signed in | None | Saving someone else's guest family needs its id |
| `GET /families/{id}/export` | Owner | None | None beyond the id |
| `POST /families/{id}/calendar/reset`, `/me/calendar/reset` | Owner and co-parents; member | None | None |
| `GET /calendar/{token}.ics`, `/calendar/member/{token}.ics` | Link, 128 bits | None | Guessing is infeasible; tokens appear in HTTP logs |
| Brief, board, picks, week, tasks, audit, household, members (22 routes under `/families/{id}/`) | Guest or member, by role; household and member routes need an account | None | None beyond the id |
| `GET, POST /invites/{token}`, `/accept` | Link, 192 bits, hashed, 7 days; accept needs the invited email signed in | None | A forwarded invite is useless to anyone else |
| Info kit: `GET, PUT /families/{id}/kit`, shares (4 routes) | Owner, or a co-parent the owner allowed; account required | None | None |
| `GET /shares/{token}` | Link, 192 bits, hashed, expires, revocable, every open logged | None | Guessing is infeasible |

### Registration, booking, alerts, inquiries

| Route | Auth | Limit | Abuse case |
| --- | --- | --- | --- |
| Registrations, checklist (5 routes under `/families/{id}/`) | Guest or member | None | None beyond the id |
| Package preview and share, reminder settings, booking quote and confirm (7 routes) | Owner, signed in | None | None |
| `GET /camps/{id}/registration`, `GET /registration/upcoming`, `GET /booking/status` | None | None | Public data |
| `POST /camps/{id}/registration/alerts` | None | 10 unconfirmed sign-ups per address a day | Mail-bombing an address; capped |
| `GET, POST /registration-alerts/{token}`, `/confirm`, `/stop` | Link, 192 bits | None | Guessing is infeasible |
| `POST /hand-raisers` | None | 10 an hour per IP | Filling the list by script; capped. The answer is the same for a new and a known address, and no email is sent |
| `GET /camps/{id}/checks` | None | None | Public: the facts a parent can check, and counts from two parents up |
| `POST /camps/{id}/checks` | None, or signed in | 10 an hour per IP; 30 reports a day per camp emailed to the person; one confirm email an hour and three a day per address | Flooding the report queue or mail-bombing an address; capped. A report changes nothing until a person acts. A typed address proves nothing: its answers wait for the emailed link |
| `GET, POST /checks/{token}`, `/confirm`, `/stop` | Link, 192 bits, hash stored; confirm works for 7 days | None | Guessing is infeasible. Opening changes nothing |
| `POST /api/v1/inquiries`, `/inquiries/link/{token}/confirm` | None, or the family | 20 an hour per IP; 5 a day per family; 40 a day per camp | Flooding a camp's inbox; capped |
| `GET /inquiries/link/{token}`, `/cancel` | Link, 192 bits | None | Guessing is infeasible |
| `GET /owners/inquiries/{token}`, `/reply` | Link, 192 bits | None | Guessing is infeasible |
| `GET, POST /owners/confirm/{token}` | Link, 192 bits | None | Guessing is infeasible |
| `GET, POST /owners/review/{token}` | Link, 192 bits, 14 days, hash stored | None | Only in the copy forwarded to `OWNER_FORWARD_TO`; whoever holds it can apply an owner's update, once |

### Camp operators and analytics

| Route | Auth | Limit | Abuse case |
| --- | --- | --- | --- |
| `POST /api/v1/claims` | None; the code goes only to an address the camp published | 5 an hour per IP, 3 a day per address, 10 a day per camp | Held for a person when the address isn't the camp's |
| `GET /api/v1/claims/verify` | Code, 256 bits, hashed, once, 72 hours | None | Raises "unverified" to "claimed"; never lowers a verified listing |
| `POST /api/v1/submissions` | None | **None** | Fill the review queue with junk |
| `POST /api/v1/events` | None | **None** | Write any JSON, any size, into `analytics_events` |

### Camp data, MCP and the Activity API

| Route | Auth | Limit | Abuse case |
| --- | --- | --- | --- |
| `POST /search`, `/compare`, `/plan`; `GET /camps/...`, `/activities/...`, `/schools`, `/kit/fields`, `POST /places/nearest` | None | None; `/places/nearest`: 30 per 10 minutes per IP | Scraping public data; database load. `/places/nearest` takes a position in the body (so it stays out of request logs), rounds it to about 1 km on arrival, refuses anything but two finite numbers without echoing them, and returns a town; it stores nothing. The site sends `Permissions-Policy: geolocation=(self)` |
| `/mcp`, `/chatgpt/mcp`, `/claude/mcp` | None | 600 a minute per IP (*fixed:* now the real IP) | Scraping; runaway assistant loops |
| `/api/activity/v1/*` (10 routes) | Partner key, except the schema and session `.ics` | 120 a minute per key by default | A leaked key; revoke it in `api_clients` |
| `GET /docs`, `/redoc`, `/openapi.json`, `/health` | None | None | Shows our route list; public by choice for an agent-first API |

### Internal

| Route | Auth | Limit | Abuse case |
| --- | --- | --- | --- |
| `POST /internal/cron/tick`, `/internal/*/run` (4 routes) | Secret (`BOOKING_CRON_SECRET`, `REMINDER_CRON_SECRET`) | None | Off when the secret is unset |
| `POST /internal/owner-mail`, `/internal/inquiry-mail` | Secret (`OWNER_INBOUND_SECRET`, `INQUIRY_INBOUND_SECRET`) | None | Off when the secret is unset |

## What #77 and #78 fix

### Gap 1: the assistant's spend (#78)

Requests are cheap to refuse and Opus calls are not, so the limits are on money as well as
requests. Before a chat starts, and again after every model call:

| Cap | Default | Env var |
| --- | --- | --- |
| A guest family, per day | $1 | `AGENT_GUEST_DAILY_USD` |
| A signed-in family, per day | $5 | `AGENT_FAMILY_DAILY_USD` |
| All guest families from one IP, per day | $3 | `AGENT_GUEST_IP_DAILY_USD` |
| Everyone, per day | $50 (placeholder until Andrew sets it) | `AGENT_GLOBAL_DAILY_USD` |

- Cost is priced from the token counts each call returns, at list prices. When a fallback model
  served the call, the dearer price is used, so the estimate errs high.
- A chat stops after the call that crosses a cap. A final answer is still delivered whole.
- When everyone's cap is hit, chat answers 503 with "Bunkcheck's assistant has reached its limit
  for today and will be back tomorrow. Search, your plan and your calendar still work." It logs
  an error once a day.
- Days are US Eastern days.
- Family and everyone totals live in Postgres (`ai_spend_daily`, migration 0030), added to
  atomically, so they hold across deploys and replicas. The per-IP spend tally is in memory and
  backed by the everyone cap.

At $4 per million input tokens and $20 per million output, a typical message (two or three model
calls) costs a few cents, so $1 is a real trial and $5 is a heavy day of planning. Those two
numbers should move once we see real usage in `ai_spend_daily`.

### Gap 2: the caller's address (#77)

Railway's edge sets `X-Real-IP` to the address that connected to it ([Railway, "Specs &
Limits", request headers](https://docs.railway.com/networking/public-networking/specs-and-limits)).
Railway doesn't promise anything about `X-Forwarded-For`, and its first entry is whatever the
caller sent. `campfinder/client_ip.py` reads one trusted header (`CLIENT_IP_HEADER`, default
`x-real-ip`) and falls back to the socket's peer. IPv6 callers are counted by their /64, since one
home gets a whole /64. Callers with no readable address share one bucket instead of skipping the
limit.

### Gap 3: limits in memory

Decided: request-rate limits (a minute, an hour) stay in memory. A deploy resets them, which
costs little over such short windows. Spend caps went to Postgres because a day is long and money
is the thing at risk. Redis isn't worth running at our size. Revisit if Railway runs more than one
replica of the API, since each replica keeps its own windows and the effective per-minute limit
multiplies.

### Gap 4: guest families reached by id

Checked, holds. Ids come from `gen_random_uuid()` (122 random bits). They live in the browser's
local storage, not in page URLs, and analytics records only the home page. They do appear in API
paths, so they are in Railway's HTTP logs, which only we can read. Every family route goes
through `family_access` or `authorize_family`.

## Open gaps, ranked

Fixed since this doc was written: camp claims were self-verified and could send our email to any
address without limit. See "Claims" in [`docs/owner-confirmation.md`](owner-confirmation.md).

1. **No security headers on the site beyond HSTS.** The live site sends
   `strict-transport-security: max-age=63072000` (Vercel's default) and nothing else. Missing:
   `Content-Security-Policy` with `frame-ancestors 'none'` (the share, join and confirm pages can
   be framed for clickjacking), `Referrer-Policy: no-referrer` on the pages whose URL holds a token
   (`/share/[token]`, `/join/[token]`, `/inquiries/[token]`, `/alerts/[token]`), and
   `X-Content-Type-Options: nosniff`. Fix: a `headers()` block in `frontend/next.config.js`,
   tested in a browser before it ships, because a strict CSP can break Supabase sign-in.
2. **Open forms with no limit.** `/submissions` and `/events` take anonymous writes without a cap,
   and `/events` stores any JSON at any size. Fix: per-IP limits and a size cap on `properties`.
3. **Sign-up farms.** A signed-in family gets five times a guest's allowance, so scripted sign-ups
   are worth something. The everyone cap bounds the damage. Supabase's sign-up rate limits and
   CAPTCHA are dashboard settings.
4. **No dependency scanning in CI.** `.github/workflows/test.yml` runs tests only. Fix: `pip-audit`
   and `npm audit --omit=dev` in CI, and Dependabot for both.
5. **`KIT_ENCRYPTION_KEY` can't be rotated.** Covered, with a proposed fix, in the legal doc's
   Part 3.
6. **No edge layer in front of the API.** Railway's edge allows about 11,000 requests a second per
   domain and filters nothing. A flood reaches our process. Cloudflare in front of the API domain
   would add a WAF and bot filtering; then set `CLIENT_IP_HEADER=cf-connecting-ip` and accept only
   Cloudflare's addresses at the origin. Worth it once traffic is real, not before launch.
7. **Link tokens in HTTP logs.** Calendar, share and invite tokens sit in URL paths, so they are
   in Railway's request logs. Low: only we read those logs, and shares expire and can be revoked.

## Supabase

The security advisor (13 November 2026) reports one notice, at INFO level: 41 tables have
row-level security on and no policies. That is the design: only the backend reads tables, with
the service key, and migration 0015 also took the public roles' table privileges.
`tests/test_migrations.py` fails if a new table ships without row-level security or with grants to
`anon` or `authenticated`. The new spend functions are closed to both roles, and
`tests/test_agent_limits.py` checks it.

### CORS and Vercel previews (19 November 2026)

The API accepts browser calls from `https://frontend-<anything>-camp-finder.vercel.app`
(`CORS_ORIGIN_REGEX`), so previews can load real data. The pattern can't prove a preview is ours:
anyone can name a Vercel project so that its address matches. That is acceptable because CORS
here guards nothing secret. The API takes a bearer token, never cookies, so a look-alike site
can't act as a visitor; it can only do what any script calling the API directly can. If the API
ever starts using cookies, remove the pattern (set `CORS_ORIGIN_REGEX` to empty) first.

