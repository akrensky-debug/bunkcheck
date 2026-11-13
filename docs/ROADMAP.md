# CampFinder: Brand and Product Roadmap

*Draft, 28 September 2026. Companion to `PRODUCT.md`, which holds the mission, the model and
the trust rules. This document is the plan to get the brand and the product built for the
2027 booking season.*

## The shape of the plan

Parents book summer 2027 between January and March. That is the deadline everything works
back from. Six phases:

| Phase | Dates | Goal |
|---|---|---|
| 0. Decide | now to 10 Oct | Answer the open questions, book the conversations |
| 1. Learn and lay foundations | Oct | 20 conversations, brand brief, technical base, listing tool tested |
| 2. Supply and identity | Nov | 150 real camps, brand identity done, parent waitlist open |
| 3. Soft launch | Dec | Camps confirm listings, spot requests work, AI answers work |
| 4. Booking season | Jan to Mar | Public launch, parents book, payments once camps are ready |
| 5. First summer | Apr to Aug | Check-ins, the collective intelligence loop begins |

Then fall 2027: expand to Boston with the 2028 season.

## Who does what

Two people for now.

- **Andrew:** decisions, brand, the conversations with camp owners and parents, camp
  recruitment, launch to parents, legal and company setup.
- **Claude (me):** everything in the codebase, the data pipeline, drafts of copy and outreach
  for Andrew to edit, research on competitors and the market.

Bring in help for two things: a designer for the visual identity if Andrew does not want to
do it himself, and a privacy lawyer for a fixed-fee review before we hold family data.

## Brand workstream

The brand carries the trust. Camp owners have to believe we are not another software company,
and parents have to believe we are on their side. Both come from the same place: we are
parents too, and we are honest.

### 1. Positioning (Oct, week 1)

Write down, in one page:

- **Mission:** unlock the collective intelligence of parents to make summer camps easier.
- **For parents:** the whole summer, planned and booked in one place, guided by parents who
  have been there.
- **For camp owners:** get found and booked with nothing new to learn.
- **What we are not:** not a directory, not an ad network, not camp software.
- **Voice:** warm, plain, direct. Sounds like a parent who has done this before, not a brand.
  No exclamation points, no "seamless", no jargon.
- **Proof points:** current data with a date on every fact, the trust rules published in
  full, real parent feedback shown in aggregate.

### 2. Name (Oct, weeks 1 to 3)

"CampFinder" describes the wedge, not the mission, and it is generic enough that the domain,
trademark and social handles are almost certainly taken or crowded. Decide early: a rename
after launch costs far more than one before.

Process:

1. Brief (from the positioning). Directions worth exploring: the summer itself, the parent
   network, the planning ritual, a coined word that can grow past camps.
2. Long list of 40, short list of 8.
3. Check each on the short list: USPTO trademark search, .com or a clean alternative,
   app store, Instagram and Facebook handles, and an ear test with five parents.
4. Pick one and register the domain, handles and a trademark application.

Decision owner: Andrew. Target: name chosen by 24 Oct.

### 3. Visual identity (Nov, weeks 1 to 3)

Logo, colour, type, and a small set of rules. Keep it simple and warm. It has to work on a
camp owner's one-page flyer, a text message, a parent's phone, and a booth table at a
community fair. Deliverables: logo files, a colour and type sheet, a one-page brand guide,
social profile assets.

### 4. Two audiences, two messages (Nov)

**Camp owners**

- A one-page PDF and a web page: what we do, what it costs, what they have to do (nothing
  but reply to an email).
- Email and text scripts for first contact, follow-up, and "your listing is ready, does it
  look right?"
- Their listing page as the sales tool. The first thing an owner sees is their own camp,
  already built.

**Parents**

- The parent landing page with the registration alert sign-up.
- A "how we handle your family's data" page written in plain language: the trust rules,
  published in full.
- Launch content for where parents already are: local Facebook parenting groups, school and
  PTO newsletters, town recreation pages, pediatrician and library notice boards.
- One piece of useful content that travels: the Providence-area 2027 camp registration
  calendar (which camp opens registration when). Parents share this, and every share brings
  alert sign-ups.

### 5. Launch (Dec to Jan)

- December: soft launch to camps. Every camp on the list gets its listing by email.
- Early January: launch to parents through the groups and newsletters above, plus local press
  (Providence Journal, Rhode Island Monthly, GoLocalProv, local parenting blogs). The story
  is "Providence parents built a way to plan the whole summer".
- Andrew as the face. A founder who is a parent solving his own problem is the most credible
  message we have.

### 6. Company and legal (Oct to Dec)

- An entity for the business, if there is not one already.
- Terms of service and privacy policy written from the trust rules, reviewed by counsel.
- Privacy lawyer review of the family profile and data handling (COPPA and state children's
  privacy laws) before December.
- Business insurance before we take payments.
- Stripe account, and Stripe Connect once we handle money for camps.

## Product workstream

