# Security program and breach plan

**Draft for counsel.** Launch legal list item 14. Not legal advice. Counsel decides what the
law requires; this draft describes what Bunkcheck does today, what it should do next, and how
it responds to an incident.

Drafted 13 November 2026 from the code on `main` at `0a418ce` and `docs/DEPLOY.md`.
The company is Bunkcheck; its full legal name goes in once the entity is formed (item 1).

## The short version

- The most sensitive data is the info kit: contacts, pickups, insurance, medical and allergy
  notes. It is encrypted in the application before it reaches the database, never sent to the
  AI model, and shared only through links the parent makes.
- **The kit's key can't be rotated today.** `KIT_ENCRYPTION_KEY` is one key with no id. A new
  key makes every saved kit unreadable (`docs/DEPLOY.md`). So after a suspected leak we can't
  change it without losing every family's kit, and a leaked key plus any copy of the database,
  backups included, opens every kit. Part 3 proposes a fix. It is not built.
- One person holds every admin account, and the database service key reads every table.
  Admin-account hygiene is the biggest control we have and the least written down.

---

## Part 1: The security program

### 1.1 Scope and owner

The program covers the Bunkcheck API (Railway), database and sign-in (Supabase, us-east-1),
website (Vercel), email (Resend), the AI model (Anthropic), the source code (GitHub) and,
once billing starts, Stripe.

Owner: Andrew, as [title] of Bunkcheck. He reviews this document every [6 months] and after
any incident.

### 1.2 What we protect

| Class | Examples | Where |
| --- | --- | --- |
| Most sensitive | Info kit: medical and allergy notes, insurance, pickup people | `family_kits` (encrypted) |
| Family data | Children's first names and ages, calendar, tasks, registrations, assistant conversations | `families`, `family_*`, `plan_picks`, `agent_conversations` |
| Contact data | Parent and camp staff emails, names, phones | Supabase Auth, `family_members`, `camp_contacts`, `registration_alerts`, `owner_messages` |
| Secrets | Service key, kit key, API keys, link tokens | Railway variables; hashed tokens in the database |
| Public | Camp listings | `camps`, `sessions`, `programs` |

The full list of tables and how long each is kept is in [retention.md](retention.md).

### 1.3 Controls in place today

**Access to data**

- Row-level security is on for every table, and migration 0015 revokes all table rights from
  Supabase's `anon` and `authenticated` roles. Browsers can't read tables directly; only the
  backend does, with the service key.
- The backend checks family roles in code (`campfinder/auth.py`, `authorize_family`). Only the
  owner, or a co-parent the owner grants, opens the kit; a database constraint
  (`kit_access_co_parent_only`) stops anyone else being granted it.
- The MCP server and the Activity API serve no family or household data.

**Encryption**

- The kit is encrypted with AES-256-GCM in the application, with a random 96-bit nonce per
  save and the family id bound in as associated data, so a ciphertext can't be moved to
  another family (`campfinder/kit/service.py`).
- Traffic to the API, site and database uses TLS. [To confirm with each vendor: encryption at
  rest for the database, backups and logs.]

**Secrets and tokens**

- Secrets live in Railway variables, never in the repository or in chat (`docs/DEPLOY.md`).
- Link and key secrets are stored as sha256 hashes: kit share links, household invites,
  listing confirmation links, partner API keys and, on the inquiry branch, inquiry tokens.
- Stored in plain text, so a database copy exposes them: calendar feed tokens
  (`families.calendar_token`, `family_members.calendar_token`), registration alert tokens,
  camp claim verification tokens, and the kit share token held in an inquiry for the camp's
  email (by design).

**The AI model**

- The kit is never sent to the model. Anything the assistant would send to another person is
  shown to the parent as a card to confirm.
- MCP tool calls are counted by host and tool, never with their arguments.

**Records**

- `family_audit_log`: who did what in a household, including through the assistant.
- `kit_share_events`: every open of a shared kit link.
- `listing_changes`: every change to a listing, with who made it.
- `api_usage`: every partner request.
- `owner_messages.sender_verified`: whether an owner's email passed SPF and DKIM.

**Abuse limits**

- Partner keys: per-key rate limit, revocable (`api_clients.active`).
- Inquiries (branch): per IP, per family, per camp and spam limits (`docs/inquiries.md`).
- Scheduled jobs and inbound mail hooks need a shared secret header.

**Change control**

- Every change goes through a pull request to `main`; CI runs the test suite and the frontend
  checks. Andrew merges. Schema changes only through numbered migrations.

### 1.4 Gaps, in order of risk

