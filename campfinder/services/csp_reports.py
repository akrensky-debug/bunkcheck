"""
Content-Security-Policy reports from the site (frontend/csp.js, docs/security.md).

Browsers send one when a page loads something the policy doesn't allow. While the policy is
report-only, nothing is blocked; these rows say whether enforcing it would break a real page.

Two formats arrive, both handled here:
  application/csp-report     {"csp-report": {"document-uri", "effective-directive", "blocked-uri", ...}}
  application/reports+json   [{"type": "csp-violation", "body": {"documentURL", "effectiveDirective",
                              "blockedURL", "disposition", ...}}]

Only what is needed to act on a report is stored: the site's host, the first segment of the page
path (never the rest, since /share/<token> carries a private token), the directive and the blocked
origin. Reports arrive through the site's /csp-report rewrite, so every caller shares Vercel's
address: the cap is global, per process.
"""

from __future__ import annotations

import json
import logging
from typing import Any
from urllib.parse import urlparse

from campfinder.database import get_supabase
from campfinder.limits import SlidingWindow

log = logging.getLogger(__name__)

MAX_BODY = 16_384          # bytes; a real report is well under 2 KB
MAX_PER_BODY = 20          # reports+json can batch several
REPORTS_PER_HOUR = 600     # per process, across everyone

hourly = SlidingWindow(REPORTS_PER_HOUR, 3600)


def _short(value: Any, n: int = 60) -> str | None:
    return str(value)[:n] if value not in (None, "") else None


def _page(url: str | None) -> tuple[str | None, str | None]:
    """The site's host and the first path segment: ("www.bunkcheck.ai", "/share")."""
    if not url:
        return None, None
    parsed = urlparse(url)
    first = parsed.path.strip("/").split("/", 1)[0]
    return _short(parsed.hostname), "/" + first[:40]


def _blocked(uri: str | None) -> str | None:
    """An origin for a URL, or the keyword browsers send for inline code, eval, data: and so on."""
    if not uri:
        return None
    parsed = urlparse(uri)
    if parsed.scheme in ("http", "https", "ws", "wss") and parsed.hostname:
        port = f":{parsed.port}" if parsed.port else ""
        return f"{parsed.scheme}://{parsed.hostname}{port}"
    return _short(parsed.scheme or uri, 40)


def _rows(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict) and isinstance(payload.get("csp-report"), dict):
        items = [(payload["csp-report"], "legacy")]
    elif isinstance(payload, list):
        items = [(r.get("body") or {}, "reporting") for r in payload[:MAX_PER_BODY]
                 if isinstance(r, dict) and r.get("type") == "csp-violation"]
    else:
        return []
    rows = []
    for body, kind in items:
        if not isinstance(body, dict):
            continue
        if kind == "legacy":
            page_url, blocked = body.get("document-uri"), body.get("blocked-uri")
            directive = body.get("effective-directive") or str(body.get("violated-directive") or "").split(" ")[0]
        else:
            page_url, blocked, directive = body.get("documentURL"), body.get("blockedURL"), body.get("effectiveDirective")
        if not directive:
            continue
        site, page = _page(page_url)
        rows.append({"site": site, "page": page, "directive": _short(directive, 40), "blocked": _blocked(blocked),
                     "disposition": _short(body.get("disposition"), 10)})
    return rows


def record(raw: bytes) -> int:
    """Store the reports in one request body. Returns how many were kept; bad input keeps none."""
    if not raw or len(raw) > MAX_BODY:
        return 0
    try:
        rows = _rows(json.loads(raw))
    except (ValueError, UnicodeDecodeError):
        return 0
    rows = [r for r in rows if hourly.hit("all")]
    if rows:
        get_supabase().table("csp_reports").insert(rows).execute()
    return len(rows)
