# Bunkcheck payments design

Draft, 13 November 2026. For Andrew to approve, then for a session to build from. Becomes `docs/payments.md` once approved.

**Bottom line.**
- **Provider.** Bunkcheck bills camps through Stripe for our own service: the verified check, and inquiries we deliver. We sell our own service, so camps pay us directly. No Stripe Connect, and no camp's money passes through us.
- **How camps pay.** They pay with a card or bank account saved through Stripe's hosted pages, so card numbers never touch our servers.
- **When they pay.** The verified check is paid up front, once a season. Inquiries are billed monthly in arrears from our own records.
- **The rules hold in code.** Billing never changes rank, never holds back a family's question, and never sends Stripe anything about a family.
- **Not built yet.** Activity API plans and x402 come later. The parent pass is built only if price test 4 runs.
- **Before go-live.** Billing stays off (`BILLING_MODE=off`) until counsel signs off on the wording and the camp agreement.

## What we charge, who pays, how and when

| Product | Who pays | Price (proposed, being tested) | How it's charged | When |
| --- | --- | --- | --- | --- |
| Verified check | Camp | $199 a season; $99 for the first 25 founding camps per metro; test arms $99, $199, $299 | One Stripe invoice per season, paid before we start the check | When the camp opts in, mostly November to February |
| Delivered inquiries | Camps that opt in | $10 each, up to the camp's monthly cap | One invoice on the 1st of each month for the previous month, built from our own billable rows, charged to the saved card or bank account | Monthly |
| Registration Day Pass | Parent | $19 or $39 (test 4 only) | Stripe Checkout, one payment, on bunkcheck.ai only. Never inside ChatGPT or Claude, which don't allow it | January to February |
| Activity API plan | Family-assistant company | Not set | Stripe subscription, monthly | Later |
| Pay per request (x402) | Agents with no contract | About $0.01 a call | Not in this build | Later |
| Booking fee | Nobody | None in 2027 | Not applicable | Not applicable |

The season runs 1 November to 31 August. A verified check covers one season.

Why the verified check is invoiced and not a subscription: it's seasonal, and a subscription that renews on its own would surprise a camp in November. We email in October and the camp opts in again.

Why we build inquiry invoices ourselves instead of using Stripe's metered billing: our database decides what's billable (the monthly cap, one per family per camp every 7 days, credits for disputes). Building the invoice from those rows keeps one source of truth, and every line traces to an inquiry.

## How a camp pays

1. **Opt in.** On the camp's inquiry page, the owner picks "verified check", "paid inquiries" or both, sees the price and the camp agreement, and goes to Stripe Checkout in setup mode to save a card or bank account. We store the Stripe customer id. The price shown is locked for the season.
2. **The verified check.** We create the season's invoice at opt-in, due in 14 days. When it's paid, the check is queued. If we can't finish the check within 30 days of payment, because the camp doesn't confirm its facts, we refund in full. The badge shows the date of the check and lasts until 31 August.
3. **Inquiries.** Delivery works as built on `claude/inquiry-tool`: billable is set at delivery, the cap is applied, and nothing is ever held back. We email the camp at 80% of its cap and again when it reaches the cap.
4. **The monthly invoice.** On the 1st at 6am Eastern, a job builds one invoice per camp for the previous month's billable inquiries, minus credits. It's charged automatically, and the camp gets Stripe's receipt and a link to its invoices in the Stripe customer portal. Running the job twice for the same month makes one invoice, never two.
5. **Disputes.** A camp can flag an inquiry within 14 days of delivery as spam, a duplicate, not a real family, or meant for another camp. The first three flags a month are credited automatically. Anything beyond that, a person reviews. Credits appear on the next invoice.
6. **Failed payments.** Stripe retries and emails the camp. If an invoice is still unpaid 21 days after it was due:
   - The account is marked past due.
   - Inquiries keep being delivered, but they stop being billable, with the reason "account past due".
   - The camp's opt-in is paused until it pays.
   - Nothing about a camp's payment status is shown to families.
7. **Cancelling.** A camp can switch off paid inquiries at any time on its page. Inquiries delivered after that are free. The current month's billable inquiries are still invoiced. The verified check isn't refunded once it's done.
8. **Chargebacks.** We answer with the delivery log for each inquiry on the invoice. A camp with a chargeback is paused until it's resolved.

## Rules the money never breaks

- **Ranking.** Ranking code never reads a billing table or a billable flag, and a test proves a camp's rank is the same whether or not it pays. That test is being added in the PRODUCT.md and ranking rules session.
- **Families.** Billing never decides whether a family's question is delivered, as `claude/inquiry-tool` already enforces. A camp's billing state is never shown to families.
- **What Stripe sees.** For camps:
  - Stripe gets the camp's business name, its billing email and address, and invoice lines such as "Inquiries delivered, October 2026: 14 at $10".
  - Stripe never gets a parent's question, name or contact details, or an inquiry's text.
  - Inquiry ids appear only in our own camp dashboard.
