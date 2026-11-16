"""
Camp operators and analytics: submissions, the claim flow, and client analytics events.

Parent lead capture (the search email gate and the "request info" form) was removed in Phase 1:
we don't sell parent contacts to camps. A parent's question to a camp now goes through
inquiries (routers/inquiries.py, docs/inquiries.md), where contact details reach the camp
only if the parent chooses to share them.

POST /api/v1/submissions        — operator self-submits new camp
POST /api/v1/claims             — operator starts a claim (services/claims.py)
GET  /api/v1/claims/verify      — operator completes it with the code
POST /api/v1/events             — client-side analytics event
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from campfinder.client_ip import client_ip, rate_key
from campfinder.database import get_supabase
from campfinder.models.operator import ClaimInitiate, CampSubmissionCreate, CampSubmissionResponse
from campfinder.services import claims

router = APIRouter()


# ── Operator: camp submission ──────────────────────────────────────────────

@router.post("/submissions", response_model=CampSubmissionResponse, summary="Submit a camp listing")
async def submit_camp(body: CampSubmissionCreate) -> CampSubmissionResponse:
    """
    Camp operators self-submit their listing.
    Creates a pending review entry. Team reviews before importing to camps table.
    """
    client = get_supabase()
    result = client.table("camp_submissions").insert({
        "name":               body.name,
        "city":               body.city,
        "state":              body.state.upper(),
        "zip":                body.zip,
        "camp_type":          body.camp_type,
        "website_url":        body.website_url,
        "email":              body.email,
        "phone":              body.phone,
        "contact_name":       body.contact_name,
        "contact_role":       body.contact_role,
        "age_min":            body.age_min,
        "age_max":            body.age_max,
        "description":        body.description,
        "primary_categories": body.primary_categories,
        "notes":              body.notes,
        "status":             "pending",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save submission")
    row = result.data[0]
    return CampSubmissionResponse(id=row["id"], name=row["name"], status=row["status"], created_at=row.get("created_at"))


# ── Operator: claim flow ───────────────────────────────────────────────────

@router.post("/claims", summary="Start a camp claim")
async def initiate_claim(body: ClaimInitiate, request: Request) -> dict[str, str]:
    """Sends a code only to an address the camp published; any other claim waits for a person.
    The answer is the same either way (services/claims.py)."""
    try:
        return await claims.start_claim(body.camp_id, body.email, body.contact_name, body.role,
                                        rate_key(client_ip(request)) or "unknown")
    except claims.ClaimError as e:
        raise HTTPException(status_code=e.status, detail=e.detail)


@router.get("/claims/verify", summary="Complete a camp claim with its code")
async def verify_claim(token: str = Query(..., max_length=200)) -> dict[str, str]:
    try:
        return claims.verify_claim(token)
    except claims.ClaimError as e:
        raise HTTPException(status_code=e.status, detail=e.detail)


# ── Analytics events ───────────────────────────────────────────────────────

@router.post("/events", summary="Track analytics event")
async def track_event(body: dict[str, Any]) -> dict[str, str]:
    """Lightweight event store for funnel analytics."""
    client = get_supabase()
    event = body.get("event", "")
    if not event:
        raise HTTPException(status_code=400, detail="event is required")

    client.table("analytics_events").insert({
        "event":      event,
        "session_id": body.get("session_id"),
        "page":       body.get("page"),
        "properties": body.get("properties"),
    }).execute()

    return {"ok": "1"}
