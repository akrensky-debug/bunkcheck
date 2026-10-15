# Summer Board

Proposal, 15 October 2026. Not built. Needs Andrew's go before any code, and a call on order
against ROADMAP Phase 2 (listing updates by email).

The Summer Board is a kids × weeks plan that a parent builds by answering a few short
questions. It replaces the summer spreadsheet parents already keep, and it gives the plan and
coverage cards a home: today they vanish when the parent starts a new chat.

## Why

What parents do now (sources at the end):

- They plan in a spreadsheet: a column per kid, a row per week, vacations blacked out, a tab
  per camp with hours, price and registration date. Planning starts in November or December;
  day camp registration runs January to March and good camps fill in minutes or days.
- They decide in this order: first what fits (dates, hours, location, cost), then what the
  kid will like, then whether the camp can be trusted. Location and hours (47%) and cost (46%)
  top what parents call essential.
- One parent, usually the mother, does the research. The other parent often approves. Friends
  attending matters to 73%. Kids get a vote as they get older.
- Planning comes with dread: 67% of working parents say it grows as summer nears, 90% lose
  sleep over it.

What Bunkcheck does today: the assistant can search, compare, build a plan and check coverage
week by week, but only as chat cards. Nothing is saved except calendar events and
registrations. There is no shortlist, and no view a co-parent can look over.

## Principles

1. **The board grows; it never starts empty.** A blank 22-cell grid reads as 22 things not
   done. The board starts as one line per kid and adds weeks once we know the dates.
2. **Show progress, not gaps.** "5 of 11 weeks planned", with open weeks in a neutral tone and
   "Plan this week" on them. The warning color is for real problems only: a camp's hours
   don't cover the workday, a deadline is close.
3. **Constraints before content.** Ask what fits before asking what they'll like. Ask about
   money when prices appear, not at the start.
4. **Nothing is required.** Every question has Back, Skip for now, and Not sure yet. The board
   works with only kids' names and ages.
5. **Headless.** The brief and the board live in the backend. The question cards, the
   assistant and anything later (an email reply) all read and write the same thing through
   one service.
6. **Honest.** Every fact says where it came from: the parent said it, we looked it up, or we
   guessed. No made-up urgency; "filled in 2 days last year" only when we know it.

## The guided questions

One question at a time, above the board. Each answer changes the board at once.

| # | Question | Answer UI | What the board does | Default if skipped |
|---|---|---|---|---|
| 1 | Who's going to camp? | First name and age per kid, "add another" | One line per kid | Needs at least one age to suggest camps; the line reads "Your kid" |
| 2 | Which school? | Chips for the schools we know, "Other", "Not sure" | Weeks appear between the last and first day of school | Guessed: about June 18 to September 1, marked as a guess |
| 3 | Any weeks already sorted? | Tap weeks: Away, Family, Booked camp | Those weeks turn done; "3 of 11 weeks sorted" | All weeks open |
| 4 | Roughly when do you need care? | "Both work about 8 to 6" yes / change; per-parent hours | Weeks where a camp leaves hours uncovered get flagged | 8:00 to 6:00 weekdays, marked as a guess |
| 5 | What's Maya into? | Interest chips per kid | First suggestions in the first open week: three options with price per week | No interest filter |
| 6 | Save your summer | Email sign-in link; then "Send to [partner] to look over" | Board saved; co-parent invited | Board kept for the guest session |

Later questions, asked only when they matter:

| Question | Asked when |
|---|---|
| Weekly budget ceiling | Suggestions first show prices, or the summer total jumps |
| How far will you drive / need transport? | Suggestions span more than about 15 minutes |
| Day camp or sleepaway too? | A kid is 9 or older |
| Anything already booked elsewhere? | January, at the start of registration season |

### Moving around

- **Back** goes to the previous question. **Skip for now** moves on and puts the question in a
  quiet "Finish later" list on the board. **Not sure yet** saves the fact as unknown, uses the
  default (marked as a guess) and brings the question back when it matters, not on the next
  screen.
- Answers become chips in one line above the question, e.g.
  `Maya, 7 · Leo, 10 · Wheeler · 3 weeks sorted · about 8 to 6`. Tapping a chip edits that
  answer in place. The board reflows; later answers are kept.
