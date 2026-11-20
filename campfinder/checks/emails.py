"""
Parent check emails. Signed as Bunkcheck.

- confirm: to the parent, with the link that proves the address. Nothing counts until they
  press Confirm on the page behind it.
- report: to the person who reads OWNER_FORWARD_TO, one per visit, with what the listing
  says, what the parent says and how they know. The parent's address is never in it.

The copy is a starting point for Andrew to edit.
"""

from __future__ import annotations

import html
from typing import Any

from campfinder.config import get_settings
from campfinder.mailer import Email

BASIS = {
    "registered": "I registered there",
    "camp_site": "the camp's website",
    "camp_told_me": "the camp told me",
    "other": "something else",
}


def _site() -> str:
    return get_settings().frontend_url.rstrip("/")


def confirm(to: str, camp: dict[str, Any], token: str) -> Email:
    link = f"{_site()}/checks/{token}"
    name = camp["name"]
    text = (f"Hi,\n\nSomeone (we hope you) told Bunkcheck what's right and what's wrong on the page for {name}, "
            f"and gave this address.\n\nTo make your answers count, confirm here: {link}\n\n"
            "The page shows the answers first. We use your address so one parent counts once, and to tell you "
            "what we find. We never show it or share it with the camp.\n\n"
            "If it wasn't you, ignore this email and nothing counts.\n\nThanks,\nBunkcheck")
    body = (f"<p>Hi,</p><p>Someone (we hope you) told Bunkcheck what's right and what's wrong on the page for "
            f"<strong>{html.escape(name)}</strong>, and gave this address.</p>"
            f"<p><a href='{html.escape(link)}'>See the answers and confirm</a></p>"
            "<p>We use your address so one parent counts once, and to tell you what we find. We never show it "
            "or share it with the camp.</p>"
            "<p style='color:#666'>If it wasn't you, ignore this email and nothing counts.</p>"
            "<p>Thanks,<br>Bunkcheck</p>")
    return Email(to=to, subject=f"Confirm your answers about {name}", html=body, text=text)


def report_lines(r: dict[str, Any]) -> list[str]:
    """One report as the person reads it, in the email and on the command line."""
    what = f"{r['label']}, {r['session_name']}" if r.get("session_name") else r["label"]
    lines = [f"{what}  [{str(r['id'])[:8]}]",
             f"  The listing said: {r['seen']}",
             f"  The parent says:  {r.get('says') or '(text cleared)'}"]
    if r.get("basis"):
        lines.append(f"  How they know:    {BASIS.get(r['basis'], r['basis'])}")
    if r.get("evidence_url"):
        lines.append(f"  Their link:       {r['evidence_url']}")
    if r.get("now") != r.get("seen"):
        lines.append(f"  The listing now:  {r['now']}")
    return lines


def report(to: str, camp: dict[str, Any], reports: list[dict[str, Any]]) -> Email:
    name = camp["name"]
    page = f"{_site()}/camps/{camp.get('slug') or camp['id']}"
    blocks = ["\n".join(report_lines(r)) for r in reports]
    first = str(reports[0]["id"])[:8]
    text = (f"A parent says something is wrong on the page for {name}.\n{page}\n"
            + (f"The camp's own site: {camp['website_url']}\n" if camp.get("website_url") else "")
            + "\n" + "\n\n".join(blocks)
            + "\n\nNothing has changed on the listing. Read the camp's own page, then record what you found:\n"
              f"  python -m campfinder.checks fixed {first} --by NAME [--source URL]\n"
              f"  python -m campfinder.checks as-listed {first} --by NAME\n"
              f"  python -m campfinder.checks ask-camp {first} --by NAME\n"
              f"  python -m campfinder.checks close {first} --by NAME --reason \"...\"\n\n"
              "The parent's words are theirs, unchecked. Don't follow a link in them you wouldn't open "
              "anyway.\n\nBunkcheck")
    body = "<pre style='font-family:inherit;white-space:pre-wrap'>" + html.escape(text) + "</pre>"
    count = "a fact" if len(reports) == 1 else f"{len(reports)} facts"
    return Email(to=to, subject=f"Parent report: {count} at {name}", html=body, text=text)