| # | Gap | Proposed control | Owner |
| --- | --- | --- | --- |
| 1 | The kit key can't be rotated | Part 3 | A session builds; Andrew approves |
| 2 | No written rule for admin accounts | Hardware-key or app-based two-factor sign-in on GitHub, Supabase, Railway, Vercel, Resend, Anthropic, the domain registrar, the password manager and Stripe. Company-owned accounts (item 2). A list of who has access, reviewed every [6 months] | Andrew |
| 3 | The service key reads and writes every table | Keep it only in Railway. Later, a narrower database role for jobs that don't need everything | A session, later |
| 4 | No tested restore | Restore a backup to a scratch project once a [quarter] and record how long it took | Andrew |
| 5 | No dependency scanning | Turn on GitHub Dependabot alerts, and add `pip-audit` and `npm audit` to CI | A session |
| 6 | Plain-text tokens listed in 1.3 | Hash them, as the other link tokens already are | A session |
| 7 | `POST` analytics takes any `properties` without sign-in | Accept known keys only, cap the size | A session |
| 8 | `EMAIL_MODE=log` writes recipient addresses to Railway logs | Log a hash or the domain only | A session |
| 9 | No alerting | Alerts for failed deploys, error spikes, and unusual reads of `family_kits` | A session |
| 10 | Deleted families stay in backups and vendor logs | State it in the privacy policy; see [retention.md](retention.md) | Counsel, then a session |

### 1.5 Vendors

Each vendor below processes family or camp data. Item 13 collects their processor agreements;
this list says what each one holds.

| Vendor | Holds | Notes |
| --- | --- | --- |
| Supabase | The database, sign-in accounts, backups | us-east-1 |
| Railway | The API, its variables (every secret), its logs | Request logs include IP addresses |
| Vercel | The website and its logs | |
| Anthropic | Assistant conversations, sent turn by turn | Never the kit |
| Resend | Every email we send, and inbound owner mail | |
| GitHub | Source code, CI | No family data |
| Stripe (future) | Camp billing contacts and payments | |

---

## Part 2: Incident plan

An incident is any event where family, camp or partner data may have been seen, changed or
lost by someone who should not have, or where a secret may have leaked. When in doubt, treat
it as one and stand it down later.

### 2.1 Who does what

| Role | Who | Contact |
| --- | --- | --- |
| Incident lead: decides, records, communicates | Andrew | [phone] |
| Counsel: notification duties and wording | [privacy counsel, item 10] | [phone, email] |
| Insurer: breach coach and forensic firm | [cyber policy, item 22] | [claims line, policy number] |
| Vendors | Supabase, Railway, Vercel, Resend, Anthropic, GitHub, Stripe support | [support links, account ids] |

Call the insurer before hiring anyone. Most cyber policies require it. [To confirm once the
policy is bought.]

### 2.2 Severity

| Level | Means | Examples | First call within |
| --- | --- | --- | --- |
| 1 | Kit contents, or family data for many families, may be exposed | Service key or kit key leaked; database copy taken | [1 hour]: counsel and insurer |
| 2 | Family data for one or a few families exposed, or a partner misusing a key | A share link sent to the wrong camp; a co-parent added by mistake; a partner confirming inquiries without parents | [24 hours]: counsel |
| 3 | No personal data exposed | A leaked email-sending key with no sign of use; a spam wave | Record it; no outside call |

### 2.3 Steps

**1. Write it down.** Open a dated incident record before anything else: what was seen, when,
by whom. Add to it at every step. Keep it in [the company drive], not only in chat.

**2. Preserve evidence.** Export Railway, Vercel and Supabase logs for the period before they
roll over. Don't delete rows or redeploy over evidence until the incident lead says so.

**3. Contain.** The switches available today:

| Problem | Switch | Works today? |
| --- | --- | --- |
| A partner key misused | `UPDATE api_clients SET active = false WHERE id = …` | Yes |
| Kit share links exposed | `UPDATE kit_shares SET revoked_at = now() WHERE revoked_at IS NULL` (one family or all) | Yes |
| Calendar feed links exposed | Reset per family or member in the app; all at once needs SQL | Partly |
| Service key leaked | New key in Supabase, then in Railway; redeploy | Yes. [To confirm the steps for Supabase's key types] |
| Signed-in sessions stolen | Sign out all users from Supabase | [To confirm] |
| Email key leaked, or a bad email run | `EMAIL_MODE=off` in Railway; new Resend key | Yes |
| Anthropic, cron or inbound secrets leaked | New value in the vendor and in Railway | Yes |
| **Kit key leaked** | Rotate the key | **No.** Rotating loses every kit. Until Part 3 is built: take the kit routes offline, keep the key, and treat every kit as exposed |
| Everything | Stop the Railway service | Yes |

**4. Assess.** Decide what data, whose, how many families, which states they live in, and
whether the data was encrypted with a key that stayed safe. Use [retention.md](retention.md)
to list every table and copy involved.

**5. Notify.** Counsel decides who must be told, when and how. The questions to bring:

- Which state breach-notification laws apply, given where the affected parents and camps live
  (Rhode Island, Connecticut and Massachusetts at least), and what deadline and content does
  each set?
- Does any state's attorney general or regulator need notice?
- Does encryption of the kit change any duty, if the kit key was not exposed?
- Are children's details or medical notes a separate category under those laws, or under the
  COPPA position (item 11)?
- What do we owe camps under the camp agreement, and partners under the partner terms?
- What must our vendors tell us, and how fast, under their processor agreements (item 13)?
- What must we tell the insurer, and when?

Draft notices in plain words: what happened, what data, what we did, what the family should
do, and a contact. Counsel approves every notice before it goes.

**6. Recover.** Fix the cause, restore from backup if data was changed or lost, rotate
anything that may have leaked, and watch for repeat activity for [30 days].

**7. Review.** Within [2 weeks], write what happened, why, and what changes. Update this
document and the gap list in 1.4. No blame; the record is for fixing the system.

### 2.4 Practice

Run one tabletop exercise before launch and then once a year: "the service key was pasted in
a public place". Time how long containment takes.

---

## Part 3: Kit key rotation (proposed, not built)

### 3.1 Why it matters

Today every kit is encrypted under the one key in `KIT_ENCRYPTION_KEY`. Blobs carry a format
tag (`v1:`) but no key id, so the code can't tell which key made a blob, and can hold only one
key. That leaves three problems:

1. **A suspected leak can't be fixed.** Changing the key makes every saved kit fail with
   "The info kit could not be decrypted".
2. **One leak opens everything, forever.** The key plus any copy of `family_kits`, including
   old backups, opens every kit ever saved under it.
3. **Losing the key loses every kit.** The only copy outside Railway is the password manager.

### 3.2 Design: a key ring, then re-encryption

**Blob format.** New saves write `v2:<key id>:<base64 of nonce and ciphertext>`. Existing
`v1:` blobs keep working and are read with a key named as the legacy key.

**Key ring.** Replace the single variable with:

- `KIT_ENCRYPTION_KEYS`: a list of `id=base64key` pairs, for example `k2=…,k1=…`.
- `KIT_ACTIVE_KEY_ID`: the id new saves use, for example `k2`.
- `KIT_LEGACY_KEY_ID`: the id that reads `v1:` blobs, for example `k1`. Set to the current key.

Encrypt always uses the active key. Decrypt reads the key id from the blob and uses that key.
An unknown id fails loudly, naming the id, so a missing key is found at once and not mistaken
for corruption. The family id stays bound in as associated data.

**Re-encryption.** A command, `python -m campfinder.kit.rotate [--dry-run]`:

1. Counts kits by key id and prints the counts.
2. For each kit not on the active key: decrypt, encrypt with the active key, and write back
   only if `updated_at` has not changed since the read, so it never overwrites a parent's save
   made at the same moment.
3. Can stop and restart at any point; a second run does nothing.

Saves also move a kit to the active key, so active families move on their own.

**Retiring a key.** Remove an old key from the ring only when:

- the count for that key is zero; and
- the backup window has passed, because backups still hold blobs under the old key.

Until then keep the old key in the password manager, marked retired, with the date it can be
destroyed. After a leak the order is different: rotate and re-encrypt at once, and treat
backups made before the rotation as exposed for the rest of their window.

**Emergency rotation, once built.**

1. Generate a new key; add it to the ring as active, keep the old key as a reader.
2. Deploy. New saves use the new key.
3. Run the rotation command; confirm the old key's count is zero.
4. Remove the old key from Railway. Record the time in the incident record.

### 3.3 Tests the build needs

- A `v1:` blob still decrypts with the legacy key.
- New saves write `v2:` with the active key id.
- Rotation moves every kit and is safe to run twice.
- A save during rotation is never overwritten.
- A blob under an unknown key id fails with a message naming the id.
- A ciphertext moved to another family still fails.

### 3.4 Later: keys held outside Railway

The key ring still keeps the master key in a Railway variable, next to the service key. A
stronger design is envelope encryption: each family's kit gets its own data key, and a key
service outside Railway wraps those data keys with a master key that never leaves it. Rotation
then rewraps small data keys, every unwrap is logged, and a Railway leak alone does not open
kits. It adds a vendor (item 13) and some cost. Worth doing before family data at scale (Gate
2); the key ring is enough to unblock rotation now.

---

## Questions for counsel

1. Is this document, once adopted, enough to be the "written security program" any state in
   item 12 expects, or does a state require specific elements we have left out?
2. Which breach-notification laws apply, with what deadlines, given where families live?
3. Does encryption of the kit change notification duties if the kit key is not exposed? Does
   the answer change because today the key can't be rotated?
4. Should the camp agreement and partner terms carry a duty to tell us of a breach within a
   set time (the camp draft says [72 hours])?
5. What incident records must we keep, and for how long?
