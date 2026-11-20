# Parent checks

*Spec, 20 November 2026. Andrew said yes to the six decisions at the end that day. Step 1 of 4 is
built: the tables, the routes and the command line. There is no page for parents yet, so nothing
reaches a parent until step 2.*

"Still right?" on the camp page. A parent who knows a camp tells us a fact is still right, or
that it's wrong and what it is now. This is the first piece of the collective intelligence loop
in `PRODUCT.md`, and the smallest one that's useful before the first summer.

## The short version

- **Two answers per fact.** "Still right" and "This is wrong". No stars, no comments, no thread.
- **No account needed.** Zero families have an account today, so asking for one means zero checks.
- **A report never changes a listing.** It goes to a person, who checks the camp's own page.
- **Nothing shows on the page until a person has looked.** That closes the sabotage route.
- **"Still right" counts only from a confirmed email**, and shows as a count, never a name.
- **Parent counts never touch the trust mark or the ranking.** They sit beside both.
- **No AI reads a report in the first version.** No model cost, and no way to inject a prompt.

Six decisions for Andrew are at the end.

## Where we start from

Read from the live `bunkcheck` database on 20 November 2026:

| What | Count |
|---|---|
| Camps live | 457 (165 showing 2027, 292 still showing 2026) |
| Camps confirmed by their owner | 0 |
| Camps marked checked by our team | 0 |
| Facts with a source row | 10,242, every one `public_web` |
| Families with an account | 0 (232 guest families) |
| Confirmed registration alerts | 0 |
| Verified registration dates | 1 |

Three things follow.

1. **A parent's check is often the first check a fact gets.** The page can't say "confirmed by
   the camp, and 4 parents since". It can say "2 parents say this is still right", and it has to
   read as exactly that, no stronger.
2. **"Ask the owner" isn't routine yet.** No camp has a verified contact, so writing to a camp
   about a report is first contact. First contact is Andrew's (`decisions/agents.md`). In this
   version a report reaches a person, never a camp.
3. **Expect very few checks before January.** Parents arrive with the launch. The reason to
   build now is to have it on the page the day they do, and for Andrew and five Providence
   parents to try it on camps they know.

`field_sources.source_type` already allows `parent_reported` (`migrations/0001_base.sql`).
Nothing writes it, and this version doesn't either: a parent's word alone never becomes the
listed value.

## What a parent sees

### On the camp page

One line under Quick facts: **"Know this camp? Tell us what's right and what's wrong."** It opens
a short list of the facts this page shows, each with the value as listed and two buttons.

| Fact | Field |
|---|---|
| Ages | `age_min`, `age_max` |
| Price a week | `price_per_week` |
| Extended care, transport, meals, financial aid | the four yes/no fields |
| Each session's dates | `sessions.start_date`, `end_date` |
| Each session's price | `sessions.price` |
| Each session: full or open | `sessions.availability` |
| The day registration opens | `registration_windows.opens_at` |
| The website or registration link works | `website_url`, `registration_url` |
| The camp is running this season | `is_active` |

One entry point, not a button on every row. A camp with ten sessions would carry thirty buttons,
and a parent who knows the camp usually knows several facts at once.

**Still right** is one tap per fact.

**This is wrong** asks two things:

1. "What is it now?" Free text, 280 characters.
2. "How do you know?" I registered there. The camp's website. The camp told me. Something else.
   An optional link.

Then one button, **Send**.

### Who they are

The risk follows what the answer can do.

- **A report ("this is wrong") needs nothing.** It changes nothing by itself, a person checks
  it, and it never shows publicly before that. Email is optional: "Want to hear what we find?"
- **A "still right" needs a confirmed email**, because it's the one answer that shows on the
  page. Same pattern as registration alerts: one email with a link, a page with a Confirm
  button, and opening the link changes nothing, so a mail scanner can't confirm. One
  confirmation covers every fact in that visit. The page lists the answers before the button.
- **Later visits from the same browser count at once.** The browser keeps the link's token and
  sends it with the next answers. An address typed into the form proves nothing, even one that
  confirmed before, because anyone can type it: those answers wait for the link in the email.
- **A signed-in parent skips the email.** Sign-in already verified the address.

We say why at the moment we ask (trust rule 3): "So one parent counts once, and so we can tell
you what we found. We never show your address or share it with the camp."

### What comes back

If they left an address, one email when a person has handled the report. Signed Bunkcheck, with
"reply and a person will see it".

- **Fixed:** "You were right. Camp Hoffman's price now shows $360 a week. Thanks for telling us."
- **As listed:** "We checked the camp's page on 20 November and it still says $340 a week. Here's
  the page. If you saw something different, reply and tell us where."
- **Asking the camp:** "We couldn't tell from the camp's page, so we're asking the camp."

