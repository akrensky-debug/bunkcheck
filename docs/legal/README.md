# Launch legal list

**Draft for counsel.** Nothing in this folder is legal advice. Sessions draft; counsel decides.
Where a law is named, it is a question for counsel, not a conclusion.

List set 13 November 2026. Keep the status column current: change it in the same PR as the work.

The company is written as **[Company]** in every draft until item 1 is settled. The live site
names Invisible Industries (`frontend/lib/site.ts`); the trademark checklist on
`claude/bunkcheck-trademark-uspto-j41hrz` files under PromptBridge LLC.

## Status key

| Status | Means |
| --- | --- |
| Not started | Nobody has picked it up |
| Drafting | A session is writing the first draft |
| With counsel | A draft exists and is waiting for a lawyer |
| Open question | Blocked on a decision Andrew or counsel has to make |
| Done | Signed, filed or shipped, with the date |

## Gate 1: before public launch

| # | Item | Owner | Status | Where |
| --- | --- | --- | --- | --- |
| 1 | Which legal entity runs Bunkcheck: form Invisible Industries (name clearance open; Invisible Technologies is close), or PromptBridge LLC for now | Andrew with his own lawyer | Open question | |
| 2 | Founder paperwork: IP assignment, company-owned accounts, 83(b) | Andrew's lawyer | Not started | `docs/decisions/company.md` rules 9 to 12 |
| 3 | Trademark BUNKCHECK: clearance and an intent-to-use filing, Classes 41 and 42 | Andrew files; a trademark lawyer checks | Drafting | `claude/bunkcheck-trademark-uspto-j41hrz` |
| 4 | Terms of service: governing law, liability cap, disputes, AI disclaimer, paid camps and ranking | Counsel | Drafting | `frontend/app/terms/page.tsx` |
| 5 | Privacy policy: questions sent to camps, how Bunkcheck makes money, Stripe, state notices, retention | Counsel | Drafting | `frontend/app/privacy/page.tsx`; retention facts in [retention.md](retention.md) |
| 6 | ChatGPT and Claude listing rules | A session checks; Andrew submits | Drafting | `docs/assistant-apps-launch-checklist.md` |
| 7 | Public ranking rules page | The PRODUCT.md session | Drafting | |
| 8 | CAN-SPAM: an unsubscribe link and a postal address in every email | A session | Not started | |
| 9 | Accessibility, WCAG 2.1 AA | A session, then an outside audit | Not started | |

## Gate 2: before family data at scale

| # | Item | Owner | Status | Where |
| --- | --- | --- | --- | --- |
| 10 | Engage privacy counsel | Andrew | Not started | |
| 11 | A COPPA position memo, adopting the 2025 rule's practices | Counsel | Not started | |
| 12 | State privacy laws: Rhode Island, Connecticut (including consumer health data and minors), Massachusetts. The info kit holds allergy and medical notes | Counsel | Not started | |
| 13 | Processor agreements: Supabase, Railway, Vercel, Anthropic, Resend, Stripe | Andrew collects; counsel checks | Not started | Vendor rows in [retention.md](retention.md) |
| 14 | A written security program and breach plan, including kit key rotation | A session drafts | With counsel | [security-and-breach.md](security-and-breach.md) |
| 15 | One retention schedule | A session drafts | With counsel | [retention.md](retention.md) |
| 16 | A camp data sourcing memo, and a license clause in the camp agreement | Counsel | Drafting | License clause in [camp-agreement.md](camp-agreement.md) section 9 |

## Gate 3: before any camp is billed

| # | Item | Owner | Status | Where |
| --- | --- | --- | --- | --- |
| 17 | Is a paid inquiry a "sale" of personal information when the parent chose to add her contact details? | Counsel | Open question | |
| 18 | Camp agreement | A session drafts; counsel finishes | With counsel | [camp-agreement.md](camp-agreement.md) |
| 19 | Activity API partner terms | A session drafts; counsel finishes | With counsel | [api-partner-terms.md](api-partner-terms.md) |
| 20 | Sales tax on verification and inquiry fees | An accountant | Not started | |
| 21 | Price disclosures for the parent pass | A session | Not started | |
| 22 | Insurance: tech errors and omissions with cyber cover, plus general liability | Andrew through a broker | Not started | The incident plan in [security-and-breach.md](security-and-breach.md) names the policy once bought |

## Later

- The FTC review rule for parent check-ins (summer 2027).
- Booking money and Stripe Connect (2028).
- Terms for data marketplaces and x402.

## Settled business terms the drafts rely on

- No booking fee in 2027.
- Revenue: the verified check ($199 a season, proposed) and $10 per delivered inquiry.
- The paid check never counts in ranking.
- Inquiry wording drafts: "Bunkcheck: before we bill anyone" (https://claude.ai/artifact/HiVgJiRY7qbFEUoaqTcdmz).
- Payments design: https://claude.ai/artifact/QTUXBbMsEdGJbVUagX1sBD.
- How inquiries work in code: `docs/inquiries.md` on `claude/inquiry-tool` (not merged yet).
