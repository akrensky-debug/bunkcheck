# CampFinder Activity API v1

Verified, structured data on kids' programs for family assistants, apps and partners.
Camps in the Northeast US, and year-round classes, lessons, leagues and after-school
programs (a first pilot: swim lessons around Providence, RI) in the same schema.

Schema version: `2026-10-02` (returned as `schema_version` on every response). See
[Versions](#versions) for what changed.

Base URL: `https://<api-host>/api/activity/v1`  ·  Interactive docs: `/docs#/Activity API v1`

## Authentication

Every data endpoint needs a key:

```
Authorization: Bearer cfa_live_...
```

Keys are issued per partner (`python -m campfinder.scripts.create_api_key "Partner" contact@partner.com`).
The default limit is 120 requests per minute; over it you get `429` with `Retry-After`.

## Terms in one paragraph

Show the `attribution` text and link wherever you display CampFinder data. Tell families
when a record is `unverified`. Send families to `url` or `registration_url` to register.
Don't resell the data. Don't send us anything that identifies a family.

## Endpoints

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/programs` | Search programs near a location for a child: `near`, `age`, `kind`, `format`, `category` (repeatable), `max_price_per_week`, `extended_care`, `transportation`, `meals`, `financial_aid`, `accredited`, `include_sessions`, `sort`, `limit`, `offset`. Recurring programs: `day` (repeatable: `TU`, `tuesday`, `weekdays`, `weekends`), `earliest_start`, `latest_end` (`HH:MM`), `max_price_per_class` |
| `GET` | `/programs/{id}` | One program with every session, policies and field-level verification |
| `GET` | `/programs/{id}/sessions` | A program's sessions |
| `GET` | `/sessions` | Open sessions in a date window: `near`, `age`, `category`, `starts_on_or_after`, `ends_on_or_before`, `open_only`, `kind` (omit for camps and class terms together) |
| `GET` | `/sessions/{id}.ics` | Calendar file for one session. No key needed, so families can add it directly. A recurring class is one repeating event (`RRULE`) that skips no-class dates (`EXDATE`) |
| `POST` | `/demand` | Report what a family looked for, especially when nothing fit. Anonymous; contact details are rejected |
| `GET` | `/schema` | JSON Schema for programs, sessions and demand signals. No key needed |
| `POST` | `/inquiries` | Prepare a parent's question to a camp. Returns a preview, a `confirm_url` for the parent and a read token. Nothing is sent until the parent confirms. See [Inquiries](#inquiries) |
| `GET` | `/inquiries/{id}` | Status and the camp's answers. Header `X-Inquiry-Token` |
| `POST` | `/inquiries/{id}/confirm` | Confirm for the parent. Only for keys CampFinder has approved; everyone else sends the parent to `confirm_url` |

## Example

```bash
curl -G https://<api-host>/api/activity/v1/sessions \
  -H "Authorization: Bearer $CAMPFINDER_KEY" \
  --data-urlencode "near=Providence, RI" \
  -d age=8 -d category=STEM \
  -d starts_on_or_after=2027-07-06 -d ends_on_or_before=2027-07-10
```

Each result pairs a `session` (dates, price, availability, `spots_left` with `spots_updated_at`
when the camp or our team has told us, `calendar_url`) with its
`program` (provider, location, ages, price, logistics, `verification`, `registration_url`).

## Camps and year-round programs

`kind` is `camp`, `class`, `lesson`, `league`, `after_school` or `event`. Both come back
from `/programs` together, ranked on one scale, unless `kind` narrows them. Filters that
only make sense for one apply only to it: `format`, logistics and `max_price_per_week` to
camps; `day`, `earliest_start`, `latest_end` and `max_price_per_class` to recurring programs.

For a camp, a `session` is a dated block of days. For a recurring program it is an
**offering**: one term of one class at one time, with these extra fields:

```json
{
  "term": "Fall Session 1",
  "skill_level": "Stage 2",
  "ages": {"min": 4, "max": 6},
  "schedule": {
    "days_of_week": ["TU"],
    "start_time": "16:00", "end_time": "16:30", "timezone": "America/New_York",
    "rrule": "FREQ=WEEKLY;BYDAY=TU",
    "exdates": ["2026-11-10"],
    "meeting_count": 8, "next_meeting": "2026-10-06",
    "summary": "Tuesdays 4–4:30pm"
  },
  "prices": [
    {"type": "full_term", "amount": 120, "audience": "member", "covers": "8 classes"},
    {"type": "full_term", "amount": 180, "audience": "non-member"}
  ],
  "enrollment": {"opens": "2026-08-15", "closes": "2026-09-07", "status": "closed"},
  "drop_in_allowed": false
}
```

Price `type` is one of `full_term`, `per_class`, `drop_in`, `trial`, `registration_fee`,
`membership`, `monthly`. The program's `price.per_class` is the lowest single-class price,
stated or computed as full term ÷ class count; `price.options` lists program-wide prices
(memberships, registration fees). Programs also carry `skill_levels`, `trial_available`,
`trial_notes` and `membership_required`. `ages`/`location` on an offering are set only
when they differ from the program's. Dates may be null for an ongoing program with no
published term; camp sessions always have dates.

## Trust fields

`verification.status` is one of `team_verified`, `provider_verified`, `camp_verified`,
`claimed`, `unverified`. Year-round programs from the pilot are all `unverified`: each fact
was read from the provider's own site on a recorded date, and nothing is guessed, so a
fact that wasn't published is listed in `fields_missing` (e.g. `schedule.start_time`).
`fields_verified`, `fields_unverified` and `fields_missing` say which facts are confirmed,
so an assistant can say "price confirmed by the camp; refund policy not listed".

Demand signals (`POST /demand`) also accept `days_of_week`, `earliest_start` and
`latest_end`, so "nothing on Saturday mornings" is counted.

## Inquiries

A parent's question to a camp, sent with their yes. The camp answers through CampFinder and you
read the answer. Full rules: `docs/inquiries.md`.

```
POST /api/activity/v1/inquiries
{
  "program_id": "…",                      # a camp's program id
  "session_id": "…",                      # optional, one of its sessions
  "question": "Does week 3 still have spots for a 9 year old?",   # 10 to 1,000 characters
  "kit_share_token": "…",                 # optional: a package the parent made on CampFinder
  "user_ref": "your-opaque-parent-id"     # optional: hashed, only for per-family limits
}
→ 201 {"id": "…", "token": "…", "status": "pending",
       "preview": {"to": "Riverside Soccer", "subject": "…", "text": "…", "kit_included": false, "contact_included": false},
       "confirm_url": "https://…/inquiries/…", "expires_at": "…"}
```

- **Show the parent the preview and send them to `confirm_url`.** It goes to the camp only when
  they press Send there, where they also choose whether to share their name, email or phone with
  the camp. Unconfirmed inquiries expire after 72 hours.
- **No names or contact details in the question.** A question with an email address or phone
  number is rejected (`422`). The info kit goes only as a package token, never its contents.
- **Read the answer** with `GET /inquiries/{id}` and `X-Inquiry-Token: <token>`. `status` is
  `pending`, `confirmed`, `delivered`, `expired` or `cancelled`; `replies` holds the camp's
  answers. You never get the parent's contact details or family back, and only the key that
  created an inquiry can read it.
- **Attribution.** Inquiries from your key are shown to the camp as "Partner app: <your key's
  name>". The channel comes from the key; you can't set it.
- **Limits.** Your key's rate limit applies; a family can send 5 a day; the same question to the
  same camp is refused for a day (`409`); a camp that hasn't set up questions through CampFinder
  returns `409` with its own contact details.
- **Confirming in your own app** (`POST /inquiries/{id}/confirm` with `{"parent_agreed": true}`)
  is off for every key until CampFinder approves it (`403` otherwise).

## Also available over MCP

The same search, sessions, details, compare and planning tools are served to MCP clients
(Claude, ChatGPT apps, other agents) at `/mcp`, plus `find_activities`,
`get_activity_details` and `check_schedule_fit` for weekly classes, and `send_inquiry` and
`check_inquiry` for questions to camps.

## Versions

All changes within v1 are additive; nothing is renamed or removed.

| Version | Changes |
| --- | --- |
| `2026-10-01` | Camps and their dated sessions. |
| `2026-10-02` | Year-round programs (`class`, `lesson`, `league`, `after_school`, `event`). Session: `term`, `skill_level`, `ages`, `location`, `schedule`, `prices`, `enrollment`, `drop_in_allowed`; `start_date`/`end_date` nullable for non-camp kinds. Program: `skill_levels`, `trial_available`, `trial_notes`, `membership_required`; `price.per_class`, `price.options`. Verification status `provider_verified`. `/programs` filters `day`, `earliest_start`, `latest_end`, `max_price_per_class`; `/sessions` filter `kind`. Demand: `days_of_week`, `earliest_start`, `latest_end`. |
