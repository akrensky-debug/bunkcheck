# Bunkcheck: Product

*The one current product document. Rewritten 5 November 2026 from the 28 September draft. The
product is Bunkcheck; the repository and older docs keep the working name CampFinder.*

## Mission

**Unlock the collective intelligence of parents to make summer camps easier.**

Parenting is hard. What parents know about camps sits in Facebook threads, at school pickup,
and with the friend who has done three summers at the sailing camp. It is valuable, but hard to
find, easily lost, and only reachable if you know the right people. Bunkcheck collects it,
organizes it, and makes it useful to every parent.

**Camps are the wedge.** Parents plan camps every year, the decisions matter, and each booking
teaches us something real. Over time the same trust and the same family profile can extend to
after-school activities, lessons and sports. That comes later. For now we do only camps.

## Where we start

New England parents, beginning with Providence and nearby Rhode Island and Massachusetts. A
marketplace wins by having most of the camps in one area, so we go deep in one region before we
go wide.

## Two customers

### Parents

What they struggle with:

1. **Covering the whole summer.** Ten weeks, often more than one kid, before- and after-care,
   a budget, and work schedules.
2. **Missing registration day.** Popular camps fill within hours of opening.
3. **Trust and details.** Current prices, dates, what is included, swim supervision,
   allergies, special needs.
4. **Knowing what other parents know.** Is it good for a shy kid? Does the bus run late?

### Low-tech camp owners

Town recreation programs, farm camps, sailing clubs, church day camps, coaches running a sports
week. They run on a PDF brochure, a Google Form, Venmo or checks, a waitlist in Excel, and a
website last updated years ago. CampMinder and CampBrain cost too much and are too complicated
for them.

What they want: fill their spots, spend less time on paperwork, and learn no new software.

## The model: camps pay for trust, parents plan free

