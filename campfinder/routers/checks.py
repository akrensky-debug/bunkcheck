"""
Parent checks: "still right" or "this is wrong" on a camp's facts. Public, no account
(docs/parent-checks.md). Not on the MCP server or the Activity API.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from campfinder.auth import optional_user
from campfinder.client_ip import client_ip, rate_key
from campfinder.database import get_supabase
from campfinder.models.checks import CampChecks, CheckSubmission, ReporterView
from campfinder.services import checks as service

router = APIRouter()


def _account_email(user_id: str | None) -> str | None:
    """The signed-in parent's address, which sign-in already proved."""
    if not user_id:
        return None
    try:
        return get_supabase().auth.admin.get_user_by_id(user_id).user.email
    except Exception:
        return None


@router.get("/camps/{camp}/checks", response_model=CampChecks,
            summary="The facts a parent can check, with how many parents say each is still right")
async def camp_checks(camp: str) -> CampChecks:
    return service.camp_checks(camp)


@router.post("/camps/{camp}/checks", status_code=202,
             summary="Still right, or this is wrong (a report goes to a person; nothing changes by itself)")
async def submit(camp: str, req: CheckSubmission, request: Request,
                 user_id: str | None = Depends(optional_user)) -> dict:
    try:
        # Callers with no readable address share one bucket: the limit fails closed, not open.
        service.check_ip(rate_key(client_ip(request)) or "unknown")
        await service.submit(camp, req.answers, email=req.email, token=req.token,
                             account_email=_account_email(user_id))
    except service.CheckError as e:
        raise HTTPException(status_code=e.status, detail=e.detail)
    # The same answer whether the address was new, known, confirmed or over a limit.
    return {"status": "received"}


@router.get("/checks/{token}", response_model=ReporterView,
            summary="The answers waiting on this link (changes nothing)")
async def view(token: str) -> ReporterView:
    return _run(service.view, token)


@router.post("/checks/{token}/confirm", response_model=ReporterView,
             summary="Prove the address: the answers listed now count")
async def confirm(token: str) -> ReporterView:
    return _run(service.confirm, token)


@router.post("/checks/{token}/stop", response_model=ReporterView,
             summary="Delete the address; proven answers stay without it")
async def stop(token: str) -> ReporterView:
    return _run(service.stop, token)


def _run(step, token: str) -> ReporterView:
    try:
        return step(token)
    except service.CheckError as e:
        raise HTTPException(status_code=e.status, detail=e.detail)