- No "step 3 of 7". Progress lives on the board.
- Leave at any time. Every answer is saved as given. Coming back: "Welcome back, two quick
  ones left."
- Typed text does the same in chat: "skip", "not sure", "go back", "actually Leo is 9".

### Copy

- Buttons: Back · Skip for now · Not sure yet. Never "Required" or "Next step".
- Headline counts up: "3 of 11 weeks planned". Open week: "Plan this week". Guess: "We
  guessed June 18. Fix".
- Suggestions: "4 camps near you fit Maya's hours this week."

## The board

- **Phone:** one kid at a time, weeks as a vertical list, a switcher for kids. **Wide
  screens:** the full kids × weeks grid.
- A week's state, for each kid:
  - **open**: nothing yet ("Plan this week")
  - **ideas**: up to 3 shortlisted camps
  - **chosen**: one pick, not yet registered
  - **registered** or **waitlisted**: from `family_registrations`
  - **away / family**: covered without a camp
- Each week shows hours fit (does camp plus extended care cover the care hours?) and, once
  chosen, price. The board header shows the summer total, split into paid and still due.
- The board suggests one open week at a time ("Start with July 6"), not every gap at once.
- Shortlist from anywhere: camp cards in chat, `/search`, `/camps/[id]` get "Add to Week of …".
- **Look over** view for the co-parent (existing co-parent role): for each open week, the
  shortlisted options side by side with what's different, and Approve. Approving makes the
  pick "chosen"; it never registers or pays.

## How it's built

Follows "Where code goes" in CLAUDE.md: logic in `campfinder/services/`, routers and agent
tools only call it.

### `campfinder/services/summer_brief.py` (built)

```
get_brief(family_id, today, context) -> Brief      # chips, next_question, finish_later
update_brief(family_id, facts, source) -> profile   # source: said | looked_up | guessed
skip(family_id, field, not_sure=False) -> profile   # "Skip for now" / "Not sure yet"
next_question(profile, today, context) -> Question | None
```

- The brief is `families.profile` (kids, `summer_start`/`summer_end`, `work_schedule`,
  `away`, `weekly_budget`, `needs`) plus `school`, `max_drive_minutes`, `sleepaway`,
  `booked_elsewhere` and one `brief` key: `facts` (field → `{source, at}`), `skipped` and
  `not_sure` (field → when). No new table. Profiles saved before the brief count what they
  already hold as said.
- `next_question` asks the core questions in order, then a "not sure" core question whose
  moment has come, then the later questions whose trigger holds. `context` says what the
  parent is looking at (`suggestions`, `prices`); registration season is January to March.
  Skipped questions never come back on their own; they wait in `finish_later`.
- Skipping or "not sure" on the school or care hours fills a default (June 18 to August 31;
  weekdays 8 to 6) marked as a guess, so the board always has something to show.
- Endpoints (owner and co-parents): `GET /families/{id}/brief`, `PATCH /families/{id}/brief`,
  `POST /families/{id}/brief/{field}/skip`, `POST /families/{id}/brief/{field}/not-sure`.
- The agent's `update_family_profile` saves through `update_brief` and gets the next question
  back; `not_sure_yet` handles "skip" and "not sure" in chat.

### School calendars

- `campfinder/services/school_calendars.py` (built, empty): the 2027 last day and first day for
  each school, its source URL and the date it was checked. A school with only a last day gets
  a guessed end of summer.
- About 15 to start, entered and checked by hand: Providence Public Schools, Cranston, East
  Providence, Pawtucket, Warwick, Barrington, North Providence, Johnston, and the larger
  private and charter schools (Wheeler, Moses Brown, Lincoln, Gordon, Providence Country Day,
  Achievement First, Paul Cuffee). No scraper.
- Unknown school: guess, mark it as a guess, offer "Fix".

### Shortlist and picks

New table, `migrations/0016_plan_picks.sql`:

```
plan_picks (id, family_id, child_name, week_of DATE, camp_id, session_id,
            state TEXT CHECK (state IN ('idea', 'chosen', 'backup')),
            note, added_by, created_at, updated_at)
```

- RLS on, backend only. Add to `services/family_export.py` and give it defaults in
  `tests/fakes.py`.
- Registered and waitlisted come from `family_registrations`; picks are not copied there
  until the parent records a registration.
