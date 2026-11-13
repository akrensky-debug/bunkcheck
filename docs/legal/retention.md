# Retention schedule

**Draft for counsel.** Launch legal list item 15. Not legal advice. Counsel sets the final
periods; the privacy policy (item 5) then states them.

Drafted 13 November 2026 from the schema itself: every table created in `migrations/0001` to
`0016` on `main` at `0a418ce`, plus `0017` and `0018` on `claude/inquiry-tool` (not merged),
and the services that write and delete them. Outside the database, it lists every service
that holds a copy.

## What this shows

1. **Almost nothing is deleted on a schedule.** Two limits run in code, both on the unmerged
   inquiry branch. Everything else is kept until a parent deletes her family, or forever.
2. **Conversations with the assistant have no limit.** `agent_conversations.messages` keeps
   every turn, including tool results, for as long as the family exists. Each turn is also sent
   to Anthropic.
3. **Deleting a family leaves four things behind.** `DELETE /families/{id}`
   (`kit/service.delete_family_data`) deletes the `families` row and everything that cascades
   from it. It does not delete:
   - the owner's and co-parents' sign-in accounts in Supabase Auth (their email addresses);
   - registration alerts, which are keyed by email, not by family;
   - copies in Railway logs, Supabase backups, Resend and Anthropic;
   - on the inquiry branch, it deletes too much: `inquiries.family_id` cascades, so a camp's
     billed inquiry record disappears when the parent deletes her family, including inside the
     camp's 14-day dispute window.
4. **Expired links are refused but never removed.** Kit share links, household invites and
   listing confirmation links stop working on time; their rows stay.

## Legend

- **Enforced**: code deletes or redacts it on a schedule or on request, and a test covers it.
- **On request**: deleted only when the parent deletes her family.
- **None**: nothing deletes it.
- **Proposed** periods are suggestions for counsel, chosen as the shortest period the product
  needs. Square brackets mark numbers counsel should set.

## The schedule

### Parents and families

| Data | Where | What it holds | Limit today | Enforced? | Proposed |
| --- | --- | --- | --- | --- | --- |
| Sign-in account | Supabase Auth `auth.users` | Email, sign-in times | Forever | **None**. Family delete leaves it (`families.owner_user_id` is `ON DELETE SET NULL` in the other direction) | Delete with the family, and when a person leaves a household and has no other |
| Family profile | `families.profile` | Children's first names and ages, interests, town, summer dates | Until the family is deleted | On request | Delete after [24 months] with no sign-in, after two emailed warnings |
| Info kit | `family_kits` | Encrypted contacts, pickups, insurance, medical and allergy notes | Until the family is deleted | On request | Same as the profile. Backups: see "Outside the database" |
| Kit share links | `kit_shares` | Recipient, chosen fields, open count | Link expires in 1 to 365 days (default 30); row kept | Expiry enforced; row **None** | Delete the row [90 days] after it expires or is withdrawn |
| Kit share opens | `kit_share_events` | Each open, with time | Until the family is deleted | On request | Delete with the share row |
| Household members | `family_members` | Names, emails, roles, reminder settings | Until removed or the family is deleted | On request. Unaccepted invites expire in 7 days; the row stays | Delete an unaccepted invite [30 days] after it expires |
| Calendar, tasks, Summer Board | `family_events`, `family_tasks`, `plan_picks` | Dates, camps, notes, children's names | Until deleted by the family | On request | Same as the profile |
| Registrations tracked | `family_registrations`, `registration_reminder_prefs`, `registration_reminder_sends` | Camp, child's name, payment status, confirmation number, a reminder email typed by the owner | Until deleted | On request | Same as the profile. Sends: [12 months] |
| Booking prototype | `booking_attempts` | Sandbox quotes and the consent record | Until the family is deleted | On request | [12 months]. Sandbox only today |
| Household activity log | `family_audit_log` | Who did what, including via the assistant | Until the family is deleted | On request | [24 months], or with the family |
| Reminder sends | `reminder_sends` | Which digests went to which member | Until the member is removed | On request | [12 months] |
| **Assistant conversations** | `agent_conversations.messages` | Every turn the parent typed and every tool result, including camp details and calendar items | **Forever while the family exists** | On request | Delete [12 months] after the last message. Let a parent delete one conversation |
| Registration alerts | `registration_alerts` | Email, camp, session, confirm and unsubscribe times | Forever, including after unsubscribe | **None**. Not deleted with the family | Unconfirmed: delete after [30 days]. Unsubscribed: keep only the email and date as a do-not-send list. Active: until unsubscribed or [2 seasons] |
| Alert sends | `registration_alert_sends` | Which alert emails went out | Forever | **None** | [12 months] |

