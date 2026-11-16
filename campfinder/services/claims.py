"""
Claiming a camp listing: who may say "this is my camp".

A claim used to email its code to whatever address the claimant typed, so anyone could claim
any camp with their own inbox and the listing would say "Claimed by the camp". Now the code
goes only to an address the camp itself already published:

  contact_on_file   a contact we hold for this camp (camp_contacts), or the email on its
                    listing, which came from the camp's own website
  camp_domain       an address on the camp's website domain: director@riversidesoccer.org for
                    riversidesoccer.org. Shared hosts (wixsite.com, facebook.com) don't count.
  review            anything else. Nothing is sent; a person checks with the camp at the
                    address on its listing (docs/owner-confirmation.md, "Claims").

The reply is the same in every case, so the form can't be used to test which addresses we hold.

A verified claim raises the listing from "unverified" to "claimed" and never lowers it:
"Verified by our team" and "Confirmed by the camp" stay. Every change is in listing_changes.

Codes are stored as a hash, work once, and expire after CODE_HOURS.
"""

from __future__ import annotations

import hashlib
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

from campfinder.database import get_supabase
from campfinder.limits import SlidingWindow
from campfinder.owners.service import record_change
from campfinder.services.email import send_claim_verification_email
from campfinder.services.errors import NotFound, ServiceError

log = logging.getLogger(__name__)

CODE_HOURS = 72
CLAIMS_PER_HOUR_IP = 5
CLAIMS_PER_DAY_EMAIL = 3
CLAIMS_PER_DAY_CAMP = 10

# Mail providers anyone can sign up for: never proof of speaking for a camp.
FREE_MAIL = {
    "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com", "hotmail.com", "live.com",
    "msn.com", "aol.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "gmx.com",
    "mail.com", "zoho.com", "comcast.net", "verizon.net", "att.net", "sbcglobal.net", "optonline.net",
}
# Hosts a camp's "website" can sit on without the camp owning the domain.
SHARED_HOSTS = {
    "facebook.com", "instagram.com", "google.com", "sites.google.com", "linktr.ee", "wixsite.com",
    "squarespace.com", "weebly.com", "wordpress.com", "blogspot.com", "godaddysites.com", "square.site",
    "campbrainregistration.com", "campminder.com", "ultracamp.com", "activecommunities.com",
}

SAME_ANSWER = ("If that address is one {camp} publishes, a code is on its way and works for {hours} hours. "
               "If it isn't, we'll check with the camp at the address on its listing and reply to you.")

_EMAIL = re.compile(r"^[^@\s]+@([a-z0-9-]+(\.[a-z0-9-]+)+)$")

ip_hourly = SlidingWindow(CLAIMS_PER_HOUR_IP, 3600)
email_daily = SlidingWindow(CLAIMS_PER_DAY_EMAIL, 86400)
camp_daily = SlidingWindow(CLAIMS_PER_DAY_CAMP, 86400)


class ClaimError(ServiceError):
    """A claim we can't take. status follows HTTP."""

    def __init__(self, detail: str, status: int = 422):
        super().__init__(detail)
        self.status = status


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _host(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url if "://" in url else f"https://{url}")
    host = (parsed.hostname or "").lower().removeprefix("www.")
    return host or None


def route_for(camp: dict[str, Any], email: str) -> str:
    """Where this claim's code may go: contact_on_file, camp_domain or review."""
    email = email.strip().lower()
    on_file = {(c.get("email") or "").strip().lower() for c in
               get_supabase().table("camp_contacts").select("email").eq("camp_id", str(camp["id"])).execute().data or []}
    on_file.add((camp.get("email") or "").strip().lower())
    if email in on_file - {""}:
        return "contact_on_file"
    domain = email.rsplit("@", 1)[-1]
    host = _host(camp.get("website_url"))
    shared = host is None or host in SHARED_HOSTS or any(host.endswith("." + s) for s in SHARED_HOSTS)
    if not shared and domain == host and domain not in FREE_MAIL:
        return "camp_domain"
    return "review"


