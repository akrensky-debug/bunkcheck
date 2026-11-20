"""POST /api/v1/search — Search camps by parent constraints."""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from campfinder.client_ip import client_ip, rate_key
from campfinder.limits import SlidingWindow

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


# A person taps "Use my location" a handful of times; a script walking a grid to map our towns
# would need thousands. Callers with no readable address share one bucket (fails closed).
nearest_per_ip = SlidingWindow(30, 600)


class Position(BaseModel):
    # Numbers only, finite, in range; nothing else in the body. Rounded to about 1 km on arrival,
    # whatever the caller sent, so nothing downstream ever holds a precise position.
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, strict=True)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class NearestPlace(BaseModel):
    location: str


@router.post(
    "/places/nearest", response_model=NearestPlace, summary="The town we know nearest a point",
    # The body is read by hand (_read_position); this only describes it in the API docs.
    openapi_extra={"requestBody": {"required": True, "content": {"application/json": {
        "schema": Position.model_json_schema()}}}},
)
async def places_nearest(request: Request) -> NearestPlace:
    """For "Use my location" on camp search. A POST, so the position stays out of request logs;
    nothing is stored, and the page searches the town that comes back."""
    if not nearest_per_ip.hit(rate_key(client_ip(request)) or "unknown"):
        raise HTTPException(status_code=429, detail="Too many location lookups from here. Type your town instead.",
                            headers={"Retry-After": "600"})
    pos = _read_position(await request.body())
    place = nearest_place(round(pos.lat, 2), round(pos.lng, 2))
    if place is None:
        raise NotFound("We don't have camps near you yet. Bunkcheck is in New England for now.")
    return NearestPlace(location=place)


def _no_constant(name: str) -> float:
    raise ValueError(name)


def _read_position(raw: bytes) -> Position:
    """The body, parsed here so NaN and Infinity are refused before validation, and so an error
    never repeats the caller's input (a position is the one thing we don't want echoed or logged)."""
    if len(raw) > 200:
        raise HTTPException(status_code=413, detail="Send just a latitude and a longitude.")
    try:
        return Position.model_validate(json.loads(raw, parse_constant=_no_constant))
    except (ValueError, ValidationError):
        raise HTTPException(status_code=422, detail="Send a latitude and a longitude as numbers.") from None
