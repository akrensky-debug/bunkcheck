"""
Inquiry emails. The camp's email is built from the same function the parent's preview uses,
so what she approves is what the camp reads (only the camp's private reply link is hidden
from her). Signed as CampFinder (docs/decisions/agents.md rule 1). Plain text and HTML.
"""

from __future__ import annotations

import html
import os
from typing import Any

from campfinder.config import get_settings
from campfinder.mailer import Email

REPLY_LINK_PLACEHOLDER = "[the camp's private reply link]"
KIT_LINK_PLACEHOLDER = "[the link to your info package]"


def site() -> str:
    return get_settings().frontend_url.rstrip("/")


def reply_address(reply_token: str) -> str | None:
    """reply+<token>@INQUIRY_REPLY_DOMAIN, when inbound mail for inquiries is set up."""
    domain = os.environ.get("INQUIRY_REPLY_DOMAIN", "").strip()
    return f"reply+{reply_token}@{domain}" if domain else None


def _session_line(session: dict[str, Any] | None) -> str | None:
    if not session:
        return None
    name = session.get("name") or "Session"
    return f"{name}, {session['start_date']} to {session['end_date']}"


def camp_message(camp: dict[str, Any], session: dict[str, Any] | None, question: str, *,
                 kit: dict[str, Any] | None, contact: dict[str, Any] | None,
                 reply_link: str, can_reply_by_email: bool) -> tuple[str, str]:
    """(subject, plain text) of what the camp receives."""
    lines = [f"A parent has a question for {camp['name']}, sent through CampFinder.", ""]
    when = _session_line(session)
    if when:
        lines += [f"About: {when}", ""]
    lines += ["Their question:", "", question.strip(), ""]
    if kit:
        lines += [f"They shared their family info package with you ({kit['summary']}). The link expires "
                  f"{kit['expires_on']}, the family can withdraw it, and every open is logged:",
                  kit["url"], ""]
    if contact:
        parts = [contact.get("name"), contact.get("email"), contact.get("phone")]
        lines += ["They chose to share how to reach them: " + ", ".join(p for p in parts if p), ""]
    else:
        lines += ["They did not share contact details. Your answer reaches them through CampFinder.", ""]
    how = "Reply to this email, or answer here: " if can_reply_by_email else "Answer here: "
    lines += [how + reply_link, "",
              "Thanks,", "CampFinder", "",
              "You get questions like this because your camp is listed on CampFinder. "
              "Reply and a person will help with anything else."]
    subject = f"A parent's question about {camp['name']}"
    return subject, "\n".join(lines)


def _html(text: str) -> str:
    out = []
    for para in text.split("\n\n"):
        escaped = html.escape(para).replace("\n", "<br>")
        out.append(f"<p>{escaped}</p>")
    return "".join(out)


def to_camp(to: str, subject: str, text: str, reply_token: str) -> Email:
    return Email(to=to, subject=subject, html=_html(text), text=text, reply_to=reply_address(reply_token))


def reply_to_parent(to: str, camp_name: str, reply: str) -> Email:
    """Only sent when she chose to give the camp an email address, so the camp can also write to her."""
    text = (f"Hi,\n\n{camp_name} answered the question you sent through CampFinder:\n\n{reply.strip()}\n\n"
            f"You shared your email address with {camp_name}, so they can also write to you directly.\n\n"
            "Thanks,\nCampFinder")
    return Email(to=to, subject=f"{camp_name} answered your question", html=_html(text), text=text)
