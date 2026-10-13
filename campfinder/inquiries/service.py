"""
Inquiries: a parent's question to a camp, sent by whichever assistant she is using, and only
after she says yes.

    create()    an assistant (our site agent, ChatGPT, Claude, a partner app) makes a pending
                inquiry and gets back a preview of exactly what the camp will read, a confirm
                link for the parent, and a read token for the reply
    confirm()   the parent says yes on CampFinder (adding her contact details only if she
                wants to); then it is emailed to the camp's verified contact
    reply()     the camp answers by replying to the email or on the web; the assistant reads
                it with the read token

Rules held here, not in prompts:
- Nothing reaches a camp before the parent confirms. A partner may confirm for her only if
  its key is allowed to (may_confirm_for_parent, off by default: an open decision).
- The info kit travels only as an existing share package's link, never its contents. The
  assistant passes the token; we check the package is live and made for this camp.
- Assistants never send or receive her identity. The question may not carry contact details;
  she adds them herself on the confirm page. Partners never get her contact or family back.
- Billing never holds a family back: every confirmed inquiry is delivered. It is billable only
  if the camp opted in, it was delivered, it is the family's first billable one to this camp
  in 7 days, and the camp's monthly cap isn't reached.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import re
import secrets
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator

from campfinder.database import get_supabase
from campfinder.inquiries import emails
from campfinder.mailer import get_mailer
from campfinder.services.errors import ServiceError

log = logging.getLogger(__name__)

QUESTION_MIN, QUESTION_MAX = 10, 1000
PENDING_HOURS = 72             # a preview not confirmed by then is never sent
REPEAT_DAYS = 7                # bill at most one inquiry per family per camp in this window
FAMILY_DAILY_CAP = 5           # confirmed inquiries per family per 24 hours
CAMP_DAILY_CAP = 40            # confirmed inquiries per camp per 24 hours, against floods
IP_HOURLY_CAP = 20             # site requests per IP per hour (create and confirm)
RETENTION_DAYS = 365           # then the text, replies and contact are removed; counts stay
UNSENT_KEEP_DAYS = 30          # expired or cancelled inquiries are deleted after this
MAX_DELIVERY_ATTEMPTS = 5
MAX_REPLY_CHARS = 5000

CHANNEL_LABELS = {
    "site": "CampFinder",
    "chatgpt": "ChatGPT",
    "claude": "Claude",
    "assistant": "An AI assistant",
}

# An email address, a North American phone number, or an international one. Not dates ("2027-07-06").
_CONTACT = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"
                      r"|(?<![\w-])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\w-])"
                      r"|\+\d[\d\s().-]{8,}\d")
_URL = re.compile(r"(?:https?://|www\.)\S+", re.I)


class InquiryError(ServiceError):
    """Something the caller can fix or should hear about. status follows HTTP."""

    def __init__(self, detail: str, status: int = 422):
        super().__init__(detail)
        self.status = status


class Contact(BaseModel):
    """What the parent chose to share with the camp. Never comes from an assistant's model."""
    name: str | None = Field(default=None, max_length=120)
    email: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=40)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str | None) -> str | None:
        v = (v or "").strip()
        if not v:
            return None
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v):
            raise ValueError("That doesn't look like an email address")
        return v.lower()

    def cleaned(self) -> dict[str, str] | None:
        out = {k: v.strip() for k, v in self.model_dump().items() if v and v.strip()}
        if not (out.get("email") or out.get("phone")):
            return None  # a name alone gives the camp no way to reach her
        return out


@dataclass
class Created:
    inquiry: dict[str, Any]
    read_token: str
    confirm_token: str
    preview: dict[str, Any]

    @property
    def confirm_url(self) -> str:
        return f"{emails.site()}/inquiries/{self.confirm_token}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _ts(v: Any) -> datetime | None:
    if v is None or isinstance(v, datetime):
        return v
    return datetime.fromisoformat(str(v).replace("Z", "+00:00"))


