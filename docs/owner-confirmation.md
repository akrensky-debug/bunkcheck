# Owner confirmation

"Here is your listing, reply if anything is wrong." ROADMAP Phase 2, item 1. Until a camp
confirms its own listing, nothing we serve (site, agent, MCP) can say "confirmed by the camp".

## The flow

1. **A person checks the listing** against its sources (year one: every camp, by hand):
   `python -m campfinder.owners checked <camp> --by <name>`. The camp becomes `team_verified`.
2. **Preview the email**: `python -m campfinder.owners preview <camp> [--to owner@camp.org]`.
   Records and sends nothing.
3. **Send it**: `python -m campfinder.owners send <camp> --by <name> [--to ...]`. One email per
   camp, with a snapshot of exactly the facts shown and a link that works for 30 days.
   A new send supersedes any unanswered earlier one.
4. **The owner opens the link** (`/owners/confirm/<token>`). Opening it changes nothing; mail
   scanners open links on their own. The owner picks:
   - **Looks right:** the camp becomes `camp_verified`. Each fact in the snapshot is marked
     confirmed by the camp today (existing source rows are upgraded in place), and the owner
     becomes a verified contact. Camp pages and the agent's camp details show
     `confirmed_by_camp_at`.
   - **Take it down:** the camp goes off the site (`is_active = false`). Search skips it and its
     page returns 404.
   - **Something's wrong:** they reply to the email, and a person fixes it.
5. If the listing changed after the email went out, "looks right" is refused and the team sends
   a fresh one.

`python -m campfinder.owners status <camp>` shows the emails, answers and the change log.

## In batches

    python -m campfinder.owners checked <camp> <camp> ... --by <name>    # several at once
    python -m campfinder.owners queue                                   # who to ask next, and why the rest aren't ready
    python -m campfinder.owners send-ready --by <name> --limit 10       # lists who would be asked
    python -m campfinder.owners send-ready --by <name> --limit 10 --yes # sends

A camp is ready when a person has checked it, it's on the site, the camp hasn't confirmed yet,
there's an email for it (primary contact first, then the camp's own email), and no earlier link
is still waiting for an answer. `preview <camp>` shows any one email first.

Named contacts (a camp director or registrar) come from the dataset. A camp in
`data/camps/*.json` can list them under `contacts`, each with the camp's own page that shows the
address. `import_real` adds them to `camp_contacts` and never changes a contact who is already
verified or primary. A named contact is used before the camp's info@ address.

## The season update ("your 2027 update")

Parents plan summer 2027 from January to March, and most camps haven't posted 2027 by then. This
email asks each owner for three facts: next season's session dates, its price per week, and the
day registration opens. Code: `campfinder/owners/season.py`.

**Decided by Andrew, 13 November 2026: the owner is the checker for this email.** A camp doesn't
need a person's hand check before it gets it. The listing email keeps that requirement.

    python -m campfinder.owners preview <camp> --update [--to owner@camp.org]   # records and sends nothing
    python -m campfinder.owners send <camp> --update --by <name>
    python -m campfinder.owners queue --update [--region "Providence, RI"]     # starts with the January 1 number
    python -m campfinder.owners send-ready --update --by <name> --limit 10 [--yes]

1. **The email** shows what we have, labeled with the season it's from ("from your 2026
   season"), and asks for the three facts. It mentions how many parents asked to hear when
   registration opens. It reuses the listing email's machinery: one link per camp, a snapshot
   of the facts shown, 30 days, every step in the change log. `listing_confirmations.kind` is
   `season_update`, so its link works only on `/owners/update/<token>` and the listing
   email's only on `/owners/confirm/<token>`.
2. **The owner answers on the form**, or by replying in plain words. The form starts from last
   season's weeks moved to the same weekdays next year (whole weeks, so Monday stays Monday) and
   flags any week where that changes which holiday falls in it: in 2027 the Fourth of July is
   observed on Monday 5 July, so the week that starts that day isn't last year's week. The
   owner picks "Enter 2027 dates" before any of those dates are sent; nothing is assumed.
