"""
Inquiries on CampFinder itself: the parent's confirm page, the camp's answer page, the camp
page's "Ask this camp" form, and the inbound hook for camps' email replies.

Partners create inquiries through the Activity API (routers/activity.py) and assistants
through the send_inquiry tool; every one of them is confirmed here by the parent.

POST /api/v1/inquiries                          ask from a camp page (pending until confirmed)
GET  /api/v1/inquiries/link/{token}             the parent's page: preview, status, replies
POST /api/v1/inquiries/link/{token}/confirm     the parent's yes, with contact details if they choose
POST /api/v1/inquiries/link/{token}/cancel      the parent's no
GET  /api/v1/owners/inquiries/{token}           the camp's page: this inquiry and its inquiry list
POST /api/v1/owners/inquiries/{token}/reply     the camp's answer on the web
POST /api/v1/internal/inquiry-mail              a camp's email reply (INQUIRY_INBOUND_SECRET)
"""

from __future__ import annotations

import hmac
import os
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from campfinder.auth import authorize_family, optional_user
from campfinder.inquiries import service

router = APIRouter()


def _ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return forwarded or (request.client.host if request.client else None)


class AskCamp(BaseModel):
    program_id: UUID
    session_id: UUID | None = None
    question: str = Field(min_length=service.QUESTION_MIN, max_length=service.QUESTION_MAX)
    kit_share_token: str | None = Field(default=None, max_length=300)
    family_id: UUID | None = None


class Confirm(BaseModel):
    contact: service.Contact | None = Field(default=None, description="Only if the parent chose to share it.")
    family_id: UUID | None = Field(default=None, description="Keeps the inquiry with the family's data.")


class Reply(BaseModel):
    text: str = Field(min_length=1, max_length=service.MAX_REPLY_CHARS)


class InboundReply(BaseModel):
    to_email: str
    from_email: str
    text: str = Field(max_length=200_000)
    message_id: str | None = None


def _family(family_id: UUID | None, user_id: str | None) -> str | None:
    return str(authorize_family(family_id, user_id)["id"]) if family_id else None


@router.post("/inquiries", status_code=201, summary="Ask a camp a question (the parent confirms next)")
async def ask_camp(body: AskCamp, request: Request, user_id: str | None = Depends(optional_user)) -> dict:
    service.check_ip(_ip(request))
    created = service.create(
        program_id=str(body.program_id), session_id=str(body.session_id) if body.session_id else None,
        question=body.question, kit_token=body.kit_share_token, channel="site",
        family_id=_family(body.family_id, user_id),
    )
    return {**service.view_for_parent(created.confirm_token), "confirm_token": created.confirm_token}


@router.get("/inquiries/link/{token}", summary="The parent's view of an inquiry")
async def parent_view(token: str) -> dict:
    """Opening the link changes nothing (mail scanners and link previews open links)."""
    return service.view_for_parent(token)


@router.post("/inquiries/link/{token}/confirm", summary="The parent confirms: send it to the camp")
async def parent_confirm(token: str, body: Confirm, request: Request,
                         user_id: str | None = Depends(optional_user)) -> dict:
    service.check_ip(_ip(request))
    await service.confirm(token, contact=body.contact, family_id=_family(body.family_id, user_id))
    return service.view_for_parent(token)


@router.post("/inquiries/link/{token}/cancel", summary="The parent cancels: nothing is sent")
async def parent_cancel(token: str) -> dict:
    service.cancel(token)
    return service.view_for_parent(token)


@router.get("/owners/inquiries/{token}", summary="The camp's view of an inquiry and its inquiry list")
async def camp_view(token: str) -> dict:
    return service.view_for_camp(token)


@router.post("/owners/inquiries/{token}/reply", summary="The camp answers on the web")
async def camp_reply(token: str, body: Reply) -> dict:
    return await service.reply_on_web(token, body.text)


@router.post("/internal/inquiry-mail", include_in_schema=False)
async def inquiry_mail(body: InboundReply, x_inbound_secret: str | None = Header(default=None)) -> dict:
    """404 unless INQUIRY_INBOUND_SECRET is set and matches."""
    secret = os.environ.get("INQUIRY_INBOUND_SECRET", "")
    if not secret or not x_inbound_secret or not hmac.compare_digest(secret, x_inbound_secret):
        raise HTTPException(status_code=404, detail="Not found")
    outcome = await service.receive_reply_email(body.to_email, body.from_email, body.text, message_id=body.message_id)
    return {"outcome": outcome}