*Decided by Andrew on 5 November 2026. This replaces the booking-fee model of 28 September.
Prices are proposals we are still testing; the reasoning and the market figures behind them are
in the [pricing doc](https://claude.ai/code/artifact/f99a2de8-7b5e-4b36-ae72-5e971fe58c83).*

Parents use Bunkcheck to find, compare and plan the whole summer, and then register with each
camp directly, on the camp's own system. We help on registration day; the camp takes the
money. In the 2027 season we take no booking fee.

**Where the money comes from in 2027**

| Who pays | What for | Proposed price |
|---|---|---|
| Camp | **Verified profile.** We check the camp's facts (sessions, prices, ages, aftercare, policies) against the camp's own records, and the badge shows the date we checked. | $199 a season; $99 for the first 25 founding camps in each metro |
| Camp, if it opts in | **Delivered inquiries.** A question or info kit package a parent chose to send the camp, from our site or from any assistant that uses Bunkcheck. Camps set a monthly cap. A camp that doesn't opt in still gets the parent's message. | $10 per delivered inquiry |
| Assistants that send us families | **Activity API, free tier,** with attribution | Free |
| Family-assistant companies | **Activity API, monthly plan** for steady volume | Monthly, in the range of Google, Foursquare and Yelp place data |
| Any agent, no account | **Activity API, pay per request** through x402 | About a cent a call |
| Parent | **Registration Day Pass**, as a test only: alerts the hour registration opens, a form checklist per camp, and her info kit package ready to send | $19 or $39 |

Planning is free for parents: search, compare, the summer plan, the family calendar, the info
kit and the ChatGPT and Claude apps. Claiming and updating a camp listing is free for camps.

**The ranking rule.** The paid check never counts in ranking. Facts the owner confirms for free
may count. A camp's rank is the same whether or not it pays. The rules are public at
`/ranking` (`frontend/app/ranking/page.tsx`), and `tests/test_ranking_rules.py` ranks the same
camps with and without billing and fails if the order or any score moves.

**Booking fees** are revisited in 2028, through the registration platforms (Pike13, DaySmart),
once the ranking rules have been public for a season. See `docs/booking-strategy.md`.

### Out of scope for 2027

- Booking fees or commissions, from camps or from parents.
- Featured or sponsored placement, and ads of any kind.
- Paid parent subscriptions. The Registration Day Pass is a test, not a plan.
- Selling data, about families or anyone else.
- Pay per crawl on our public pages. They exist so AI search cites us.

## The product

### For camps

1. **Setup with no work.** The owner emails or texts their brochure PDF or a website link. AI
   pulls out the sessions, dates, prices and ages and builds the listing. The owner replies
   "looks good."
2. **Updates by text or email.** "Week 3 is full." "Added a July 21 session." The listing
   changes. No login, no dashboard.
3. **Inquiries.** A question a parent chose to send arrives by email, with an info kit
   package if she attached one.
4. **Parent feedback.** Honest, grouped feedback they have never had before.

Because owners change their listings as part of running their camp, the data stays current as a
side effect. That solves the data problem a plain search site never solves.

### For parents

1. **Search and compare**, with current details and a clear date on every fact.
2. **Registration alerts.** "Tell me when registration opens." Easy to sign up for, and each
   alert shows camps there is demand.
3. **Plan the summer.** Week by week, across kids, with gaps and total cost shown.
4. **Register.** Registration day help and tracked registrations. The parent registers on the
   camp's own system; we don't take payment.
5. **The family profile and info kit.** Kids, ages and interests in the profile; medical,
   allergy and pickup details in the encrypted info kit, filled in once and shared only by the
   parent.
6. **Ask the AI.** "Which camps near Cranston handle food allergies well?" The answer draws on
   what camps confirm and what parents report, with sources shown. It works on our site and
   inside Claude and ChatGPT through an MCP server.

### The collective intelligence loop

1. **Check-ins after each week, not long reviews.** Two taps: Did your kid love it? Would you
   go back? One thing other parents should know?
2. **Tips parents trade.** Registration opens at 9am and fills by 9:40. The first-week lunch
   situation.
3. **Parents like you.** Families whose 9-year-old loved robotics week also chose these.
4. **Every summer adds more.** What kids actually did and how it went, year after year, is
   the data nobody else has.

## Our data in a world of agent data markets

*Added 13 October 2026, after searching Firecrawl's Alexandria catalogue: a marketplace of
data sources that AI agents call and pay for per call.*

**What we found.** Alexandria has 27 categories with sources for restaurant tables (Resy),
salon appointments (Fresha), fitness classes (ClassPass), pet sitters (Rover), campgrounds
(Campspot, Hipcamp, Recreation.gov) and tickets. It has nothing for kids' camps: no sessions,
ages, dates, prices or spots. The closest are business listings (maps, OpenStreetMap, BBB),
which give a camp's name, address and phone, never what parents compare on.

**What it tells us.**

1. **The gap is real.** Nobody has made kids' camps readable by agents. That backs the
   1 October reordering in `ROADMAP.md`: a directory is worth little, because any agent can
   read a camp's website.
2. **The valuable sources sell availability, not listings.** Resy says booked out or closed;
   Recreation.gov says which nights are open. Our version is spots left and the date
   registration opens. That is the owner loop: confirmation, updates by email, registration
   alerts.
3. **Anything on a public page becomes a commodity.** Most of these sources read a site's own
   web pages or API without the site's involvement. If someone lists ActivityHero, Sawyer,
   Jumbula or CampMinder, camp listings are available to every agent overnight. Owner-confirmed
   facts and spots left are not on any public page, so they cannot be copied that way. The
   same is true of our own public data, so the Activity API needs terms of use and rate limits.
4. **It is another way to reach parents' agents.** Next to our Claude and ChatGPT apps, a data
   marketplace is a channel. Once most Providence listings are confirmed by their owners, we
   could list our Activity API there as the first-party camp source: every fact with its
   source, its date and whether the owner confirmed it. Public camp facts only, as on the MCP
   server.

**What we do about it.**

- **Keep building the owner loop first.** Confirmation, updates by email and spots left are
  the part nobody else can offer. Nothing here changes the order of work.
- **Do not build the product on bought data.** Camp facts come from the owner and the camp's
  own brochure or website, as now.
- **Use business-listing sources only to find camps to recruit.** A maps or OpenStreetMap
  search around Providence can list camp operators we have missed, as leads for the 150-camp
  load. The owner still sends the brochure. About 5 credits per call; tell Andrew the cost.
- **No family data to a data market.** Never send a home address or anything about a family
  to an outside source, for drive times or anything else. Skip any source that gets past a
  site's bot filter (bbb-org says it clears Cloudflare's challenge), for the same reason our
  fetcher takes a refusal as the answer.