3. **What the owner sends goes on the listing** at once, each fact `camp_verified` with today's
   date, and in the change log as `owner_web` with the whole answer:
   - Dates replace last season's sessions. Rows are kept and moved (matched by name, else in
     order), so a family's saved pick of Week 1 still points at Week 1. Last season's
     availability and spots are cleared. `season_year` becomes the new season.
   - A weekly price carries to a session only when that session was priced at exactly last
     year's weekly rate and is as many days long. A new session or a short holiday week is left
     blank, not guessed.
   - The registration day becomes a verified `registration_windows` row for that season (the
     owner's date replaces an unchecked one we had), so parents with alerts on are told
     (`docs/registration-alerts.md`). A day without a time is stored as midnight local time and
     shown as the day alone.
   - "The name, town, ages and website are right" confirms those fields too, unless the listing
     changed after the email went out. The camp as a whole becomes `camp_verified` only when
     the owner sent the new dates and ticked that box.
   - A note on the form goes to `owners inbox` for a person.
4. **The owner gets back exactly what changed**, each fact before and after, and the listing as
   it now stands, with "reply and a person will fix it".
5. **Not set yet** is an answer. The camp keeps last season's dates and shows as answered; the
   queue asks again three weeks later.

**The January 1 number** is the first line of `queue`: live camps in the Providence area
(`camps.region = 'Providence, RI'`) whose next-season dates came from the owner, either through
this email or a reply, or a listing confirmation of a listing that already showed that season.
A camp our team moved to 2027 from its website doesn't count until the owner confirms it.

## Spots left

When an owner tells us how many spots a session has left (by reply, phone or text), record it:

    python -m campfinder.owners spots <camp> <session> <left> [--total N] --by <name> --from-owner

`<session>` is the session id, its exact name or its start date. `0` marks the session full, and
spots coming back reopen it. Leave out `--from-owner` when the team checked the number itself.
Each change goes in the change log, and parents and assistants see the number with who gave it
and when. The camp page links by slug (`/camps/<slug>`); ids still work.
`<camp>` is the camp's id, its dataset slug (`data/camps/*.json`) or its exact name.

Every step is written to `listing_changes` with who did it and why (company rule 13).

## Email

Email goes out only when `EMAIL_MODE=resend` and `RESEND_API_KEY` are set. Otherwise
`send` records the email, notes in the change log that it wasn't emailed, and prints the link for
you to send by hand.

Emails are signed as Bunkcheck, never as a person (`docs/decisions/agents.md`, rule 1), and say
that a reply reaches a person.

| Variable | Default | Use |
|---|---|---|
| `OWNER_EMAIL_SIGNATURE` | `Bunkcheck` | Sign-off line |
| `OWNER_REPLY_TO` | none | Where owners' replies go: `owners@mail.bunkcheck.ai`, never a personal address |
| `RESEND_WEBHOOK_SECRET` | none (endpoint off) | Signing secret of the Resend webhook for `email.received` |
| `OWNER_FORWARD_TO` | none | The inbox a person reads; replies are forwarded there |
| `OWNER_UPDATES_FROM_MAIL` | off | `1` also sends each reply to listing updates by email (below) |

Replies reach a person this way: Resend receives mail for `mail.bunkcheck.ai` (an MX record on
that subdomain), calls `POST /api/v1/internal/resend-inbound` (Svix-signed, 404 otherwise), and
`campfinder/owners/inbound.py` forwards the message to `OWNER_FORWARD_TO`. Attachments stay in
Resend. Replying from the forward shows the reader's own address, so answer camps from a
Bunkcheck address.

The copy in `campfinder/owners/emails.py` is a starting point for Andrew to edit.

## Listing updates by email

An owner writes "Week 3 is full"; the listing changes and the owner gets back "here is what
changed, reply if wrong" (ROADMAP Phase 2, item 2). Code: `campfinder/owners/updates.py`.

1. **The email arrives**, from the mail provider's inbound hook
   (`POST /api/v1/internal/owner-mail`, header `X-Inbound-Secret: $OWNER_INBOUND_SECRET`, 404
   unless set; JSON `{from_email, text, subject?, message_id?, sender_verified?}`), or pasted by a
   person: `python -m campfinder.owners receive --from owner@camp.org < email.txt`. Each one is
   stored in `owner_messages`; a redelivery with the same Message-ID is handled once.
2. **Who sent it.** A camp contact who has already confirmed a listing (their
   `camp_contacts.verified_at` is set), or the address a season update email went to in the last
   60 days, for exactly one camp. Anyone else goes to a person.
3. **Claude reads it** against the camp's sessions (`INGEST_MODEL`), through one tool
   (`record_reply`) with the system prompt cached, the listing tool's pattern. It may report
   only: a session is full, open again, or has N spots left; and next season's dates, price per
   week and registration day (the three facts the season update asks for). Each comes with the
   owner's own words. Anything else (refunds, payments, a complaint, a question, a change to
   ages or location, an upset tone, anything unclear) marks it for a person. The email is
   treated as data: the reader can only name the camp's own session ids, and the code checks
   every change (spots within the total, dates inside the season, a sane price).
   **"Same weeks as last year"** becomes dates in code: last season's sessions moved to the same
   weekdays. If that's ambiguous (a holiday moves into or out of a week, we have no sessions
   to copy, or the listing already shows the new season), the dates are not proposed. Instead
   the owner is asked: the reply lists the dates it would mean and says "reply yes if these are
   right". The message waits as `asked`, and their next reply is read against that question.
4. **A person applies it**: `python -m campfinder.owners inbox` lists what's waiting,
   `apply <id> --by NAME` makes the changes, `reject <id> --by NAME --reason "..."` closes it.
   Each change goes in `listing_changes` as `owner_email`, with the owner's address and the
   whole email.
5. **The owner gets back what changed**: each change before and after with their words, every
   session as it now stands, and "reply and a person will fix it". It shows the change in full
   because some owners will read it with their own AI. Season facts go through the same code
   as the form (`season.apply_facts`), logged as `owner_email`.

A person applying each change is a promise we make at launch, not a stopgap
(`docs/decisions/agents.md`, rule 6). Turning on `OWNER_UPDATES_AUTO_APPLY=1` lets routine updates apply without a person, but only
when the provider reports the sender passed SPF/DKIM (`sender_verified`): a From address alone
is easy to fake. Leave it off until the inbound provider is set up and a few weeks of proposals
have been right.

| Variable | Default | Use |
|---|---|---|
| `OWNER_INBOUND_SECRET` | none (endpoint off) | Shared secret the inbound hook sends |
| `OWNER_UPDATES_AUTO_APPLY` | off | Apply routine updates from verified senders without a person |

## Not yet

- Text messages.