### Phase 0: Decide (now to 10 Oct)

Decisions Andrew makes:

1. Who pays the fee: camps, parents, or both, and the percentage. *Decided 5 November 2026:
   no booking fee in 2027. Camps pay for verification and delivered inquiries; see the pricing
   workstream below.*
2. Launch with "request a spot" (recommended) or full payment from day one.
3. Whether the whole-summer cart and fill-the-forms-once are both in the first version.
   Default: forms-once yes, cart in Phase 4.
4. Hours per week this gets.
5. Whether the April hosting (Supabase, Railway, Vercel) still exists.

Bookings: 10 camp owners and 10 parents to talk to in October.

### Phase 1: Learn and lay foundations (Oct)

Build:

- Database migrations, and fixes for the schema conflict and the unsafe cross-site setting.
- A test suite that runs on every commit.
- New tables: spots per session, family profiles, spot requests, registration alerts,
  listing change log.
- The brochure-to-listing tool: send it a PDF or a URL, get back sessions, dates, prices
  and ages. Test on 10 real Rhode Island camp websites and measure how often it is right.
- Remove what we are not doing: the paid Pro plan, the email gate, the lead-selling fields.

Learn:

- Ten camp owner conversations. What fills their spots today? What is the paperwork
  headache? Would they pay a booking fee, and what number makes them flinch?
- Ten parent conversations. How did they plan last summer? What went wrong? Where do they
  look? What would they tell a new parent?
- Competitor check: ActivityHero, Sawyer, Jumbula, local directories. How many New England
  camps does each have?

Done when: the listing tool is right on most fields for most of the 10 test camps, and we
have written down what the 20 conversations taught us.

### Phase 2: Supply and identity (Nov)

*Reordered 1 October 2026 for a world where parents ask Claude or ChatGPT first. An agent can
read any camp's website, so a directory is worth nothing. What agents cannot get is facts the
owner has confirmed, with a date, and the spots actually left. So the owner loop comes first,
and our data reaches parents through their agents as early as possible.*

Build, in this order:

1. Owner confirmation by email or text: "here is your listing, reply if anything is wrong".
2. In parallel:
   - Listing updates by email or text: the owner writes "Week 3 is full", the listing
     changes, and the owner gets back "here is what changed, reply if wrong". Some owners will
     answer with their own AI, so the confirmation back always shows the change in full.
   - A read-only MCP server so Claude and ChatGPT can answer parents from our data: public
     camp facts only, each with its source, its date and whether the owner confirmed it. No
     family data goes through it.
3. Load about 150 camps around Providence with the tool. Hand-check each one.
4. Registration alerts for parents, with a waitlist page under the new brand.
5. The family profile, with the trust rules built in from the first line: ownership, export,
   delete, minimal fields, medical details kept apart.

Done when: 150 camps are live, at least 30 owners have confirmed, Claude or ChatGPT can answer
a camp question from our data with the source shown, and parents can sign up for alerts under
the new brand.

*Status on 3 October 2026: the MCP server (with the ChatGPT and Claude apps) and the family
profile, with sign-in and the encrypted info kit, were built early and are on `main`. Owner
confirmation is not built yet, so nothing the MCP server returns can say "confirmed by the
owner" until it is. That makes item 1 the most important next build.*

### Phase 3: Soft launch (Dec)

Build:

- Request a spot, on our site: the parent asks, the camp confirms by replying to an email or
  text, the camp collects payment itself for now. Not through an agent yet: that would send
  a child's details to a third party, which trust rule 2 forbids until counsel has reviewed it.
- Booking notices to camps with the kid's details and forms.
- A camp page for each camp that is clean and trustworthy, because it is what agents link to.
  The parent site and summer planner get less than planned: parents will plan in the
  assistant they already use.

Done when: a real parent has requested a spot at a real camp and the camp has confirmed it.

### Phase 4: Booking season (Jan to Mar)

- Public launch to parents in early January.
- The whole-summer cart.
- ~~Stripe Connect checkout: we collect from parents, keep the fee, pay the camp.~~ Dropped
  for 2027 (5 November 2026): no booking fee. Parents pay camps directly.
- Watch the numbers weekly: alert sign-ups, spot requests, confirmations, camps updating
  their own listings.

### Phase 5: First summer (Apr to Aug)

- The check-in after each camp week: two taps and one line.
- Tips shown on listings, in aggregate.
- First "parents like you" recommendations built from the summer's data, ready for 2028
  planning.

## Pricing workstream

