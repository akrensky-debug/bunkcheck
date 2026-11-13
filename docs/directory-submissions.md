# Directory submissions: ready for Andrew to send

Everything to paste into Claude's connector directory, and later the ChatGPT app store. Andrew
submits from his own accounts; nothing here has been sent. Claude's steps were checked against
[Submit a connector to the directory](https://claude.com/docs/connectors/building/submission) on
13 November 2026.

## Before you start

1. **PR #61 is merged and deployed**, so `https://www.bunkcheck.ai/mcp` answers. Check it:
   `python -m campfinder.scripts.check_mcp https://www.bunkcheck.ai/mcp`. Every line must say `ok`.
2. **This PR is merged and deployed**, so the cards say "Offers STEM programs". Then rerun the
   screenshots (below) so the PNGs match production.
3. **Add Bunkcheck to your own Claude** as a custom connector, using
   [bunkcheck.ai/connect](https://www.bunkcheck.ai/connect), and run the five example prompts on
   the web and on your phone. The portal asks you to confirm you've run every tool.

## Claude: the listing

Paste these as they are. Limits are the portal's.

| Field | Value |
| --- | --- |
| Server URL | `https://www.bunkcheck.ai/mcp` |
| Server name (100) | Bunkcheck |
| One-liner (200) | Find and plan kids' summer camps in the Northeast US, with dates, weekly prices, extended care and open weeks. |
| Categories (1 to 5) | Lifestyle, plus Family or Education if the list has them |
| Documentation URL | `https://www.bunkcheck.ai/connect` |
| Privacy policy URL | `https://www.bunkcheck.ai/privacy` |
| Support contact | hello@bunkcheck.ai |
| Icon | `campfinder/static/icon.png` (512 px) |
| Slug | `bunkcheck` (permanent once published) |
| Allowed link URIs | `https://www.bunkcheck.ai` |
| Authentication | None |
| Data handling | Our own API. No personal health data. No sponsored content. |
| Test account | None needed: there is no sign-in |

**Description (2,000):**

> Bunkcheck helps parents find the right summer camps for each child in the Northeast US (CT, MA,
> ME, NH, NJ, NY, PA, RI and VT), starting with Providence and Boston.
>
> Ask Claude in your own words, for example "Day camps near Providence with extended care for
> under $350 a week." Bunkcheck returns day camps, sleepaway camps and specialty programs ranked
> for your child, with weekly prices, session dates, extended care, transportation and financial
> aid. Each card says whether its details are verified, and whether a date or price is from last
> season because the camp hasn't posted the new one yet.
>
> You can find camps with openings in a given week, compare a shortlist side by side, and lay
> chosen sessions onto the summer to see covered weeks, gaps and the total cost. To plan every week
> for every child on one family calendar, continue on Bunkcheck.
>
> Bunkcheck needs no sign-in. It receives only the search details Claude fills in, such as town,
> ages, interests, dates and budget. It never sees your conversation or your family's information.
> It does not register you or take payments. If you want to ask a camp a question, Bunkcheck
> drafts it and you review and send it on bunkcheck.ai; nothing reaches the camp before you press
> Send.

**Use cases step:**
- Primary use cases: find summer camps for a child near a town; find camps with openings in a
  given week; compare camps; plan the summer's weeks and cost.
- What users need first: nothing. No account, no plan.
- Reads or writes: both. Nine tools only read. `send_inquiry` creates a draft question that the
  parent confirms on our site before anything is sent.

**Company step:** PromptBridge LLC, `https://www.bunkcheck.ai`, primary contact Andrew.

**Test & launch step** (reviewer instructions):

> No account or setup needed. Add `https://www.bunkcheck.ai/mcp` as a custom connector with No
> sign in. Coverage is the Northeast US, with the most camps around Providence, RI and Boston, MA.
> Try the five example prompts below. A search outside the Northeast (for example Columbus, Ohio)
> returns no camps and says so.

## Example prompts

All five work against production today (13 November 2026).

1. Find summer day camps near Providence, RI for my 8-year-old.
2. Day camps near Providence with extended care for under $350 a week.
3. What camps still have openings the week of July 5 near Cranston, RI?
4. Compare the top two and tell me their refund policies.
5. Find summer camps in Columbus, Ohio. (No camps; explains the Northeast coverage.)

## Screenshots

Four PNGs in [`assistant-apps/screenshots/`](../assistant-apps/screenshots), 1440 px wide,
cropped to the cards with no prompt in the image, as the portal asks. Paste each prompt next to its
image.

| File | Prompt |
| --- | --- |
| `1-providence-age-8.png` | Find summer day camps near Providence, RI for my 8-year-old. |
| `2-providence-extended-care-under-350.png` | Day camps near Providence with extended care for under $350 a week. |
| `3-cranston-week-of-july-5.png` | What camps still have openings the week of July 5 near Cranston, RI? |
| `4-providence-age-8-dark.png` | Find summer day camps near Providence, RI for my 8-year-old. (dark mode) |

They are the real widget with real production results. To redo them after a deploy:

```
node assistant-apps/card-screenshots.js https://www.bunkcheck.ai/mcp
```

Every camp on them shows "Not yet verified" and "2026 price. New season not posted yet." That is
true of every live listing today. Once camps confirm their 2027 details, rerun the script and
replace the images from the portal.

## Claude: click by click

1. Sign in to Claude on a paid plan (Pro, Max, Team or Enterprise). Go to
   [claude.ai/directory/manage](https://claude.ai/directory/manage).
2. Click **Submit new**, then **MCP connector**.
3. **Connection:** paste `https://www.bunkcheck.ai/mcp`, or pick the Bunkcheck connector you
   added. Leave "Users connect to different URLs" off.
4. **Tools:** ten tools sync. Nine show as read-only, `send_inquiry` as write. None should be
   flagged; if one is, stop and tell me.
5. **Listing:** the table and description above. Upload the icon and the four screenshots with
   their prompts.
6. **Use cases**, **Company:** as above.
7. **Authentication:** no sign-in.
8. **Data handling:** our own API; no health data; no sponsored content.
9. **Test & launch:** paste the reviewer instructions; confirm you ran every tool.
10. **Compliance:** read and accept the seven acknowledgments.
11. **Review and submit.** If it shows quality warnings, screenshot them before you submit.

After you submit, Anthropic scans it and by default lists it as a Community connector. Status and
reviewer notes appear at claude.ai/directory/manage. Escalations: `mcp-review@anthropic.com`.

Once it is listed, send me the directory link and I'll put it on `/connect` and `/support`,
replacing the custom-connector steps.

## ChatGPT: not yet

The page says "coming soon". Three things have to happen first:

1. **An API address on our own domain.** OpenAI verifies a token on the MCP server's host, and
   we can't verify `railway.app`. Add `api.bunkcheck.ai` as a custom domain on the Railway
   service `api` (Railway gives you a CNAME to add at the DNS host), then set
   `PUBLIC_API_URL=https://api.bunkcheck.ai`. The package already points at
   `https://api.bunkcheck.ai/chatgpt/mcp`.
2. **Developer-mode testing** of the eight cases in `docs/chatgpt-app.md`, on web and phone.
3. **A 2 to 3 minute demo video**, unlisted.

Then follow section 3 of `docs/assistant-apps-launch-checklist.md`. Those steps were checked in
October 2026; reread OpenAI's submission page on the day, since the dashboard moves.
