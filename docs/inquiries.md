# Inquiries: a parent's question to a camp, from any assistant

*Built 13 October 2026 on `claude/inquiry-tool`. From the pricing plan, section "Built for agents".
Prices are set in the pricing doc, not here.*

A parent's assistant (our own agent, ChatGPT, Claude, or a partner app) sends a camp the parent's
question, and optionally a link to an info kit package they already made. **Nothing reaches the
camp until the parent says yes.** The camp answers by replying to the email or on a web page, and
the assistant reads the answer.

## The flow

1. **Prepare.** The assistant calls `send_inquiry` (MCP and our agent) or `POST /api/activity/v1/inquiries`
   (partners). We store it as `pending` and return:
   - `preview`: exactly what the camp will read, except the camp's private reply link;
   - `confirm_url`: CampFinder's page where the parent says yes (`/inquiries/<token>`);
   - an inquiry id and a **read token** for the answer.
2. **Her yes.** On the confirm page (or the card in our own agent, or "Ask this camp" on a camp
   page) the parent sees the preview, chooses whether to share her name, email or phone with the
   camp, and presses Send. A pending inquiry not confirmed within 72 hours is never sent.
3. **Delivery.** We email the camp's **verified** contact (a `camp_contacts` row with `verified_at`,
   set when the owner confirmed a listing) and set `delivered_at`. A camp with no verified contact
   can't receive inquiries yet; the assistant is told so and given the camp's own website.
   Failed sends retry on the hourly tick, up to 5 times.
4. **Answer.** The camp replies to the email (when inbound mail is set up) or answers at
   `/owners/inquiries/<token>`, which also lists the camp's recent inquiries with their source.
   The assistant reads answers with `check_inquiry` or `GET /inquiries/{id}` and its read token.
   If the parent shared an email address, we also email her the answer.

## Rules, and where they are enforced

All in `campfinder/inquiries/service.py`, not in prompts.

| Rule | How |
| --- | --- |
| Her yes comes first | `create()` only writes `pending`; only `confirm()` (CampFinder page) or `confirm_for_parent()` (approved partner keys) sends |
| The channel is never the caller's | `site` for our agent and camp pages; `chatgpt`, `claude`, `assistant` from the MCP mount (`/chatgpt/mcp`, `/claude/mcp`, `/mcp`); `partner:<key name>` from the API key. Extra fields in the input are ignored |
| No family identity through assistants | The question may not contain an email or phone number. Contact details are added only by the parent on CampFinder. Partner and MCP responses never include contact details or family ids, and neither does the confirm link's page (the link passes through the assistant), which only says whether she shared them |
| Info kit only as a package | The assistant passes a share token (or the share link). We check it is live, not withdrawn, belongs to the family (when known) and, if it names a camp, that camp. The email carries the link; the preview shows field names only. A package withdrawn before delivery is left out. Opens are logged by the share link as before. The kit never reaches a model |
| Billing never holds a family back | Every confirmed inquiry is delivered. `billable` is set on delivery only |
| Billable when | the camp opted in (`camp_inquiry_settings.billing_opted_in`), it was delivered, it's this family's first billable inquiry to this camp in 7 days, and the camp's `monthly_cap` (billable inquiries per calendar month) isn't reached. `bill_reason` says why or why not. A family we can't count (no family, partner `user_ref` or email) is never billed |
| Abuse limits | Partners: the key's Activity API rate limit. Site form and confirm page: 20 per IP per hour. Per family: 5 confirmed a day. Per camp: 40 confirmed a day. Spam checks: length 10 to 1,000, no contact details, at most one link, must read like text, the same question to the same camp from the same asker is refused for a day |
| Store the minimum | The question, the answers, and contact details only if she chose. Tokens are stored hashed, except the kit share token the camp's email needs. `family_key` is a hash used only for the caps |
| Retention | Unconfirmed: expire after 72 hours, deleted 30 days later. Delivered: after 365 days the question, answers, contact, kit link and family link are removed; the date, camp, source and billing fields stay for the camp's records |
| Family data rights | Inquiries tied to a family (from our agent, the camp page with a family, a kit package, or chosen on the confirm page) are in the owner's export (`services/family_export.py`, secrets stripped) and deleted with the family. An inquiry with no family link has no family data in it beyond what she typed and chose to share; it follows the retention rule |
| Nothing moves money | We record `billable` and `price_cents` (`INQUIRY_PRICE_CENTS`, default 1000 from the pricing plan). No charge is made anywhere in this code |