*Added 5 November 2026, after Andrew's decisions that day: no booking fee in 2027, and the paid
check never counts in ranking. The model is in `PRODUCT.md`; the prices, the market figures and
the unit economics are in the [pricing doc](https://claude.ai/code/artifact/f99a2de8-7b5e-4b36-ae72-5e971fe58c83); the steps before billing come from
["Bunkcheck: before we bill anyone"](https://claude.ai/artifact/HiVgJiRY7qbFEUoaqTcdmz). Every price below is a proposal under test.*

### Before we bill anyone

No camp or parent is charged until steps 1 to 6 are done. Owners as in the "before we bill
anyone" doc.

| # | Step | Owner | Done when |
|---|---|---|---|
| 1 | Counsel reviews the new wording for paid inquiries: trust rules 2, 5 and 6, the privacy policy, the terms, the Activity API terms, and the three questions for counsel | Andrew approves the drafts, then chooses counsel; counsel reviews | Counsel has signed off, and the new wording is merged |
| 2 | Payments design doc: provider, monthly invoices to camps, card on file, refunds, failed payments, sales tax | A session drafts; Andrew approves; an accountant answers the tax question | One page in `docs/` a session could build from without guessing |
| 3 | The camp's paying journey and its screens: opt in, the verified check, the badge, the monthly cap, the inquiry list, disputing an inquiry, cancelling | A session | Every step has a screen, a failure path and an email |
| 4 | A one-page camp agreement: what counts as a delivered inquiry, a dispute window, cancel any time, no long contract | Counsel, from a session's draft | Camps accept it when they opt in |
| 5 | Billing tables in a new migration, after 2 and 3. The paid check is stored in its own table, never in `camps.verification_status`, so ranking can't read it | A session | Migration and tests in, family export updated, and `tests/test_ranking_rules.py` still passes untouched |
| 6 | A rotation plan for `KIT_ENCRYPTION_KEY` | A session | Kits can be re-encrypted under a new key without loss, tested |

Done already: the ranking rules are public at `/ranking`, with a test that a camp's rank
doesn't change when it pays (5 November 2026).

### The six price tests

From the pricing doc, November 2026 to April 2027, in this order. Providence has too few camps
for clean statistics, so read each one for direction and confirm in Boston. Two rules for every
test: tell camps the price ranges we are testing, and never test anything that touches rank or
family data.

| # | Test | When | Waits on |
|---|---|---|---|
| 1 | Verified profile at $99, $199 or $299, each camp assigned a price at random | November to December 2026 | Phase 2's 150 camps, live and hand-checked. Taking the money waits on steps 1 to 6 above |
| 2 | The pitch: "here is what families near you asked for" against "get verified" | November to December 2026, alongside test 1 | The same camps as test 1, and a demand count per camp from the `/demand` reports |
| 3 | Inquiries at $10 each against a flat $149 a season | February to April 2027 | The inquiry tool merged (`claude/inquiry-tool`), camps opted in, and steps 1 to 6 |
| 4 | Registration Day Pass for parents at $19 or $39, a real charge on our site | January to February 2027 | Families with a saved summer plan, the payments design (step 2), and counsel on fee disclosures to parents (step 1) |
| 5 | A priced Activity API proposal to one family-assistant company: free up to a monthly limit, then a monthly fee | By March 2027 | Andrew picks the company; a session writes the proposal and the plan terms. No billing code needed until it is signed |
| 6 | Inquiries counted by channel: our site, ChatGPT, Claude, partner apps | February to April 2027 | The inquiry tool live in the MCP server and the Activity API, logging the channel; counsel's review of the inquiry flow (step 1) |

Done when: by May 2027 we know the verified price for Boston, whether camps prefer per-inquiry or
flat, whether parents pay for the pass, and whether one assistant company will pay for the API.

## Budget

Cheap until it works.

| Item | Rough monthly cost |
|---|---|
| Hosting (Supabase, Railway, Vercel) | $50 to $100 |
| Claude API for the listing tool and the question box | $50 to $200, scales with use |
| Text messages (Twilio) and email (Resend) | $20 to $50 |
| Domain, handles, trademark filing | One-off, a few hundred plus the filing fee |
| Designer for the identity | One-off, if used |
| Privacy lawyer, fixed-fee review | One-off, get a quote |
| Stripe | A cut of each payment, nothing up front |

## Risks and what we do about them

| Risk | Response |
|---|---|
| Camp owners do not reply | Their listing is built before we ask anything of them; the ask is one reply |
| The listing tool is wrong too often | Hand-check every camp in year one; the tool saves time, it does not replace review |
| Parents sign up for alerts but do not book | Alerts still prove demand to camps; booking is Phase 4, not the only measure |
| A children's privacy problem | Parents only, minimal data, counsel review before scale, trust rules published |
| Andrew's time goes to Small Street and PromptBridge | Phase 1 is mostly my work; the calls are the one thing only Andrew can do, so book them first |
| ActivityHero or Sawyer moves on New England | Depth in one region and the parent intelligence loop are what they do not have |

## The next two weeks

1. Andrew answers the five decisions above.
2. Andrew books the first camp owner and parent conversations.
3. Andrew starts the naming brief.
4. I start Phase 1: migrations, fixes, tests, the new tables, and the listing tool against
   10 real Rhode Island camp websites.
5. I draft the positioning page and the camp owner outreach scripts for Andrew to edit.
