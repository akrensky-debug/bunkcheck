"""
The hand-raiser page's one endpoint. Public, no account. Not on the MCP server or the Activity
API: it takes a parent's email, which is used only to tell her when Bunkcheck opens near her.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from campfinder.client_ip import client_ip, rate_key
from campfinder.services import hand_raisers as service

router = APIRouter()


class HandRaise(BaseModel):
    email: str = Field(max_length=254)
    town: str | None = Field(default=None, max_length=200)
    kids_ages: list[int] | None = Field(default=None, max_length=20)


@router.post("/hand-raisers", status_code=202, summary="Tell me when Bunkcheck opens near me")
async def raise_hand(req: HandRaise, request: Request) -> dict:
    try:
        # Callers with no readable address share one bucket: the limit fails closed, not open.
        service.check_ip(rate_key(client_ip(request)) or "unknown")
        service.raise_hand(req.email, req.town, req.kids_ages)
    except service.HandRaiserError as e:
        raise HTTPException(status_code=e.status, detail=e.detail)
    # The same answer whether the address is new or already on the list.
    return {"status": "ok"}
