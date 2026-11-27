"""POST /api/v1/csp-report: the site's Content-Security-Policy reports (services/csp_reports.py)."""

from __future__ import annotations

from fastapi import APIRouter, Request, Response

from campfinder.services import csp_reports

router = APIRouter()


@router.post("/csp-report", status_code=204, include_in_schema=False)
async def csp_report(request: Request) -> Response:
    """Always 204: a browser doesn't retry a report, and a caller learns nothing from the answer."""
    body = await request.body()
    try:
        csp_reports.record(body[: csp_reports.MAX_BODY + 1])
    except Exception:
        csp_reports.log.exception("could not store a CSP report")
    return Response(status_code=204)