### Inquiries (branch `claude/inquiry-tool`, not merged)

| Data | Where | What it holds | Limit today | Enforced? | Proposed |
| --- | --- | --- | --- | --- | --- |
| Unconfirmed inquiry | `inquiries`, status `pending` | Question, channel | Expires after 72 hours; deleted 30 days later | **Enforced** (`inquiries/service.py`, hourly tick) | Keep |
| Delivered inquiry | `inquiries` | Question, replies, contact if she added it, kit link token | 365 days, then text, replies, contact and links removed; date, camp, source and billing kept | **Enforced** (`RETENTION_DAYS = 365`) | Keep 365 days for the text. Keep the billing fields as long as billing records (below) |
| Inquiry on family delete | `inquiries.family_id ON DELETE CASCADE` | The whole row, billing fields included | Deleted with the family | Enforced and tested on purpose, **but it conflicts with billing** | **Decided 13 November 2026: redact and keep the billing fields.** See "Inquiries when a family is deleted" below |
| Search appearances | `result_appearances` | Channel, endpoint, program ids. No query, no family | Forever | **None** | [24 months]. Holds no personal data |
| Camp billing setting | `camp_inquiry_settings` | Opt-in, cap, who changed it | Until the camp is removed | n/a | Keep while the agreement runs, then as billing records |

### Camps and owners

| Data | Where | What it holds | Limit today | Enforced? | Proposed |
| --- | --- | --- | --- | --- | --- |
| Listings | `camps`, `sessions`, `field_sources`, `programs`, `program_offerings`, `program_prices`, `program_field_sources`, `registration_windows`, `registration_forms` | Business facts, the camp's public email and phone | While listed | n/a | While listed; the camp agreement section 9 covers removal |
| Camp staff contacts | `camp_contacts` | Staff names, emails, roles | Forever | **None** | Delete [12 months] after the person stops being a contact |
| Ownership and claims | `camp_ownership`, `claim_requests` | Owner email, name, role, verification token (stored plain) | Forever | **None** | Rejected or unverified claims: [90 days]. Verified: while the camp is listed |
| Camp submissions | `camp_submissions` | Submitter's name, email, phone | Forever | **None** | [12 months] after it is reviewed |
| Listing confirmations | `listing_confirmations` | Email, a snapshot of the listing | Link expires in 30 days; row kept | Expiry enforced; row **None** | [24 months], as evidence of what the owner confirmed |
| Listing change log | `listing_changes` | Every change, who made it, and the owner's raw message | Forever | **None** | Keep the change; remove `raw_message` after [24 months] |
| Owner emails | `owner_messages` | Full email body, sender, subject | Forever | **None** | Remove the body [12 months] after it is handled |

### Partners and statistics

| Data | Where | What it holds | Limit today | Enforced? | Proposed |
| --- | --- | --- | --- | --- | --- |
| Partner accounts | `api_clients` | Partner name, contact email, key hash | Forever | n/a | While the partner has a key, then [24 months] |
| API request log | `api_usage` | Key, endpoint, time | Forever | **None** | [13 months] |
| Demand signals | `activity_demand` | Town or zip, ages, weeks, needs. Checked for contact details | Forever | **None** | [24 months]. Ages plus zip may identify a family in a small town: ask counsel |
| Site and MCP analytics | `analytics_events` | Event, browser session id, page, free-form `properties` | Forever | **None**. The endpoint takes any `properties` without sign-in | [13 months]. Limit `properties` to known keys |

### Billing records (not built)

| Data | Where | What it holds | Limit today | Enforced? | Proposed |
| --- | --- | --- | --- | --- | --- |
| Invoices, payments, refunds, credits, disputes | Stripe, plus our own records once built | Camp, amounts, dates, inquiry ids | n/a | n/a | As long as tax and accounting rules require. Question for the accountant (item 20) |

### Outside the database

None of these is deleted by anything in our code. Each needs the vendor's own setting or term,
which is item 13 (processor agreements).

