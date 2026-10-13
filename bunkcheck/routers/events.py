"""POST /api/v1/events: product analytics. Named events only, no identifying data."""

from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends

from bunkcheck.database import get_conn
from bunkcheck.models.booking import AnalyticsEvent
from bunkcheck.security import rate_limited

router = APIRouter()


@router.post("/events", status_code=202, summary="Track an event", dependencies=[Depends(rate_limited)])
async def track_event(body: AnalyticsEvent, conn: asyncpg.Connection = Depends(get_conn)) -> dict[str, str]:
    await conn.execute(
        "INSERT INTO analytics_events (event, session_id, page, properties) VALUES ($1, $2, $3, $4)",
        body.event, body.session_id, body.page, body.properties,
    )
    return {"status": "accepted"}