def price_cents() -> int:
    """The price per billable inquiry is set in the pricing plan, not here (INQUIRY_PRICE_CENTS)."""
    return int(os.environ.get("INQUIRY_PRICE_CENTS", "1000"))


def channel_label(channel: str) -> str:
    if channel.startswith("partner:"):
        return f"Partner app: {channel.split(':', 1)[1]}"
    return CHANNEL_LABELS.get(channel, channel)


# ---------------------------------------------------------------------------
# Abuse limits
# ---------------------------------------------------------------------------

_ip_windows: dict[str, deque[float]] = {}


def check_ip(ip: str | None) -> None:
    """Per-IP limit for the site's own (keyless) inquiry endpoints. Partners use their key's limit."""
    if not ip:
        return
    now = time.monotonic()
    window = _ip_windows.setdefault(ip, deque())
    while window and now - window[0] > 3600:
        window.popleft()
    if len(window) >= IP_HOURLY_CAP:
        raise InquiryError("Too many questions from here in the last hour. Try again later.", 429)
    window.append(now)
    if len(_ip_windows) > 10_000:
        for key in [k for k, w in _ip_windows.items() if not w or now - w[-1] > 3600]:
            del _ip_windows[key]


def clean_question(text: str) -> str:
    """Basic spam checks. Contact details are refused: she adds them herself when she confirms."""
    q = re.sub(r"\n{3,}", "\n\n", (text or "").strip())
    q = re.sub(r"[ \t]+", " ", q)
    if len(q) < QUESTION_MIN:
        raise InquiryError(f"The question is too short (at least {QUESTION_MIN} characters).")
    if len(q) > QUESTION_MAX:
        raise InquiryError(f"The question is too long (at most {QUESTION_MAX} characters).")
    if _CONTACT.search(q):
        raise InquiryError("Leave contact details out of the question. The parent adds them on the "
                           "confirm page if they want the camp to have them.")
    if len(_URL.findall(q)) > 1:
        raise InquiryError("The question has too many links.")
    letters, visible = sum(ch.isalpha() for ch in q), sum(not ch.isspace() for ch in q)
    if letters < visible * 0.4 or re.search(r"(.)\1{9,}", q):
        raise InquiryError("That doesn't read like a question for a camp.")
    return q


def _normalized(q: str) -> str:
    return re.sub(r"\W+", " ", q.lower()).strip()


# ---------------------------------------------------------------------------
# Lookups
# ---------------------------------------------------------------------------

def _camp(program_id: str) -> dict[str, Any]:
    sb = get_supabase()
    rows = sb.table("camps").select("*").eq("id", program_id).execute().data
    if rows:
        return rows[0]
    if sb.table("programs").select("id").eq("id", program_id).execute().data:
        raise InquiryError("Questions can go to camps for now, not yet to year-round programs. "
                           "Their own contact details are on the listing.")
    raise InquiryError("No camp with that id", 404)


def _session(camp_id: str, session_id: str | None) -> dict[str, Any] | None:
    if not session_id:
        return None
    rows = get_supabase().table("sessions").select("*").eq("id", session_id).eq("camp_id", camp_id).execute().data
    if not rows:
        raise InquiryError("That session isn't one of this camp's", 404)
    return rows[0]


def verified_contact(camp_id: str) -> dict[str, Any] | None:
    """The camp's verified contact: confirmed by the owner, primary first."""
    rows = get_supabase().table("camp_contacts").select("*").eq("camp_id", camp_id).execute().data or []
    rows = [r for r in rows if r.get("verified_at")]
    rows.sort(key=lambda r: not r.get("is_primary"))
    return rows[0] if rows else None


def _no_contact(camp: dict[str, Any]) -> InquiryError:
    own = camp.get("website_url") or camp.get("email") or camp.get("phone")
    tail = f" Their own contact details: {own}" if own else ""
    return InquiryError(f"{camp['name']} hasn't set up questions through CampFinder yet.{tail}", 409)