Every email has "Stop emails about my checks", which deletes the address and keeps the answers
without it.

## What the page shows

- **A count, once two confirmed addresses agree** on the value now listed, within 90 days:
  "2 parents say this is still right, November 2026". Under two, nothing.
- **A count is for one value.** Each check stores the value the parent saw. When the price moves
  from $340 to $360, the checks for $340 stop counting. Computed when read, never stored.
- **"We're checking this with the camp"**, only after a person sets it. An unreviewed report
  shows nothing.
- **The trust mark doesn't move.** "Confirmed by the camp" and "Checked with the camp" mean what
  they mean now. A parent count is a separate line in a separate place, in muted text.
- **Ranking ignores it.** A camp can't climb by sending friends to tap "still right", which is
  also why a camp tapping its own listing isn't worth policing.
- **A camp that pays for the verified profile gets no shield.** Reports on it are handled the
  same way.

## What a person does with a report

Each report is emailed to `OWNER_FORWARD_TO`, the inbox a person already reads: the fact, what
the page says, what the parent says, how they know, and the link to the camp's own source for
that fact.

    python -m campfinder.checks inbox                       # what's waiting, oldest first
    python -m campfinder.checks show <id>
    python -m campfinder.checks fixed <id> --by NAME [--source URL]   # the parent was right, the listing is changed
    python -m campfinder.checks as-listed <id> --by NAME    # the camp's page agrees with us
    python -m campfinder.checks ask-camp <id> --by NAME     # can't tell; shows "checking with the camp"
    python -m campfinder.checks close <id> --by NAME --reason "..."   # not a fact, spam, a duplicate

1. **The person reads the camp's own page**, with the repo fetcher. A refusal is the answer, as
   everywhere else: then it's `ask-camp`.
2. **The listing is changed the way it's changed today** (the camp's file in `data/camps/` and
   the import, or `owners spots` for spots). The change is logged as `team` in
   `listing_changes`, with the parent's words as the message behind it. `fixed` writes that row
   itself, and refuses to run until the listed value differs from what the parent saw. With
   `--source`, the camp's page the person read, the fact's source becomes `team_verified` with
   that page as its link. Without it (the camp said so by phone), no source changes.
3. **`ask-camp` sends nothing.** The camp is listed first when `owners queue` prints, with the
   fact a parent reported. Andrew decides whether and how to write. Once a camp has a
   verified contact, a later version can send the one-line question.
4. **An opinion, or anything about a person or a child, is closed** as `not_a_fact`, and its
   text is cleared. "The counselors are careless" has nowhere to go in this version. That's on
   purpose.

**The promise:** a person looks at every report within two working days. If the number waiting
makes that untrue, the line on the camp page comes off until it's true again.

## Data

One migration, `0038_parent_checks.sql` (0037 is taken by an open PR). Row-level security on, backend only.

**`parent_reporters`**: one row per address.

| Column | Use |
|---|---|
| `email` | Unique on `lower(email)` |
| `confirm_token_hash` | sha256 of the link token; the token is never stored |
| `confirm_sent_at`, `confirmed_at` | When the link went out; when they confirmed. "Stop" deletes the row |

**`parent_checks`**: one row per answer.

| Column | Use |
|---|---|
| `camp_id`, `session_id` | The camp; the session when the fact is a session's |
| `field_name` | One of the facts in the table above, by its name in `services/checks.FACTS`. Anything else is refused |
| `verdict` | `right` or `wrong` |
| `value_seen` | The value the listing held when the answer arrived, as JSON, read by the server. A `right` vouches for this value only |
| `says` | "What is it now?", 280 characters. Only for `wrong` |
| `basis`, `evidence_url` | How they know; the optional link (http or https only) |
| `reporter_id` | Null for a report sent without an address |
| `confirmed_at` | When the address behind this answer was proven. Null: it waits for the link |
| `status` | `unconfirmed`, `counted` (for `right`); `open`, `asking_camp`, `fixed`, `as_listed`, `closed` (for `wrong`) |
| `reason`, `handled_by`, `handled_at` | Who closed it and why |
| `listing_change_id` | The change this report led to, when `fixed` |

One answer per address, per fact: a proven newer answer replaces the older one.

Not stored: a name, a child, a family id, an IP address.

## Routes

| Route | Auth | Limit | Abuse case |
|---|---|---|---|
| `GET /api/v1/camps/{id}/checks` | None | None | Public: the checkable facts with their values and counts |
| `POST /api/v1/camps/{id}/checks` | None, or signed in | 10 an hour per IP; 30 reports a day per camp emailed to the person; one confirm email an hour and three a day per address | Flooding the queue, a camp or an inbox; capped |
| `GET, POST /api/v1/checks/{token}`, `/confirm`, `/stop` | Link, 192 bits, hash stored; confirm works for 7 days | None | Guessing is infeasible |

