"""Pydantic v2 models for the summer planner."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class PlanSessionInput(BaseModel):
    camp_id: UUID
    session_id: UUID


class PlanRequest(BaseModel):
    camp_sessions: list[PlanSessionInput]
    summer_start: date
    summer_end: date


class PlanWeekCamp(BaseModel):
    camp_id: UUID
    name: str
    session_id: UUID
    session_dates: str  # e.g. "Jun 9 - Jun 20"
    cost: float | None = None


class PlanWeek(BaseModel):
    week_of: date
    week_end: date
    status: str  # "covered", "gap", "overlap"
    camps: list[PlanWeekCamp] = []


class CostLine(BaseModel):
    """One line of the summer's cost: a camp's tuition, or one of its fees for the sessions chosen."""

    camp_id: UUID
    camp_name: str
    item: str
    amount: float
    unit_amount: float | None = None
    per: str | None = None
    count: int = 1
    required: bool = True
    note: str | None = None


class PlanResponse(BaseModel):
    weeks: list[PlanWeek]
    total_estimated_cost: float
    cost_breakdown: list[CostLine] = Field(default_factory=list, description="Tuition and each fee, camp by "
                                           "camp. Required lines add up to the total; optional ones don't.")
    weeks_covered: int
    weeks_total: int
    gaps: list[date]
    overlaps: list[date]