def _kit(token_or_url: str, camp_id: str, family_id: str | None) -> tuple[dict[str, Any], str]:
    """Resolve a share package the parent already made. Same answer for unknown, expired or withdrawn."""
    token = token_or_url.strip().rstrip("/").rsplit("/", 1)[-1].split("?", 1)[0]
    rows = get_supabase().table("kit_shares").select("*").eq("token_hash", _hash(token)).execute().data
    gone = InquiryError("That info package link doesn't work: it may have expired or been withdrawn. "
                        "The parent can make a new one on CampFinder.")
    if not rows:
        raise gone
    share = rows[0]
    if share.get("revoked_at") or _ts(share["expires_at"]) <= _now():
        raise gone
    if family_id and str(share["family_id"]) != str(family_id):
        raise gone
    if share.get("camp_id") and str(share["camp_id"]) != str(camp_id):
        raise InquiryError("That info package was made for a different camp.")
    return share, token


def _kit_summary(share: dict[str, Any], token: str | None) -> dict[str, Any]:
    """Field names and counts only: what the package holds, never the values."""
    fields = list(share.get("household_fields") or []) + list(share.get("child_fields") or [])
    names = ", ".join(f.replace("_", " ") for f in fields)
    kids = len(share.get("children") or [])
    who = f"{kids} child{'ren' if kids != 1 else ''}" if kids else "the household"
    return {
        "summary": f"{names} for {who}",
        "fields": fields,
        "expires_on": _ts(share["expires_at"]).date().isoformat(),
        "url": f"{emails.site()}/share/{token}" if token else emails.KIT_LINK_PLACEHOLDER,
    }


def _family_key(*, family_id: str | None, client_id: str | None, user_ref: str | None,
                email: str | None) -> str | None:
    if family_id:
        return _hash(f"family:{family_id}")
    if client_id and user_ref:
        return _hash(f"partner:{client_id}:{user_ref}")
    if email:
        return _hash(f"email:{email.lower()}")
    return None


# ---------------------------------------------------------------------------
# Create (pending) and preview
# ---------------------------------------------------------------------------

def _message(row: dict[str, Any], camp: dict[str, Any], session: dict[str, Any] | None, *,
             contact: dict[str, Any] | None, kit_token: str | None, reply_link: str) -> tuple[str, str]:
    kit = None
    if row.get("kit_share_id"):
        share = get_supabase().table("kit_shares").select("*").eq("id", str(row["kit_share_id"])).execute().data
        if share and not share[0].get("revoked_at") and _ts(share[0]["expires_at"]) > _now():
            kit = _kit_summary(share[0], kit_token)
    return emails.camp_message(camp, session, row["question"], kit=kit, contact=contact,
                               reply_link=reply_link, can_reply_by_email=bool(emails.reply_address("x")))


def preview(row: dict[str, Any], contact: dict[str, Any] | None = None) -> dict[str, Any]:
    """Exactly what the camp will read, except its private reply link, which stays hidden.
    The kit link shows as the package's own link only to the parent; assistants see a placeholder."""
    camp = _camp(str(row["camp_id"]))
    session = _session(str(row["camp_id"]), row.get("session_id")) if row.get("session_id") else None
    subject, text = _message(row, camp, session, contact=contact, kit_token=None,
                             reply_link=emails.REPLY_LINK_PLACEHOLDER)
    return {"to": camp["name"], "subject": subject, "text": text,
            "kit_included": bool(row.get("kit_share_id")), "contact_included": bool(contact)}