- The POST answers `202 {"status": "received"}` whether the address is new, known or confirmed,
  as the alert sign-up does, so it can't be used to learn whose address we hold. An answer we
  can't take (an unknown fact, a "still right" with no address) is a 422 and stores nothing.
- "Unknown" availability and a fact the listing doesn't hold are nothing to vouch for: a
  "still right" on them is refused, and a report is welcome.
- Past a camp's daily cap, reports are still stored but nothing more is emailed to the person
  that day.
- The parent's text is data. In this version only a person reads it. It's never shown on a
  public page and never sent to a model.
- Not on the MCP server, the ChatGPT or Claude apps, or the Activity API in this version.

These rows are in `docs/security.md`.

## Trust rules

- **Rule 1, export and delete.** A check belongs to an address, not a family, as an alert does.
  The owner's export includes the checks made from the account's own email
  (`services/family_export.py`, the same match alerts use). "Stop" deletes the address.
- **Rule 3, only what's needed.** An address, a camp, a fact, an answer, and at most 280
  characters and a link.
- **Rule 4, what they learned, never who they are.** Counts only, from two up. The camp never
  learns who reported, and a report's text is never quoted to the camp in this version.
- **Rule 5, recommendations aren't for sale.** Parent counts stay out of ranking, and paying
  doesn't change how a report is handled.
- **Retention**, for counsel, as a new row in `docs/legal/retention.md`: unconfirmed addresses
  deleted after [30 days]; a report's free text cleared [12 months] after it's handled; the
  answer itself kept without the address.

## Where code goes

- `campfinder/services/checks.py`: receive, confirm, count, the queue, the four outcomes.
  Models in `campfinder/models/checks.py`. `campfinder/routers/checks.py` only calls it.
- `campfinder/checks/__main__.py`: the command line above, shaped like `campfinder.owners`.
  `campfinder/checks/emails.py`: the confirm email and the report to the person.
- `frontend/components/camp/CheckFacts.tsx` on the camp page, and `frontend/app/checks/[token]`
  for confirm and stop. Built from `components/ui`; `npm run check:ui` stays green.
- `tests/fakes.py` gets defaults for both tables. `tests/test_parent_checks.py` covers each line
  under "Done when".

## Order of work

Four PRs, each small enough to review in one sitting, each with a preview link.

| | What | Done when |
|---|---|---|
| 1, built | Migration, service, routes, command line, tests. No page | A report sent with `curl` reaches the inbox, and each of the four outcomes is logged. A `right` counts only after confirm. Opening the confirm link changes nothing. A `right` for an old value doesn't count. Every limit holds. The export includes the account's own checks |
| 2 | The camp page line and the confirm page | In a browser, on the Vercel preview: send a report, confirm a "still right", stop. Phone width too |
| 3 | The count on the page, "checking with the camp", and the email back to the parent | Two confirmed addresses show the count and one doesn't. The count goes when the value changes. Each of the three emails reads right in preview mode |
| 4 | Ask when a parent knows: a "Did it open as listed?" line in the "open now" alert email, and the same question on a tracked registration | One tap from the email is a `right` from an address that's already confirmed |

Not in this spec, and each needs its own: tips in a fixed shape, the two-tap check-in after a
camp week, town counts ("Providence parents checked 212 facts this month"), counts on the MCP
server and the Activity API, the one-line question to a verified owner, and a reader for
reports once there are too many for a person.

## How we'll know

| Number | Why |
|---|---|
| Reports per 100 camp page views | Whether parents see the line and use it |
| Share of handled reports that were right: `fixed` over `fixed` plus `as_listed` | Whether parents can be trusted further |
| Days from report to handled, median and worst | Whether the two-day promise holds |
| Confirmed "still right" answers per camp | Whether the count ever reaches two |

**After 50 handled reports**, read the share that were right. At 70% or more, the next step is
showing "a parent reported this may have changed" before a person looks. Under that, the person
stays in front. The 70% is a starting line for Andrew to move, not a measured one.

**Before PR 2**, five Providence parents try the preview on a camp they used last summer. What to
watch: whether they find the line unprompted, whether they give an address, and what they try
to say that isn't a fact.

## Decisions for Andrew

Each has the answer this spec assumes.

1. **No account needed?** Yes. A report needs nothing; a "still right" needs a confirmed email.
2. **Does anything show before a person looks?** No.
3. **Do parent counts move the trust mark or the ranking?** No, neither.
4. **How many parents before a count shows?** Two.
5. **Who reads the reports, and how fast?** Whoever reads `OWNER_FORWARD_TO`, within two working
   days.
6. **The words.** "Know this camp? Tell us what's right and what's wrong", and the three emails
   back. Yours to edit.
