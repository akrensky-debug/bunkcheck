"""POST /api/v1/search — Search camps by parent constraints."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from campfinder.models.search import SearchRequest, SearchResponse
from campfinder.services.errors import NotFound
from campfinder.services.geo import nearest_place
from campfinder.services.search import run_search

router = APIRouter()


@router.post("/search", response_model=SearchResponse, summary="Search camps")
async def search(req: SearchRequest) -> SearchResponse:
    """
    Search camps by location and optional filters.
    Results are scored and ranked with match_reasons explaining each result.
    """
    return await run_search(req)


class Position(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class NearestPlace(BaseModel):
    location: str


@router.post("/places/nearest", response_model=NearestPlace, summary="The town we know nearest a point")
async def places_nearest(pos: Position) -> NearestPlace:
    """For "Use my location" on camp search. A POST, so the position stays out of request logs;
    nothing is stored, and the page searches the town that comes back."""
    place = nearest_place(pos.lat, pos.lng)
    if place is None:
        raise NotFound("We don't have camps near you yet. Bunkcheck is in New England for now.")
    return NearestPlace(location=place)
