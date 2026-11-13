# Bunkcheck launch legal list

13 November 2026. A list for counsel, not legal advice. Where a law is named, the question for counsel is whether and how it applies to us.

**Bottom line.** Bunkcheck needs 22 legal items settled, in three gates:
1. Before the public launch: listings live in ChatGPT and Claude, and parents signing up.
2. Before family data at scale.
3. Before any camp is billed.

The first item is decided: on 13 November 2026 Andrew chose PromptBridge LLC (Rhode Island) as the company behind Bunkcheck, for now. Every agreement, the Stripe account, the app listings and the trademark use that name.

## Gate 1: before public launch

| # | Item | What exists | Owner | Done when |
| --- | --- | --- | --- | --- |
| 1 | **Legal entity: decided.** PromptBridge LLC (Rhode Island), for now. The Invisible Industries name is not used | Recorded in `docs/decisions/company.md`; site, app listing and checklist updated on `claude/promptbridge-entity` | Andrew | Done once that branch is merged |
| 2 | **Paperwork for PromptBridge LLC.** Confirm its operating agreement covers Bunkcheck. IP assigned to the company on day one, accounts owned by the company, an 83(b) election filed within 30 days of any grant | Company rules 3, 9, 10 and 12 | Andrew's lawyer | Signed, with Andrew's own copies kept |
| 3 | **Trademark: BUNKCHECK.** Clearance, then an intent-to-use filing in Classes 41 and 42 | A filing checklist on `claude/bunkcheck-trademark-uspto-j41hrz` | Andrew files; a trademark lawyer checks clearance | Filed under the entity from item 1 |
| 4 | **Terms of service for parents.** Set the governing law, the liability cap, how disputes are handled, the disclaimer on AI answers, accuracy of camp information, and paid camps and ranking | A draft at `frontend/app/terms/page.tsx`, marked for counsel | Counsel, working from the draft | Counsel signs off, and the page carries the real entity and date |
| 5 | **Privacy policy.** Add questions sent to camps, how Bunkcheck makes money, Stripe as a processor, state notices, and a retention period for each kind of data | A draft at `frontend/app/privacy/page.tsx`; new wording in "Bunkcheck: before we bill anyone" | Counsel | Signed off, and linked from every page, both assistant listings and every email |
| 6 | **ChatGPT and Claude listing rules.** Privacy and terms links, no ads or paid placement, no money moving in the chat, care with health questions | `docs/assistant-apps-launch-checklist.md` | A session checks; Andrew submits | Both listings approved |
| 7 | **Public ranking rules.** Paid relationships are disclosed, and payment never changes rank | Decided 5 November; the page is being built in the PRODUCT.md session | That session | The page is live and linked from the terms |
| 8 | **Email law (CAN-SPAM).** Registration alerts and camp outreach carry an unsubscribe link and a postal address | Alerts have a stop link; there's no postal address yet | A session | Every email template passes a checklist |
| 9 | **Accessibility.** The site meets WCAG 2.1 AA, the usual target for ADA website claims | The UI kit checks contrast; there's been no full audit | A session, then an outside audit before scale | An audit with no open AA issues |

## Gate 2: before family data at scale

| # | Item | What exists | Owner | Done when |
| --- | --- | --- | --- | --- |
| 10 | **Engage privacy counsel.** Trust rule 7 and open question 10 in PRODUCT.md | Not chosen | Andrew | Engagement letter signed |
| 11 | **Children's data (COPPA).** Confirm our position: the service is for parents, not directed to children, and parents supply the details. Adopt the 2025 rule's practices anyway: a written retention policy and a security program | Stated in the privacy draft and the strategy doc | Counsel | A one-page memo |
| 12 | **State privacy laws.** Which apply at our size, starting with Rhode Island's new law, Connecticut's (including its consumer health data and minors' provisions), and Massachusetts. The info kit holds allergy and medical notes, which some states treat as health data | Not reviewed | Counsel | A memo listing each law, whether it applies, and what we change |
| 13 | **Processor agreements.** Data processing terms with Supabase, Railway, Vercel, Anthropic, Resend and Stripe, including how Anthropic handles chat content | Processors are listed in the privacy draft; agreements not collected | Andrew collects; counsel checks | Each one signed or accepted, and filed |
| 14 | **Written security program and breach plan.** Who does what in an incident, notice duties by state, and the kit key: `KIT_ENCRYPTION_KEY` can't be rotated today without losing every saved kit | Encryption and access logs exist; no written plan | A session drafts; counsel reviews | A written plan, and a tested key rotation |
| 15 | **One retention schedule.** Conversations, family data, inquiries (365 days), logs and anonymous search data | Set per feature; conversations have no limit yet | A session drafts; counsel approves | One table, enforced in code |
| 16 | **Camp data sourcing.** Facts aren't copyrightable, but photos and descriptions are. Our fetcher honors refusals, and the camp agreement should license what camps send us | Fetcher policy in `docs/ingest-test-set.md` | Counsel | A short memo, and a license clause in the camp agreement |

## Gate 3: before any camp is billed

| # | Item | What exists | Owner | Done when |
| --- | --- | --- | --- | --- |
| 17 | **Is a paid inquiry a "sale" of personal information** under the state laws in item 12, when the parent chose to add her contact details? | The question is in "Bunkcheck: before we bill anyone" | Counsel | A written answer, and the wording changed if needed |
| 18 | **Camp agreement.** It covers:<br>- the verified check (paid before, refunded if unfinished)<br>- paid inquiries and the 14-day dispute window<br>- cancelling any time<br>- how the camp may use a parent's details (to answer her, nothing else)<br>- the license to listing content<br>- that the camp is responsible for its own program | Terms set in the payments design | A session drafts; counsel finishes | Camps accept it when they opt in |
| 19 | **Activity API partner terms.** Attribution, no resale, no family data, what a partner promises when it confirms a question for a parent, and suspension | A paragraph in `docs/activity-api.md` | A session drafts; counsel finishes | Signed by the first partner |
| 20 | **Sales tax.** Is a verification service, or a fee for delivered inquiries, taxable in Rhode Island, Massachusetts and the other states we owe tax in? | The question is in the payments design | An accountant | A written answer, and Stripe Tax turned on or off |
| 21 | **Price disclosures for parents.** The Registration Day Pass shows its full price up front, with no hidden fees under FTC and state rules. It's a single payment, so automatic renewal laws don't apply | The pass is a test only | A session; counsel takes a quick look | The checkout shows one total |
| 22 | **Insurance.** Technology errors and omissions with cyber cover, and general liability | None known | Andrew, through a broker | Policies in place before billing |

## Later, not for launch

- **Parent check-ins and reviews (summer 2027).** The FTC's rule on consumer reviews bans fake or bought reviews and hiding bad ones.
- **Booking through camps' systems (2028).** Merchant of record, Stripe Connect and money transmission, as `docs/booking-strategy.md` already notes.
- **Data marketplaces and x402.** Terms for selling per-request access to agents.

## How to work this list

1. Item 1 is settled: PromptBridge LLC. Check that its operating agreement and bank account are ready for Bunkcheck revenue.
2. Send counsel one package: this list, the terms and privacy drafts, "Bunkcheck: before we bill anyone", and the payments design. Ask for a fixed-fee quote on items 4, 5, 11, 12, 17 and 18.
3. A session can draft items 14, 15, 18 and 19 now, so counsel edits instead of writing from scratch.