- **Check the catalogue each quarter.** A source for a camp registration platform appearing
  is the signal that public camp listings have become a commodity. Searching is free.

## Trust rules

Trust is what makes this hard to copy. These rules come before any code that touches family
data.

1. **Parents own their family's data.** They can see it, export it and delete it at any time.
2. **We never sell data, never show ads, and never train shared models on identifiable
   children's data.**
3. **We collect only what the product needs**, and say why at the moment we ask.
4. **Parents share what they learned, never who they are.** What parents contribute is shown
   only in aggregate and without identifying details.
5. **Recommendations are never for sale.** Any paid placement is clearly labelled and kept
   apart from recommendations.
6. **Security matches the sensitivity.** Encryption, access logs, and medical and allergy
   details kept apart and shared only with camps the parent has booked.
7. **Parents use the product, not children.** No accounts for children. A privacy lawyer
   reviews our approach (COPPA and state children's privacy laws) before we collect family
   data at scale.
8. **We promise help, not outcomes.** "Help your kid find what they love, and make the
   logistics disappear", not predictions about a child's future.

*New wording for rules 2, 5 and 6, covering paid verification and inquiries, is drafted in
["Bunkcheck: before we bill anyone"](https://claude.ai/artifact/HiVgJiRY7qbFEUoaqTcdmz) and waits on counsel. The rules above stay as
they are until counsel signs off.*


## The plan

The order of work, with dates, lives in `docs/ROADMAP.md`. The steps before we bill anyone, and
the six price tests, are in its pricing workstream.

## Measures of success

| Measure | Why it matters |
|---|---|
| Camps live, and share confirmed by owners | Supply, and whether the data can be trusted |
| Share of listings updated in the last 30 days | Whether data stays current as a side effect |
| Parents signed up for registration alerts | Early demand, and proof to show camps |
| Inquiries delivered, by channel (our site, ChatGPT, Claude, partner apps) | Whether camps get value, and where planning happens |
| Camps that buy the verified profile | Whether the trust layer pays for itself |
| Check-in response rate | Whether the collective intelligence loop will run |

## Decisions made

- Start in New England, Providence first.
- Camps are the wedge. Build for parents and camp owners together.
- Aim at low-tech camp owners: no new software for them to learn.
- The trust rules above.
- Owner-confirmed facts and spots left are what we sell to agents; we do not build on bought
  listing data (13 October 2026, see "Our data in a world of agent data markets").
- The name is Bunkcheck (13 October 2026). The repository and package keep CampFinder.
- No booking fee in 2027. Camps pay for the verified profile and for delivered inquiries;
  planning is free for parents; the Activity API has three tiers (5 November 2026).
- The paid check never counts in ranking. Facts the owner confirms for free may count
  (5 November 2026).

## Open questions

1. **Who pays the fee?** Answered 5 November 2026: no booking fee in 2027. Camps pay for the
   verified profile and for delivered inquiries; parents plan free. The prices are being tested
   (see `docs/ROADMAP.md`). Booking fees come back as a question in 2028, through the
   registration platforms.
2. **Take payment from day one, or start with "request a spot"?** Settled by question 1 for
   2027: parents pay camps directly, and we take no payment for bookings.
3. **The cart and fill-the-forms-once: both in the first version, or one later?**
4. **Would parents pay** for a family plan, which puts our interests on the parent's side? The
   Registration Day Pass test (January to February 2027) gives the first answer.
5. **Which camp owners and parents can we talk to this month?** Five to ten of each.
6. **Where do New England parents look for camps today?** Facebook groups, school
   newsletters, local roundups, word of mouth. Those places are how we reach both sides.
7. **Competition.** ActivityHero runs a camp booking marketplace with fees, strongest in
   California. How present are they in New England? Also check Sawyer, Jumbula and local
   directories.
8. **Time.** How many hours a week can go to this next to Small Street and PromptBridge?
9. **Privacy counsel.** Who reviews the trust rules, the new wording for paid inquiries and our
   data handling, and when? This now blocks billing.
10. **List our camp data on agent data markets?** Once enough owners have confirmed, publish
    the Activity API as the first-party camp source on Firecrawl's Alexandria or similar. The
    x402 tier makes this a paid listing. Not before Phase 2 is done.