def create(*, program_id: str, question: str, channel: str, session_id: str | None = None,
           kit_token: str | None = None, api_client_id: str | None = None, family_id: str | None = None,
           user_ref: str | None = None, now: datetime | None = None) -> Created:
    now = now or _now()
    q = clean_question(question)
    camp = _camp(str(program_id))
    session = _session(camp["id"], str(session_id) if session_id else None)
    if verified_contact(camp["id"]) is None:
        raise _no_contact(camp)

    share, token = (None, None)
    if kit_token:
        share, token = _kit(kit_token, camp["id"], family_id)
        family_id = family_id or str(share["family_id"])  # her inquiry: in her export and deletion
    key = _family_key(family_id=family_id, client_id=api_client_id, user_ref=user_ref, email=None)

    sb = get_supabase()
    since = (now - timedelta(hours=24)).isoformat()
    recent = sb.table("inquiries").select("question,family_key,channel,status").eq("camp_id", camp["id"]) \
        .gte("created_at", since).execute().data or []
    for r in recent:
        same_asker = (key and r.get("family_key") == key) or (not key and r.get("channel") == channel)
        if same_asker and r["status"] in ("pending", "confirmed", "delivered") \
                and _normalized(r.get("question") or "") == _normalized(q):
            raise InquiryError("This question to this camp is already waiting for the parent's yes, or was "
                               "sent in the last day.", 409)

    read_token, confirm_token = secrets.token_urlsafe(24), secrets.token_urlsafe(24)
    row = sb.table("inquiries").insert({
        "camp_id": camp["id"],
        "session_id": session["id"] if session else None,
        "channel": channel,
        "api_client_id": api_client_id,
        "family_id": family_id,
        "family_key": key,
        "question": q,
        "kit_share_id": share["id"] if share else None,
        "kit_token": token,
        "status": "pending",
        "token_hash": _hash(read_token),
        "confirm_token_hash": _hash(confirm_token),
        "expires_at": (now + timedelta(hours=PENDING_HOURS)).isoformat(),
        "created_at": now.isoformat(),
    }).execute().data[0]
    return Created(row, read_token, confirm_token, preview(row))


# ---------------------------------------------------------------------------
# Confirm and deliver
# ---------------------------------------------------------------------------

def _by(column: str, token: str) -> dict[str, Any]:
    rows = get_supabase().table("inquiries").select("*").eq(column, _hash(token)).execute().data
    if not rows:
        raise InquiryError("This link has expired or doesn't exist.", 404)
    return rows[0]


def _by_id(inquiry_id: str, read_token: str, api_client_id: str | None = None) -> dict[str, Any]:
    rows = get_supabase().table("inquiries").select("*").eq("id", str(inquiry_id)).execute().data
    missing = InquiryError("No inquiry with that id and token", 404)
    if not rows or not hmac.compare_digest(rows[0]["token_hash"], _hash(read_token or "")):
        raise missing
    if api_client_id is not None and str(rows[0].get("api_client_id")) != str(api_client_id):
        raise missing
    return rows[0]


def _count_since(column: str, value: str, since: datetime) -> int:
    rows = get_supabase().table("inquiries").select("id").eq(column, value) \
        .gte("confirmed_at", since.isoformat()).execute().data or []
    return len(rows)


async def _confirm(row: dict[str, Any], *, via: str, contact: dict[str, Any] | None, family_id: str | None,
                   user_ref: str | None, now: datetime) -> dict[str, Any]:
    if row["status"] in ("confirmed", "delivered"):
        return row  # a second click changes nothing
    if row["status"] != "pending":
        raise InquiryError("This question was not sent: it expired or was cancelled. Ask again.", 409)
    if _ts(row["expires_at"]) <= now:
        get_supabase().table("inquiries").update({"status": "expired"}).eq("id", row["id"]).execute()
        raise InquiryError("This question was not sent: it waited too long for a yes. Ask again.", 409)

    family_id = row.get("family_id") or family_id
    key = row.get("family_key") or _family_key(
        family_id=family_id, client_id=row.get("api_client_id"), user_ref=user_ref,
        email=(contact or {}).get("email"))
    day_ago = now - timedelta(hours=24)
    if key and _count_since("family_key", key, day_ago) >= FAMILY_DAILY_CAP:
        raise InquiryError(f"That's {FAMILY_DAILY_CAP} questions to camps today. Try again tomorrow.", 429)
    if _count_since("camp_id", str(row["camp_id"]), day_ago) >= CAMP_DAILY_CAP:
        raise InquiryError("This camp has had a lot of questions today. Try again tomorrow.", 429)

    claimed = get_supabase().table("inquiries").update({
        "status": "confirmed", "confirmed_at": now.isoformat(), "confirmed_via": via,
        "contact": contact, "family_id": family_id, "family_key": key,
    }).eq("id", row["id"]).eq("status", "pending").execute().data
    if not claimed:  # confirmed at the same moment elsewhere
        return get_supabase().table("inquiries").select("*").eq("id", row["id"]).execute().data[0]
    return await deliver(claimed[0], now=now)