| Where | What it holds | What we know | To find out |
| --- | --- | --- | --- |
| Supabase backups | Every table, including deleted families, until backups roll over | Not documented in `docs/DEPLOY.md` | The backup window on our plan. A deleted family stays in backups for that long; the privacy policy should say so |
| Supabase Auth logs | Sign-in events, emails, IPs | Not documented | Retention on our plan |
| Railway logs | Request logs with IP addresses (privacy policy says so). With `EMAIL_MODE=log`, every unsent email's recipient address and subject (`campfinder/mailer.py` line 42) | Not documented | Log retention on our plan. Whether to stop logging addresses |
| Vercel logs | Frontend request logs, IPs | Not documented | Retention on our plan |
| Resend | Sent emails: recipients, subjects, bodies, delivery events | Not documented | Retention, and whether bodies are kept |
| Anthropic | Each assistant turn, as sent to the API. The info kit is never sent | Not documented | Retention under our commercial terms, and whether zero data retention is available |
| Stripe (future) | Camp billing contacts and payment details | n/a | Stripe keeps its own records; ours follow the billing row |

## Inquiries when a family is deleted

Decided by Andrew on 13 November 2026. Build on `claude/inquiry-tool` before any camp is billed.

| Inquiry status | What happens |
| --- | --- |
| `pending`, `expired`, `cancelled` | Delete the row. Nothing was delivered and nothing is billable |
| `confirmed`, `delivered` | Redact and keep, as below |

| Column | On redaction |
| --- | --- |
| `question`, `replies`, `contact`, `kit_token`, `kit_share_id` | Removed (null, or `[]` for `replies`) |
| `family_id`, `family_key` | Set to null. The family is gone, and the hash identifies a person |
| `token_hash`, `confirm_token_hash`, `reply_token_hash` | Replaced, so the assistant's read link, the confirm link and the camp's reply link stop working |
| `redacted_at` | Set to the time of deletion |
| `id`, `camp_id`, `session_id`, `channel`, `api_client_id`, `status`, `confirmed_via`, `confirmed_at`, `delivered_at`, `billable`, `bill_reason`, `price_cents`, `created_at` | Kept, for the camp's invoice and the 14-day dispute window |

How:

- `kit/service.delete_family_data` redacts the family's inquiries first, then deletes the family.
- The foreign key changes from `ON DELETE CASCADE` to `ON DELETE SET NULL`, so a delete that
  skips the service can't remove billing records. If migration 0017 has been applied
  anywhere, this is a new migration; never edit an applied one.
- The redaction reuses the 365-day retention job's code, so the two paths remove the same
  columns.
- Tests: `test_inquiries_are_in_the_family_export_and_go_when_the_family_is_deleted` changes to
  check that pending rows are gone and delivered rows keep only the columns above; a second
  test checks that a raw `DELETE FROM families` leaves the billing fields.
- The camp's inquiry page shows a redacted inquiry as "Removed at the parent's request", with
  the date, source and bill reason.

Known effect: with `family_key` cleared, a family that deletes and comes back within 7 days
may be billed again for the same camp. That is rare and is credited under the dispute rules.

## What has to be built to keep this schedule

In order of risk. None of this is in this PR.

1. Fix family deletion: also delete the Supabase Auth accounts that belong only to that family,
   and registration alerts on the account email.
2. Redact inquiries on family delete and keep their billing fields, before billing starts
   (decided; requirements below).
3. A conversation limit for `agent_conversations`, run on the hourly tick next to the inquiry
   retention job.
4. Clean-up of expired kit shares, unaccepted invites and unconfirmed alerts.
5. Limits on `analytics_events`, `api_usage`, `activity_demand` and the owner tables.
6. Find the vendor periods above and write them into the privacy policy.

## Questions for counsel

1. Do the state laws in item 12 (Rhode Island, Connecticut, Massachusetts) set a maximum
   period, or require us to state one, for each kind of data above?
2. Is 24 months of inactivity a reasonable point to delete a family, given that families plan
   one summer a year?
3. May we keep an unsubscribed email address as a do-not-send list after a parent deletes her
   family? Does CAN-SPAM (item 8) expect it?
4. When a parent deletes her family, may we keep a redacted inquiry record for the camp's
   billing and dispute window?
5. Must the privacy policy tell parents that deleted data stays in backups for the backup
   window?
6. Are conversations with the assistant about a child "children's personal information" under
   the COPPA position (item 11), even though a parent writes them?
