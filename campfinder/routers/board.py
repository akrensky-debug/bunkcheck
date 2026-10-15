"""The Summer Board: kids x weeks, and the shortlist in each week (docs/summer-board.md)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from campfinder.auth import family_access, optional_user
from campfinder.models.board import Board, PickCreate, PickUpdate
from campfinder.services import summer_board
from campfinder.services.errors import ServiceError

router = APIRouter()


def _member_id(family_id: UUID, user_id: str | None) -> str | None:
    access = family_access(family_id, user_id)  # owner and co-parents
    return str(access.member["id"]) if access.member else None


@router.get("/families/{family_id}/board", response_model=Board, summary="The Summer Board")
async def get_board(family_id: UUID, user_id: str | None = Depends(optional_user)) -> Board:
    _member_id(family_id, user_id)
    return await summer_board.build_board(str(family_id))


@router.post("/families/{family_id}/picks", response_model=Board, summary="Add a camp to a week")
async def add_pick(family_id: UUID, body: PickCreate, user_id: str | None = Depends(optional_user)) -> Board:
    added_by = _member_id(family_id, user_id)
    try:
        summer_board.add_pick(str(family_id), body, added_by)
    except ServiceError as e:
        if type(e) is not ServiceError:
            raise
        raise HTTPException(status_code=422, detail=e.detail) from e
    return await summer_board.build_board(str(family_id))


@router.patch("/families/{family_id}/picks/{pick_id}", response_model=Board, summary="Choose, shortlist or note a pick")
async def update_pick(family_id: UUID, pick_id: UUID, body: PickUpdate,
                      user_id: str | None = Depends(optional_user)) -> Board:
    _member_id(family_id, user_id)
    summer_board.update_pick(str(family_id), pick_id, body)
    return await summer_board.build_board(str(family_id))


@router.delete("/families/{family_id}/picks/{pick_id}", response_model=Board, summary="Take a camp off a week")
async def remove_pick(family_id: UUID, pick_id: UUID, user_id: str | None = Depends(optional_user)) -> Board:
    _member_id(family_id, user_id)
    summer_board.remove_pick(str(family_id), pick_id)
    return await summer_board.build_board(str(family_id))