async def confirm(confirm_token: str, *, contact: Contact | None = None, family_id: str | None = None,
                  now: datetime | None = None) -> dict[str, Any]:
    """The parent's yes, on CampFinder."""
    row = _by("confirm_token_hash", confirm_token)
    if family_id and row.get("family_id") and str(row["family_id"]) != str(family_id):
        family_id = None  # keep the family it already belongs to
    return await _confirm(row, via="campfinder", contact=contact.cleaned() if contact else None,
                          family_id=family_id, user_ref=None, now=now or _now())


async def confirm_for_parent(inquiry_id: str, read_token: str, *, client_id: str, may_confirm: bool,
                             may_share_contact: bool, user_ref: str | None = None,
                             contact: Contact | None = None, now: datetime | None = None) -> dict[str, Any]:
    """A partner says the parent agreed in its own app. Only for keys allowed to (open decision)."""
    if not may_confirm:
        raise InquiryError("This key can't confirm for the parent. Show the parent the confirm_url: they "
                           "say yes on CampFinder.", 403)
    cleaned = contact.cleaned() if contact else None
    if cleaned and not may_share_contact:
        raise InquiryError("This key can't send the parent's contact details. The parent can add them on "
                           "the confirm_url page.", 403)
    row = _by_id(inquiry_id, read_token, client_id)
    return await _confirm(row, via="partner", contact=cleaned, family_id=None, user_ref=user_ref, now=now or _now())


def cancel(confirm_token: str) -> dict[str, Any]:
    row = _by("confirm_token_hash", confirm_token)
    if row["status"] != "pending":
        raise InquiryError("This question was already sent or closed.", 409)
    return get_supabase().table("inquiries").update({"status": "cancelled"}).eq("id", row["id"]).execute().data[0]


def billing_for(row: dict[str, Any], now: datetime) -> tuple[bool, str, int | None]:
    sb = get_supabase()
    camp_id = str(row["camp_id"])
    settings = sb.table("camp_inquiry_settings").select("*").eq("camp_id", camp_id).execute().data
    if not settings or not settings[0].get("billing_opted_in"):
        return False, "camp_not_opted_in", None
    key = row.get("family_key")
    if not key:
        return False, "no_family_to_count", None
    week_ago = (now - timedelta(days=REPEAT_DAYS)).isoformat()
    earlier = sb.table("inquiries").select("id").eq("camp_id", camp_id).eq("family_key", key) \
        .eq("billable", True).gte("delivered_at", week_ago).execute().data
    if earlier:
        return False, "repeat_within_7_days", None
    cap = settings[0].get("monthly_cap")
    if cap is not None:
        month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        billed = sb.table("inquiries").select("id").eq("camp_id", camp_id).eq("billable", True) \
            .gte("delivered_at", month).execute().data or []
        if len(billed) >= cap:
            return False, "monthly_cap_reached", None
    return True, "billable", price_cents()