- **Parent pass.** Stripe Checkout collects the parent's email and card. We keep only the Stripe customer id and payment status. Both go into the family export, and our link is deleted with the family. Stripe keeps its own records as the law requires, and the privacy policy says so.
- **Card data never reaches our servers.** Checkout and the customer portal are hosted by Stripe.
- **We never handle a camp's own registration money.** That's `docs/booking-strategy.md`'s funds rule, and it still holds.

## Data and code

New migration (next free number), every table with row-level security on, and defaults added to `tests/fakes.py`:

| Table | What it holds |
| --- | --- |
| `billing_accounts` | One per paying camp, family or partner: owner type and id, Stripe customer id, billing email, status (active, past due, closed) |
| `price_offers` | The price offered to a camp for a product and season, the test arm, when it was offered and accepted. Locks the price |
| `verified_purchases` | Camp, season, price, Stripe invoice id, paid, check completed, refunded |
| `invoices` | Our copy of each Stripe invoice: account, period, amount, status, hosted link |
| `invoice_lines` | One line per billed item, pointing to the inquiry or purchase. A unique source id means nothing is billed twice |
| `inquiry_disputes` | Inquiry, reason, status, credit, who decided and when |
| `stripe_events` | Each webhook event id once, when received and processed, so a repeated event does nothing |

The existing `inquiries.billable`, `price_cents` and `bill_reason` fields and `camp_inquiry_settings` stay as built.

Code:
- `campfinder/billing/`: the service, a thin Stripe client, and the monthly invoice job, called from `jobs/tick.py`.
- A webhook route at `POST /api/v1/internal/stripe/webhook`. It checks Stripe's signature and handles:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `invoice.marked_uncollectible`
  - `charge.refunded`
  - `charge.dispute.created`
- Settings:
  - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, kept in Railway.
  - `BILLING_MODE`, set to `off` (the default), `test` or `live`, the same pattern as `EMAIL_MODE`.
- Pages built from `components/ui`: billing on the camp's inquiry page, the opt-in screen and the dispute button.

## Fees, tax and open questions

Stripe's published US fees, read 13 November 2026 ([pricing](https://stripe.com/pricing), [Invoicing](https://stripe.com/invoicing/pricing), [Billing](https://stripe.com/billing/pricing), [Tax](https://stripe.com/tax/pricing)):

| Fee | Price | Applies to us |
| --- | --- | --- |
| Card payment | 2.9% plus 30 cents per charge | Every card payment |
| Bank payment (ACH) | 0.8%, capped at $5 | Camps that pay by bank |
| Stripe Invoicing (Starter) | 0.4% per paid invoice | Verified checks and monthly inquiry invoices |
| Stripe Billing | 0.7% of billing volume | Only the Activity API subscription, later. Building inquiry invoices ourselves avoids it |
| Checkout and the customer portal | No extra charge; a custom domain is $10 a month | Opt-in and the parent pass |
| Stripe Tax | 0.5% per transaction where we're registered | Only if the accountant says we must collect tax |
| Dispute | $15 per dispute, plus $15 if we respond | Chargebacks |

What that costs on real bills:

| Bill | By card | By bank |
| --- | --- | --- |
| A $199 verified check | $6.87 (3.5%) | $2.39 (1.2%) |
| A month with 14 inquiries ($140) | $4.92 (3.5%) | $1.68 (1.2%) |

The 3.5% allowance for payment processing in the unit economics holds for cards. Bank payments cost about a third as much, which is the case for accepting them.

Tax: a question for an accountant, not for code. Do Rhode Island, Massachusetts and the other states we have nexus in tax a verification service, or a fee for delivered inquiries? If yes, Stripe Tax can calculate and collect it. If no, we leave it off.

Decided by Andrew on 13 November 2026:
1. The verified check is charged before we do it, and refunded if we can't finish it.
2. Camps have 14 days to dispute an inquiry. The first three flags a month are credited automatically.
3. Camps can pay by bank (ACH) as well as by card.
4. The season runs 1 November to 31 August.
5. The company owns the Stripe account, with Andrew as owner (company rule 9). The company is PromptBridge LLC (decided 13 November 2026).
6. Stripe sends the invoices, with Bunkcheck branding.

## Build order

| # | Step | Done when |
| --- | --- | --- |
| 1 | A Stripe account in PromptBridge LLC's name, in test mode. Keys in Railway, `BILLING_MODE=off` | A test webhook reaches the API and is recorded once |
| 2 | The billing tables: migration, row-level security, fakes, family export for parent passes | Tests pass, and `python -m campfinder.migrate --status` lists it |
| 3 | Camp opt-in with Checkout in setup mode | A test card is saved and shows in the customer portal |
| 4 | The verified check purchase | A paid test invoice marks the purchase paid and queues the check; an unfinished check refunds |
| 5 | The monthly inquiry invoice job | Two runs for the same month make one invoice, and its lines match the billable rows, the cap and the 7-day rule |
| 6 | Disputes and credits | A credited inquiry appears as a credit on the next invoice |
| 7 | Failure paths | A failed test payment marks the account past due; inquiries still deliver, marked not billable with the reason |
| 8 | The parent pass, only if test 4 runs | A test purchase unlocks the pass and appears in the family export |
| 9 | Go live | Counsel has signed off, the camp agreement and privacy policy are updated, and you set `BILLING_MODE=live` |
