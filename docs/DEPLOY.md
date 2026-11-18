# Deploying the API

The API runs on Railway (project `2e87618f-…`, service `api`, domain
`api-production-4a03.up.railway.app`) and deploys `main`. Before each deploy Railway runs
`python -m campfinder.migrate`, which applies any new files in `migrations/`. If a migration
fails, the deploy stops and the old version keeps running.

The database and sign-in are the Supabase project `cdzzmyambonhkhsoltfw` (us-east-1).

## Railway variables (service `api`)

| Variable | Value | Needed for |
|---|---|---|
| `SUPABASE_URL` | `https://cdzzmyambonhkhsoltfw.supabase.co` | All reads and writes, sign-in |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API keys → `service_role` key (Legacy API keys tab) | All reads and writes, sign-in |
| `DATABASE_URL` | Supabase → Connect → Session pooler URI (port 5432), with the password in place of `[YOUR-PASSWORD]` and no brackets. Use a password of letters and digits only (see below) | Migrations |
| `FRONTEND_URL` | The Vercel address, no trailing slash | Share links, MCP links, CORS |
| `PUBLIC_API_URL` | `https://api-production-4a03.up.railway.app` | Icons in MCP metadata |
| `ANTHROPIC_API_KEY` | From the Anthropic console | The family agent |
| `KIT_ENCRYPTION_KEY` | `python -c "import os,base64;print(base64.urlsafe_b64encode(os.urandom(32)).decode())"` | The info kit |
| `CORS_ORIGINS` | Optional. Comma-separated; defaults to `FRONTEND_URL` and `http://localhost:3000` | Browser access |
| `RESEND_API_KEY` | Optional. Without it, email is logged, not sent | Email |
| `EMAIL_MODE` | Optional. `log` (default, sends nothing), `resend` or `off`. One switch for all email; the older `HOUSEHOLD_EMAIL_MODE` and `BOOKING_EMAIL_MODE` still work | Email |
| `BOOKING_CRON_SECRET` | Optional. Any long random string; turns on the registration reminder and alert cron endpoints | Registration reminders and alerts |
| `EMAIL_FROM` | With `EMAIL_MODE=resend`: the sender, on a domain verified in Resend. Default `Bunkcheck <hello@mail.bunkcheck.ai>` | All email |
| `OWNER_EMAIL_SIGNATURE`, `OWNER_REPLY_TO` | Optional. Sign-off and reply address for camp owner emails | Owner confirmation |
| `RESEND_WEBHOOK_SECRET`, `OWNER_FORWARD_TO`, `OWNER_UPDATES_FROM_MAIL` | Optional. Receive owners' replies through Resend and forward them to a person (`docs/owner-confirmation.md`) | Owner replies |
| `OWNER_POSTAL_ADDRESS`, `OWNER_OUTREACH_DAILY_CAP` | The postal address in the footer of emails we start to camps (none go out without it), and the most of them in 24 hours (default 20) | Emails to camps |
| `OWNER_INBOUND_SECRET`, `OWNER_UPDATES_AUTO_APPLY` | Optional. Turn on the inbound hook for owners' emails; auto-apply stays off until Andrew says | Listing updates by email (`docs/owner-confirmation.md`) |
| `OPENAI_APPS_CHALLENGE`, `CHATGPT_WIDGET_DOMAIN` | From the OpenAI dashboard, when submitting the ChatGPT app | ChatGPT app review |

Never paste a key or password into a chat. Put it straight into Railway.

Give the database a password of letters and digits only. In a URL, `@ # / ? %` change
what the address means, so a password with them must be written as `%40 %23 %2F %3F %25`.
Left as they are, the address can't be read and every deploy stops at the migrate step with
`Could not connect to the database (ValueError)`. A wrong password fails with a different
error. To change it: Supabase → Project Settings → Database → Reset database password, then
paste the new Session pooler URI into Railway. Nothing else uses this password: the API reads
and writes through `SUPABASE_SERVICE_KEY`.

`KIT_ENCRYPTION_KEY` cannot be changed once families have saved an info kit: the old kits
would no longer decrypt. Keep a copy in the password manager.