async def deliver(row: dict[str, Any], now: datetime | None = None) -> dict[str, Any]:
    """Email a confirmed inquiry to the camp's verified contact. Billing is decided on delivery."""
    now = now or _now()
    sb = get_supabase()
    if row["status"] != "confirmed":
        return row
    camp = _camp(str(row["camp_id"]))
    contact_row = verified_contact(camp["id"])
    if contact_row is None:
        log.warning("inquiry %s: camp %s has no verified contact any more", row["id"], camp["id"])
        return sb.table("inquiries").update({"delivery_attempts": (row.get("delivery_attempts") or 0) + 1}) \
            .eq("id", row["id"]).execute().data[0]
    session = _session(camp["id"], row.get("session_id")) if row.get("session_id") else None
    reply_token = secrets.token_urlsafe(24)
    subject, text = _message(row, camp, session, contact=row.get("contact"), kit_token=row.get("kit_token"),
                             reply_link=f"{emails.site()}/owners/inquiries/{reply_token}")
    sent = await get_mailer().send(emails.to_camp(contact_row["email"], subject, text, reply_token))
    update: dict[str, Any] = {"delivery_attempts": (row.get("delivery_attempts") or 0) + 1}
    if sent:
        billable, reason, price = billing_for(row, now)
        update |= {"status": "delivered", "delivered_at": now.isoformat(), "camp_contact_id": contact_row["id"],
                   "reply_token_hash": _hash(reply_token), "billable": billable, "bill_reason": reason,
                   "price_cents": price}
    return sb.table("inquiries").update(update).eq("id", row["id"]).execute().data[0]


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

STATUS_TEXT = {
    "pending": "Waiting for the parent's yes. Nothing has been sent to the camp.",
    "confirmed": "The parent said yes. Sending to the camp.",
    "delivered": "Sent to the camp.",
    "expired": "Not sent: it waited too long for the parent's yes.",
    "cancelled": "Not sent: the parent cancelled it.",
}


def _replies(row: dict[str, Any]) -> list[dict[str, Any]]:
    return [{"text": r["text"], "at": r["at"]} for r in row.get("replies") or []]


def public_view(row: dict[str, Any], *, confirm_token: str | None = None) -> dict[str, Any]:
    """What an assistant or partner may see. Never her contact details or her family."""
    camp = get_supabase().table("camps").select("id,name").eq("id", str(row["camp_id"])).execute().data
    out: dict[str, Any] = {
        "id": str(row["id"]),
        "status": row["status"],
        "status_text": STATUS_TEXT[row["status"]],
        "camp": {"id": str(row["camp_id"]), "name": camp[0]["name"] if camp else None},
        "session_id": str(row["session_id"]) if row.get("session_id") else None,
        "question": row.get("question"),
        "kit_included": bool(row.get("kit_share_id")),
        "created_at": row["created_at"],
        "confirmed_at": row.get("confirmed_at"),
        "delivered_at": row.get("delivered_at"),
        "replies": _replies(row),
    }
    if row["status"] == "pending":
        out["expires_at"] = row["expires_at"]
        out["preview"] = preview(row)
        if confirm_token:
            out["confirm_url"] = f"{emails.site()}/inquiries/{confirm_token}"
    return out


def view_for_assistant(inquiry_id: str, read_token: str, api_client_id: str | None = None) -> dict[str, Any]:
    return public_view(_by_id(inquiry_id, read_token, api_client_id))


def view_for_parent(confirm_token: str) -> dict[str, Any]:
    """The parent's own page: the preview, whether she shared contact details, and the camp's answers.

    The confirm link passes through the assistant that prepared the inquiry, so this view never
    returns the contact details themselves: the assistant could open the link after she confirms."""
    row = _by("confirm_token_hash", confirm_token)
    out = public_view(row)
    out["contact_included"] = bool(row.get("contact"))
    out["channel"] = channel_label(row["channel"])
    if row["status"] == "pending" and row.get("kit_share_id"):
        share = get_supabase().table("kit_shares").select("*").eq("id", str(row["kit_share_id"])).execute().data
        if share:
            out["kit"] = {k: v for k, v in _kit_summary(share[0], None).items() if k != "url"}
    return out


def appearances_for(camp_id: str, days: int = 30, now: datetime | None = None) -> int:
    """How many API and MCP responses included this camp in the last `days` days."""
    since = ((now or _now()) - timedelta(days=days)).isoformat()
    rows = get_supabase().table("result_appearances").select("id").contains("program_ids", [str(camp_id)]) \
        .gte("created_at", since).execute().data or []
    return len(rows)


