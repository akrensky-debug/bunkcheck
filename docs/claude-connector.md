# Bunkcheck in Claude

Bunkcheck is a remote MCP connector for Claude. Until it is listed, parents add it as a custom
connector from [www.bunkcheck.ai/connect](https://www.bunkcheck.ai/connect), which gives the
address `https://www.bunkcheck.ai/mcp` (proxied by the site to the API's `/claude/mcp`). Once it is
in the directory, Claude can also suggest it in a chat about camps. Results render as interactive
camp cards on Claude web, desktop and mobile, with the same handoff to Bunkcheck as in ChatGPT.
Strategy: `docs/assistant-apps-strategy.md`. Founder steps: `docs/assistant-apps-launch-checklist.md`.

## How it works

| Piece | Where |
| --- | --- |
| Claude endpoint | `https://www.bunkcheck.ai/mcp`, which proxies to `https://<api>/claude/mcp` (stateless streamable HTTP, JSON responses, no auth) |
| Tools | the same ten tools as ChatGPT (`campfinder/mcp_server.py`): nine read-only, plus `send_inquiry`, which drafts a question the parent sends from our site |
| Camp cards | the same MCP App (`ui://campfinder/camps-v6.html`) **without** `ui.domain` |
| Links | `ui/open-link` to our own site; tagged `utm_source=claude` |
| Server metadata | `title`, `websiteUrl` and light and dark `icons` served from `/static/` |
| Smoke test | `python -m campfinder.scripts.check_mcp https://www.bunkcheck.ai/mcp` |

**Why a separate endpoint:** Claude checks `_meta.ui.domain` against a hash of the connector URL
and refuses to render the app if it doesn't match, while ChatGPT requires `ui.domain` to be our
own origin ([Claude docs](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting)).
`/claude/mcp` leaves it out, which Claude accepts; we only need it if the widget ever runs its
own OAuth. The generic `/mcp` endpoint also omits it, so it works as a custom connector too.

## Requirements we checked (Claude docs, October 2026)

- Submit at **claude.ai/directory/manage** > MCP connector, from a Pro, Max, Team or Enterprise
  account (Free can't submit; on Team or Enterprise an Owner submits)
  ([submission](https://claude.com/docs/connectors/building/submission)).
- Remote HTTPS server using Streamable HTTP. No domain-ownership proof.
- Every tool needs a `title` and a `readOnlyHint` or `destructiveHint` annotation; names at most
  64 characters. Results under about 150,000 characters; 240-second timeout. We comply.
- Auth: none is supported for public data. If we add sign-in later: OAuth with DCR or CIMD and
  callback `https://claude.ai/api/mcp/auth_callback`.
- [Directory policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy):
  no ads or sponsored content; collect only necessary data and no extra conversation data, even
  for logs; privacy policy, verified support contact, documentation, at least three working
  example prompts; we must own or control every domain the server connects to or renders.
- MCP Apps listings need **3-5 PNG screenshots**, at least 1000 px wide, cropped to the card,
  each paired with its prompt. No video.
- Optional **Allowed link URIs**: origins we own that `ui/open-link` may open without a confirm prompt.
- Listing health: "Healthy" at 2% or fewer tool errors over 30 days (`isError` results count).
- Claude calls from `160.79.104.0/21`; keep it unblocked (our rate limit is per IP and set high for this reason).

## Listing, example prompts and screenshots

All in [`docs/directory-submissions.md`](directory-submissions.md), with the portal steps.

## Measuring it

Same as ChatGPT with `host = claude` / `source = claude`. Also watch the listing dashboard
(directory rank, error rate, p50/p95/p99 latency).
