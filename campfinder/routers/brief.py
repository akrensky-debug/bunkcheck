"""The summer brief: the guided questions above the Summer Board (docs/summer-board.md)."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from campfinder.auth import authorize_family, optional_user
from campfinder.models.brief import Brief, BriefField, BriefUpdate
from campfinder.services import summer_brief
from campfinder.services.summer_brief import Context

router = APIRouter()


def _brief(profile: dict[str, Any], context: list[Context]) -> Brief:
    return summer_brief.build_brief(profile, date.today(), context)


@router.get("/families/{family_id}/brief", response_model=Brief, summary="What we know, and the next question")
async def get_brief(
    family_id: UUID,
    context: list[Context] = Query(default=[], description="What the parent is looking at: suggestions, prices."),
    user_id: str | None = Depends(optional_user),
) -> Brief:
    authorize_family(family_id, user_id)
    return summer_brief.get_brief(str(family_id), context=context)


@router.patch("/families/{family_id}/brief", response_model=Brief, summary="Answer a question or edit an answer")
async def answer(
    family_id: UUID, body: BriefUpdate,
    context: list[Context] = Query(default=[]),
    user_id: str | None = Depends(optional_user),
) -> Brief:
    authorize_family(family_id, user_id)
    return _brief(summer_brief.update_brief(str(family_id), body, "said"), context)


@router.post("/families/{family_id}/brief/{field}/skip", response_model=Brief, summary="Skip for now")
async def skip(
    family_id: UUID, field: BriefField,
    context: list[Context] = Query(default=[]),
    user_id: str | None = Depends(optional_user),
) -> Brief:
    """Moves on; the question waits in the Finish later list. Dates and hours get a default, marked as a guess."""
    authorize_family(family_id, user_id)
    return _brief(summer_brief.skip(str(family_id), field), context)


@router.post("/families/{family_id}/brief/{field}/not-sure", response_model=Brief, summary="Not sure yet")
async def not_sure(
    family_id: UUID, field: BriefField,
    context: list[Context] = Query(default=[]),
    user_id: str | None = Depends(optional_user),
) -> Brief:
    """Moves on with a default, and asks again only when the answer matters (registration season, prices, suggestions)."""
    authorize_family(family_id, user_id)
    return _brief(summer_brief.skip(str(family_id), field, not_sure=True), context)