async def start_claim(camp_id: str, email: str, name: str | None, role: str | None, ip_key: str) -> dict[str, str]:
    """Take a claim. Sends a code only to an address the camp published; the answer is the same either way."""
    email = (email or "").strip().lower()
    if len(email) > 254 or not _EMAIL.match(email):
        raise ClaimError("Enter a valid email address.")
    if not ip_hourly.hit(ip_key):
        raise ClaimError("Too many claims from here. Try again in an hour.", 429)
    sb = get_supabase()
    camps = sb.table("camps").select("*").eq("id", camp_id).execute().data
    if not camps:
        raise NotFound("Camp not found")
    camp = camps[0]
    if not (email_daily.hit(email) and camp_daily.hit(str(camp["id"]))):
        raise ClaimError("Too many claims for this camp or address today. Try again tomorrow.", 429)

    route = route_for(camp, email)
    token = secrets.token_urlsafe(32) if route != "review" else None
    values = {
        "name": name, "role": role, "route": route,
        "status": "pending" if token else "needs_review",
        "token_hash": _hash(token) if token else None, "verification_token": None,
        "token_sent_at": _now().isoformat() if token else None,
    }
    existing = (sb.table("claim_requests").select("id").eq("camp_id", str(camp["id"])).eq("email", email)
                .limit(1).execute().data)
    if existing:
        sb.table("claim_requests").update(values).eq("id", existing[0]["id"]).execute()
    else:
        sb.table("claim_requests").insert({"camp_id": str(camp["id"]), "email": email, **values}).execute()

    if token:
        try:
            await send_claim_verification_email(to_email=email, camp_id=str(camp["id"]), camp_name=camp["name"],
                                                token=token)
        except Exception:
            log.exception("claim code for camp %s not sent", camp["id"])
    else:
        log.warning("claim for camp %s held for review: the address isn't one the camp publishes", camp["id"])
    return {"message": SAME_ANSWER.format(camp=camp["name"], hours=CODE_HOURS), "camp_name": camp["name"]}


def verify_claim(token: str) -> dict[str, str]:
    """Complete a claim with its code. Single use; expires after CODE_HOURS."""
    sb = get_supabase()
    rows = (sb.table("claim_requests").select("*").eq("token_hash", _hash(token.strip()))
            .eq("status", "pending").execute().data) if token and token.strip() else []
    sent = rows[0].get("token_sent_at") if rows else None
    if not rows or not sent or _now() - datetime.fromisoformat(str(sent)) > timedelta(hours=CODE_HOURS):
        raise ClaimError("That code isn't valid or has expired. Start the claim again for a new one.", 404)
    claim = rows[0]
    camp_id = str(claim["camp_id"])
    sb.table("claim_requests").update({"status": "verified", "verified_at": _now().isoformat(),
                                       "token_hash": None}).eq("id", claim["id"]).execute()

    if sb.table("camp_ownership").select("id").eq("camp_id", camp_id).execute().data:
        sb.table("camp_ownership").update({"verified": True, "plan": "claimed"}).eq("camp_id", camp_id).execute()
    else:
        sb.table("camp_ownership").insert({"camp_id": camp_id, "email": claim["email"],
                                           "contact_name": claim.get("name"), "role": claim.get("role"),
                                           "verified": True, "plan": "claimed"}).execute()

    camp = sb.table("camps").select("id,name,verification_status").eq("id", camp_id).execute().data[0]
    if camp.get("verification_status") in (None, "unverified"):  # raise only; never lower a verified listing
        sb.table("camps").update({"verification_status": "claimed"}).eq("id", camp_id).execute()
        record_change(camp_id, "verification_status", "owner_web", claim["email"],
                      old_value=camp.get("verification_status"), new_value="claimed")
    record_change(camp_id, "claim", "owner_web", claim["email"], new_value={"route": claim.get("route")})
    return {"message": "Claim verified. Welcome to Bunkcheck.", "camp_name": camp["name"]}