- `services/summer_board.py` builds the board from the brief, `plan_picks`,
  `family_registrations`, `family_events` and the existing coverage logic.

### Surfaces

- `/` for a family with a brief: the board, with the assistant docked beside it. For a new
  visitor: one line ("Tell us about your kids, or just start here"), the first question, and
  the board growing below it.
- Agent tools: `add_pick`, `remove_pick`, `get_board`. The `plan` and `coverage` cards link to
  the board.
- Arriving from ChatGPT or Claude with `?q=` fills what the query contains and lands on the
  board. The MCP server and Activity API never see the brief or the board (trust rules).
- Built from `components/ui`; any new primitive renders at `/ui`.

## Not now

Spreadsheet paste or import, email or text intake, friends' weeks, "kid picks" mode, a school
calendar scraper, budget and FSA reports. Each can be added later on top of the same service.

## Measures

- **Activation:** a new visitor gets to a board with weeks shown and at least one camp
  shortlisted. Target: over 40% of those who answer question 1, in under 3 minutes.
- Questions answered vs skipped vs "Not sure yet", per question.
- Co-parent "look over" invites sent and opened.
- Return visits in the January registration window.
- At the December soft launch: board-first home vs chat-first home.

## Before code: parent interviews (November)

Ten Providence-area parents, 30 minutes each, mixed: working and not, one kid and several,
public and private school.

1. "Show me how you planned last summer." Ask to see the spreadsheet, notes or texts.
2. "When did you start? What made you start?"
3. "Who else was involved? Who decided?" (partner, kids, friends' parents)
4. "What went wrong?" (sold out, hours, cost, forms)
5. "How did you hear about the camps you picked?"
6. Prototype, half see the growing board, half a filled-in sample board: after 5 seconds,
   "What is this? What would you do first?"
7. Walk the questions on the prototype. Note where they pause, skip or say "not sure".
8. "How did that feel?"

Ship the board if most parents say what it's for at a glance, know what to do first, and
describe it as calming rather than another list.

## Open decisions for Andrew

1. Order: the board before listing updates by email (ROADMAP Phase 2)?
2. Home page: board-first for families with a brief, chat docked beside it (recommended), or
   keep chat-first and link to the board?
3. Interviews in November before building, or build in parallel?

## Sources

- Mott Poll, Summer camps, May 2022 (n=1,020): what parents call essential; only 31% can find
  camps with the features they want. https://mottpoll.org/reports/considering-camp-dont-overlook-health-and-safety
- BGCA / DKC survey, March 2025 (n=1,041): friends 73%, cost the top barrier at 75%, average
  spend $1,263 in 2024. https://www.bgca.org/wp-content/uploads/2025/05/Boys-and-Girls-Clubs-of-America-Summer-Camps-2025-Survey_Executive-Summary.pdf
- Bright Horizons Modern Family Index, April 2026: 90% lose sleep, 67% feel dread.
  https://www.brighthorizons.com/newsroom/archive/2026-modern-family-index-working-parents-summer-break
- Richmond, Hodge and Sibthorp, Family Relations, 2023: one parent, usually the mother,
  drives the decision. https://onlinelibrary.wiley.com/doi/abs/10.1111/fare.12730
- Daminger, American Sociological Review, 2019: cognitive labor (anticipate, identify,
  decide, monitor). https://journals.sagepub.com/doi/10.1177/0003122419859007
- Washington Post, March 2024, and Washingtonian, February 2024: spreadsheets, minutes-long
  sellouts, waitlists. https://www.washingtonpost.com/dc-md-va/2024/03/16/summer-camps-dc/ ·
  https://washingtonian.com/2024/02/08/summer-camp-registration-has-become-an-absurd-race/
- Outside, February 2026: plan by February 1. https://www.outsideonline.com/outdoor-adventure/hiking-and-backpacking/summer-camp-registration/
- Chernev, Böckenholt and Goodman, Journal of Consumer Psychology, 2015: when too many
  options lead to putting the choice off.
- OPRE Report 2025-137: how parents search for care (search, consider, select; not in order).
  https://www.norc.org/content/dam/norc-org/pdf2025/how-parents-search-conceptual-framework-aug25.pdf

Weak spots: no current data on how parents discover camps or how much they use aggregator
sites, and nothing specific to Rhode Island. The interviews are meant to fill that.