def view_for_camp(reply_token: str, now: datetime | None = None) -> dict[str, Any]:
    """The camp's page, opened from the email: this inquiry, and its recent inquiry list."""
    row = _by("reply_token_hash", reply_token)
    sb = get_supabase()
    camp = sb.table("camps").select("id,name").eq("id", str(row["camp_id"])).execute().data[0]
    session = _session(camp["id"], row.get("session_id")) if row.get("session_id") else None
    kit_url = None
    if row.get("kit_token") and row.get("kit_share_id"):
        share = sb.table("kit_shares").select("*").eq("id", str(row["kit_share_id"])).execute().data
        if share and not share[0].get("revoked_at") and _ts(share[0]["expires_at"]) > _now():
            kit_url = f"{emails.site()}/share/{row['kit_token']}"
    recent = sb.table("inquiries").select("*").eq("camp_id", camp["id"]).eq("status", "delivered") \
        .order("delivered_at", desc=True).limit(50).execute().data or []
    settings = sb.table("camp_inquiry_settings").select("*").eq("camp_id", camp["id"]).execute().data
    return {
        "camp": camp,
        "inquiry": {
            "id": str(row["id"]),
            "session": {"name": session.get("name"), "start_date": session["start_date"],
                        "end_date": session["end_date"]} if session else None,
            "question": row.get("question"),
            "contact": row.get("contact"),
            "kit_url": kit_url,
            "source": channel_label(row["channel"]),
            "delivered_at": row.get("delivered_at"),
            "replies": _replies(row),
        },
        "inquiries": [{
            "id": str(r["id"]),
            "delivered_at": r.get("delivered_at"),
            "source": channel_label(r["channel"]),
            "question": r.get("question"),
            "answered": bool(r.get("replies")),
            "billable": bool(r.get("billable")),
            "bill_reason": r.get("bill_reason"),
        } for r in recent],
        "billing": {
            "opted_in": bool(settings and settings[0].get("billing_opted_in")),
            "monthly_cap": settings[0].get("monthly_cap") if settings else None,
        },
        "agent_appearances_30_days": appearances_for(camp["id"], now=now),
    }


# ---------------------------------------------------------------------------
# Replies
# ---------------------------------------------------------------------------

_QUOTE_START = re.compile(r"^(On .+wrote:|-----Original Message-----|From: .+|Sent from my .+)$", re.I)


def strip_quoted(text: str) -> str:
    """Keep the camp's new words; drop the quoted email below them."""
    kept = []
    for line in (text or "").splitlines():
        if _QUOTE_START.match(line.strip()):
            break
        if line.lstrip().startswith(">"):
            continue
        kept.append(line)
    return "\n".join(kept).strip()[:MAX_REPLY_CHARS]


async def _add_reply(row: dict[str, Any], text: str, via: str, message_id: str | None = None,
                     now: datetime | None = None) -> dict[str, Any]:
    now = now or _now()
    replies = list(row.get("replies") or [])
    if message_id and any(r.get("message_id") == message_id for r in replies):
        return row  # the mail provider redelivered it
    replies.append({"text": text, "via": via, "at": now.isoformat(), **({"message_id": message_id} if message_id else {})})
    updated = get_supabase().table("inquiries").update({"replies": replies, "last_reply_at": now.isoformat()}) \
        .eq("id", row["id"]).execute().data[0]
    email = (row.get("contact") or {}).get("email")
    if email:
        camp = get_supabase().table("camps").select("name").eq("id", str(row["camp_id"])).execute().data[0]
        try:
            await get_mailer().send(emails.reply_to_parent(email, camp["name"], text))
        except Exception:
            log.warning("inquiry %s: could not email the parent", row["id"], exc_info=True)
    return updated