## Counting how often agents return a camp

Every Activity API search (`/programs`, `/sessions`) and every MCP search (`search_camps`,
`find_sessions`, `find_activities`) writes one `result_appearances` row: the channel, the tool or
endpoint, and the program ids returned. Never the query. The camp's inquiry page shows
"AI assistants showed your camp N times in the last 30 days" (`appearances_for`). Our own site
agent is not counted.

## Surfaces

| Surface | Where |
| --- | --- |
| MCP tools `send_inquiry`, `check_inquiry` | `campfinder/agent/inquiry_tools.py`, served at `/mcp`, `/chatgpt/mcp`, `/claude/mcp` and to our agent. `send_inquiry` is annotated not read-only, open-world |
| ChatGPT and Claude card | `campfinder/chatgpt/widget.html` (`ui://campfinder/camps-v4.html`): the preview and a "Review and send on CampFinder" button that opens the confirm page |
| Partner API | `POST /inquiries`, `GET /inquiries/{id}`, `POST /inquiries/{id}/confirm` in `docs/activity-api.md` |
| Site API | `campfinder/routers/inquiries.py` |
| Pages | `frontend/app/inquiries/[token]` (parent), `frontend/app/owners/inquiries/[token]` (camp), `components/inquiries/AskCamp.tsx` on camp pages, the agent's `inquiry` card |

## Settings

| Variable | What |
| --- | --- |
| `INQUIRY_REPLY_DOMAIN` | Set to receive replies by email: inquiry emails get `Reply-To: reply+<token>@<domain>`. Unset, the email asks the camp to answer on the web |
| `INQUIRY_INBOUND_SECRET` | The mail provider posts replies to `POST /api/v1/internal/inquiry-mail` with `X-Inbound-Secret`. A reply is accepted only from one of that camp's `camp_contacts` addresses; quoted text is stripped |
| `INQUIRY_PRICE_CENTS` | Recorded on billable inquiries. Default 1000 |

A camp's billing choice is a `camp_inquiry_settings` row (no row: not opted in). There is no
self-serve opt-in page yet; a person sets it after talking to the camp.

## Open decisions for Andrew

Both are built so either answer works; both default to the stricter answer.

1. **Is a partner app's statement that the parent agreed enough, or must the confirm step always
   run on CampFinder?** Today: always on CampFinder. To allow a partner, set
   `api_clients.may_confirm_for_parent = true` for its key; it can then call
   `POST /inquiries/{id}/confirm` with `parent_agreed: true`. Note: anyone holding the
   `confirm_url` can press Send, and that includes an assistant that can browse. A stronger check
   (sign-in or an emailed code) would be a separate change.
2. **The API terms say partners must never send anything that identifies a family.** Today partners
   can't: the question rejects contact details, and contact can be added only by the parent on
   CampFinder. If the terms gain an exception for contact details the parent chooses to share in
   an inquiry, set `api_clients.may_share_contact = true` for that key; it can then pass `contact`
   when it confirms. The terms text in `docs/activity-api.md` is unchanged until Andrew decides.

Also for Andrew, raised while building:

- **Trust rule 2 and Phase 1.** PRODUCT.md says "we never sell data", and Phase 1 removed lead
  capture because "we don't sell parent contacts to camps". A camp paying per delivered inquiry is
  a different thing (the parent's own question, sent at her request, contact only if she adds it),
  but the trust rules page and privacy policy should say so in plain words before billing is on.
- **Trust rule 6** says medical details go "only with camps the parent has booked". An inquiry can
  carry an existing kit package link before booking. The parent made the package and approves the
  inquiry, but the rule's wording should be updated or the kit option held back until booking.
- **The ChatGPT and Claude directory rules** ask for no health data. The tool's description steers
  away from health questions and the kit stays a link, but a parent can still type one. Worth a
  line in the review notes.
- **CLAUDE.md** says no family data on the MCP server or the Activity API. Inquiries carry the
  parent's question through them by design (never contact details or the kit). CLAUDE.md and
  `docs/decisions/agents.md` rule 5 should say whether this is the agreed exception.
