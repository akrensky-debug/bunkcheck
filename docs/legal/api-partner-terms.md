# Activity API partner terms

**Draft for counsel.** Launch legal list item 19. Not legal advice. Counsel finishes this and
decides liability, warranties, governing law and every term marked as a question.

Drafted 13 November 2026. The company is Bunkcheck; its full legal name goes in once the
entity is formed (item 1).
These terms replace the one-paragraph summary in `docs/activity-api.md` once counsel signs off.

Part 1 is the text a partner reads. Part 2 is notes for counsel. Part 3 shows which terms the
code already enforces.

---

## Part 1: Terms text

### Bunkcheck Activity API Partner Terms

These terms are between **Bunkcheck [entity type, state]** ("Bunkcheck", "we") and the organization that holds a
Bunkcheck API key ("the partner", "you"). They apply to every use of the Activity API,
including the inquiry endpoints.

#### 1. Your key

1.1 We issue one or more keys to you by name. Keep them secret. You are responsible for every
request made with your keys.

1.2 Tell us at once if a key may have leaked. We will revoke it and issue a new one.

1.3 Each key has a rate limit (by default 120 requests a minute). Requests over the limit are
refused.

#### 2. Attribution

2.1 Wherever you show Bunkcheck data to a person, show the `attribution` text and link from
the response, where the person can see it next to the data.

2.2 Tell the person when a record is marked `unverified`.

2.3 Send families to the camp's own `url` or `registration_url` to register. Do not present
yourself or Bunkcheck as the camp.

#### 3. No resale

3.1 You may use Bunkcheck data inside your own product to help families. You may not sell,
license, sublicense or give the data to anyone else, alone or as part of a dataset.

3.2 You may not use the data to train or tune a model offered to others, or to build a
directory of camps that competes with Bunkcheck. [Question for counsel: see note 2.]

3.3 You may cache responses for up to [24 hours] to run your product. Do not keep a copy
longer, and do not keep a copy after these terms end.

#### 4. No family data

4.1 You never send us anything that identifies a family or a child: no names, email
addresses, phone numbers, street addresses, dates of birth, account ids that we could link to
a person, or health details. This applies to every field, including free text.

4.2 Where an endpoint asks for a `user_ref`, send an opaque value that only you can link to a
person, and that you don't reuse across partners.

4.3 We may reject or delete any request that appears to contain a family's details.

#### 5. Parents' contact details and inquiries

5.1 You may send a camp a parent's question through the inquiry endpoints. Nothing reaches the
camp until the parent agrees.

5.2 A parent's name, email address or phone number reaches a camp only when she adds them
herself on Bunkcheck. You never pass them to us, and no flag on your key changes that.

5.3 An info kit package reaches a camp only as a link the parent made on Bunkcheck.

#### 6. Confirming a question for a parent

6.1 We may approve your key, in writing, to confirm an inquiry for a parent. If we do:

- you may confirm only **anonymous** questions: no info kit package and no contact details;
- you may confirm a question only after the parent has seen exactly what the camp will read
  and has told you, in that session, to send it;
- you send `parent_agreed: true` only when that is true; and
- you keep a record of her agreement for [12 months] and show it to us on request.

6.2 A question with an info kit package or contact details always needs the parent's own yes
on Bunkcheck. We refuse it from your key.

6.3 Each confirmation you make is recorded against your key, with the time.

6.4 We may withdraw approval at any time, with or without a reason.

#### 7. Logging

7.1 We log each request made with your key: the key, the endpoint and the time. For inquiries
we also keep the question, the channel and, if you confirmed it, your key and the time.

7.2 We record which programs appeared in each search response. We do not log your search
queries with your key.

7.3 We use these logs to run the service, enforce these terms, bill camps correctly and
answer questions from camps and parents. We may show a camp how many times its listing
appeared through AI assistants and partners, without naming you. [Question for counsel: see
note 5.]

#### 8. Suspension

8.1 We may suspend or revoke a key at once, without notice, if:

- the key is over its rate limit again and again;
- a request contains a family's details;
- you confirm an inquiry the parent did not agree to;
- you break section 3; or
- we need to, to protect families, camps or the service.

8.2 We tell you why, unless the law or an investigation prevents it. If the problem can be
fixed, we restore the key once it is.

8.3 We may change or end the API, or these terms, on [30] days' notice by email to your
contact address.

#### 9. Everything else

[For counsel: no warranty on data accuracy, liability cap, indemnity from the partner for
breach of sections 4 to 6, governing law, disputes, notices, termination and survival.]

---

## Part 2: Notes for counsel

1. **Acceptance.** Keys are issued by hand today (`python -m campfinder.scripts.create_api_key`).
   Should acceptance be a signed order form, or a click at a future signup page?
2. **Section 3.2, training.** Is it enforceable to bar partners from training a model on the
   data, and is that what we want for AI assistant partners?
3. **Section 4.2, `user_ref`.** We hash it to count one family across inquiries for billing.
   Is an opaque partner reference personal information under the state laws in items 11 and
   12, once hashed and held by us?
4. **Section 6, partner confirmation.** The partner states the parent agreed. We can't check
   that. Is the record-keeping duty plus suspension enough, or do we need an audit right or an
   indemnity? The design note in `docs/inquiries.md` also says anyone holding a confirm link
   can press Send.
5. **Section 7.3, appearance counts.** Camps see how often they appeared through assistants. Is
   that a disclosure about partners that needs their consent?
6. **Rule 5 in `docs/decisions/agents.md`** says family data does not go to third-party
   assistants until privacy counsel has reviewed it. Inquiries carry a parent's question
   through partners by design. Is the parent's own question, without contact details, "family
   data" under that rule? Andrew and counsel decide; CLAUDE.md should then say so.
7. **Directory rules.** The ChatGPT and Claude directory rules ask apps not to collect health
   data. A parent can still type a health question into an inquiry. Is a filter needed, or is
   the tool description enough?

---

## Part 3: Where the code keeps each term

Checked against `main` at `0a418ce` and `claude/inquiry-tool` (not merged) on 13 November 2026.

| Term | Enforced in code? | Where, or what is missing |
| --- | --- | --- |
| 1.3 Rate limit | Yes | `api_clients.rate_limit_per_minute`, `429` with `Retry-After` (`activity/auth.py`) |
| 1.1 Keys never stored | Yes | `api_clients.key_hash` is a sha256; only a prefix is kept for support |
| 2 Attribution | Partly | Every response carries `attribution`. Showing it is on the partner |
| 3 No resale, caching limit | **No** | Contract only. No way to detect it in code |
| 4.1 No family data in requests | Partly | Demand signals are checked for contact details (`routers/activity.py`, `_PII`). Inquiry questions are checked for email and phone on the branch. Names and health details are not detected |
| 5.2 Contact details only from the parent on Bunkcheck | Yes, on the branch | `inquiries/service.py` refuses partner-passed contact details whatever `may_share_contact` says |
| 6.1 Only approved keys confirm, anonymous only | Yes, on the branch | `api_clients.may_confirm_for_parent` (default false); `confirm_for_parent()` returns `403` when a kit package or contact is present |
| 6.3 Confirmation recorded against the key | Yes, on the branch | `confirmed_via = 'partner'`, client id and name, `confirmed_at` |
| 7.1 Request log | Yes | `api_usage` (key, endpoint, time). No retention limit: see [retention.md](retention.md) |
| 7.2 Appearances without queries | Yes, on the branch | `result_appearances` holds channel, surface and program ids only |
| 8.1 Suspension | Yes, by hand | Set `api_clients.active = false`. No admin page; a person runs SQL |