`AUTH_JWKS_URL` and `AUTH_JWT_ISSUER` are not read by `main` yet. They can stay; they are
used once sign-in is checked locally instead of by asking Supabase.

## Scheduled jobs

One Railway cron service (`cron`, image `curlimages/curl`, schedule `5 * * * *`) calls

    POST https://api-production-4a03.up.railway.app/api/v1/internal/cron/tick
    X-Cron-Secret: ${{api.BOOKING_CRON_SECRET}}

every hour. The API decides what is due (`campfinder/jobs/tick.py`): registration alerts every
hour; registration reminders and household morning digests at 7am, household evening
reminders at 6pm, in `REMINDER_TZ` (default America/New_York). Every job records what it sent,
so a repeated tick sends nothing twice. Nothing is emailed while `EMAIL_MODE=log`.
Try it by hand with `?dry_run=true`, or `python -m campfinder.jobs.tick --dry-run`.

## Supabase settings

- Authentication → Sign In / Providers: Email on.
- Authentication → URL Configuration: Site URL is the Vercel address; add `<Vercel>/signin`
  and `http://localhost:3000/signin` to the redirect URLs.

## Check a deploy

A failed deploy leaves the previous version running, so `/health` stays green while `main`
never ships. From 27 October to 13 November 2026 every deploy failed this way and nothing
looked wrong. After merging anything under `campfinder/` or `migrations/`, check that it
shipped:

- Railway → `api` → Deployments: the newest one is `SUCCESS` on the commit you merged.
- `https://api-production-4a03.up.railway.app/health` returns OK.
- The Railway deploy log shows `applied 0001_base.sql` … on the first deploy and
  `nothing to apply` after.
- `python -m campfinder.migrate --status` (with `DATABASE_URL` set locally) lists every
  migration as applied.

Do not run `python -m campfinder.seed.generate` against this database: it inserts fake camps.

## The hand-raiser on www, the app on dev (added 18 November 2026)

One codebase and one Vercel project serve two addresses. The host decides what a visitor sees.

| Address | What it shows |
| --- | --- |
| `www.bunkcheck.ai` | The hand-raiser page at `/`. The parent app's own pages (`/search`, `/summer`, `/household`, `/kit`, `/registrations`, `/signin`, `/activities`) send people back to `/`. |
| `dev.bunkcheck.ai`, every Vercel preview, localhost | The whole app. `dev.bunkcheck.ai` tells search engines not to index it. |

What keeps working on www: camp pages, the links already emailed to camps and parents (`/owners`,
`/alerts`, `/share`, `/inquiries`, `/join`), the for-camps pages, `/connect`, `/mcp` and the legal
pages. The rules are in `frontend/lib/site-mode.ts` and `frontend/middleware.ts`.

The hand-raiser saves an email, an optional town and the kids' ages to `hand_raisers`
(`POST /api/v1/hand-raisers`, `campfinder/services/hand_raisers.py`). It sends no email.

### Setting up dev.bunkcheck.ai (once, by hand)

1. **Vercel**, project `frontend`, Settings, Domains: add `dev.bunkcheck.ai`.
2. **DNS** for bunkcheck.ai: add the record Vercel shows, normally `CNAME dev cname.vercel-dns.com`.
3. **Railway**, service `api`: set `CORS_ORIGINS` to `https://www.bunkcheck.ai,https://dev.bunkcheck.ai`.
   Without it the browser on dev can't call the API. Leave `FRONTEND_URL` on www: it builds the
   links in emails and in the assistant apps.
4. **Supabase**, Authentication, URL Configuration: add `https://dev.bunkcheck.ai/signin` to the
   redirect URLs, or sign-in links from dev bounce back to www.

Do steps 1 to 4 and open dev.bunkcheck.ai before merging the change that puts the hand-raiser on
www, or the app has no public address for a while.

### Opening the app on www

Set `NEXT_PUBLIC_HANDRAISER_HOSTS=none` in Vercel (Production) and redeploy. www then runs the
whole app. To put the hand-raiser back, remove the variable. `NEXT_PUBLIC_NOINDEX_HOSTS`
(default `dev.bunkcheck.ai`) lists the hosts search engines should skip.