async def reply_on_web(reply_token: str, text: str) -> dict[str, Any]:
    row = _by("reply_token_hash", reply_token)
    text = (text or "").strip()
    if not text:
        raise InquiryError("Write an answer first.")
    if len(text) > MAX_REPLY_CHARS:
        raise InquiryError(f"Keep the answer under {MAX_REPLY_CHARS} characters.")
    await _add_reply(row, text, "web")
    return view_for_camp(reply_token)


_REPLY_ADDRESS = re.compile(r"reply\+([A-Za-z0-9_-]+)@", re.I)


async def receive_reply_email(to_email: str, from_email: str, text: str, *, message_id: str | None = None) -> str:
    """A camp replied to an inquiry email. Accepted only from one of that camp's own contacts."""
    m = _REPLY_ADDRESS.search(to_email or "")
    if not m:
        return "unknown_address"
    rows = get_supabase().table("inquiries").select("*").eq("reply_token_hash", _hash(m.group(1))).execute().data
    if not rows:
        return "unknown_address"
    row = rows[0]
    contacts = get_supabase().table("camp_contacts").select("email").eq("camp_id", str(row["camp_id"])).execute().data or []
    if (from_email or "").strip().lower() not in {(c["email"] or "").lower() for c in contacts}:
        log.warning("inquiry %s: reply from an address that isn't the camp's", row["id"])
        return "rejected"
    body = strip_quoted(text)
    if not body:
        return "empty"
    await _add_reply(row, body, "email", message_id)
    return "accepted"


# ---------------------------------------------------------------------------
# Results seen by agents
# ---------------------------------------------------------------------------

def record_appearances(channel: str, surface: str, program_ids: list[str]) -> None:
    """Log which programs one API or MCP response returned. Ids only; never the query."""
    ids = list(dict.fromkeys(str(i) for i in program_ids if i))
    if not ids:
        return
    try:
        get_supabase().table("result_appearances").insert(
            {"channel": channel, "surface": surface, "program_ids": ids}).execute()
    except Exception:  # counting never breaks a response
        log.warning("result appearance logging failed", exc_info=True)


# ---------------------------------------------------------------------------
# Scheduled: retries and retention
# ---------------------------------------------------------------------------

async def run_scheduled(now: datetime | None = None, dry_run: bool = False) -> dict[str, int]:
    now = now or _now()
    sb = get_supabase()
    out = {"expired": 0, "retried": 0, "delivered": 0, "deleted": 0, "redacted": 0}

    for row in sb.table("inquiries").select("*").eq("status", "pending").lte("expires_at", now.isoformat()).execute().data or []:
        out["expired"] += 1
        if not dry_run:
            sb.table("inquiries").update({"status": "expired"}).eq("id", row["id"]).execute()

    for row in sb.table("inquiries").select("*").eq("status", "confirmed").execute().data or []:
        if (row.get("delivery_attempts") or 0) >= MAX_DELIVERY_ATTEMPTS:
            continue
        out["retried"] += 1
        if not dry_run and (await deliver(row, now=now))["status"] == "delivered":
            out["delivered"] += 1

    old = (now - timedelta(days=UNSENT_KEEP_DAYS)).isoformat()
    for status in ("expired", "cancelled"):
        for row in sb.table("inquiries").select("id").eq("status", status).lte("created_at", old).execute().data or []:
            out["deleted"] += 1
            if not dry_run:
                sb.table("inquiries").delete().eq("id", row["id"]).execute()

    cutoff = (now - timedelta(days=RETENTION_DAYS)).isoformat()
    for row in sb.table("inquiries").select("id,redacted_at").eq("status", "delivered").lte("delivered_at", cutoff).execute().data or []:
        if row.get("redacted_at"):
            continue
        out["redacted"] += 1
        if not dry_run:
            sb.table("inquiries").update({
                "question": None, "replies": [], "contact": None, "kit_token": None, "kit_share_id": None,
                "family_key": None, "family_id": None, "redacted_at": now.isoformat(),
            }).eq("id", row["id"]).execute()
    return out
