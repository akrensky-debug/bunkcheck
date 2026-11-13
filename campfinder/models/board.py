"""Pydantic v2 models for the Summer Board: kids x weeks, with the shortlist in each week."""

from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from campfinder.models.coverage import CoverageOption

PickState = Literal["idea", "chosen", "backup"]
CellState = Literal["open", "ideas", "chosen", "registered", "waitlisted", "covered", "away", "not_needed"]
MAX_IDEAS = 3


class Pick(BaseModel):
    id: UUID
    camp_id: UUID
    session_id: UUID | None = None
    name: str
    city: str | None = None
    price_per_week: float | None = None
    start_date: date | None = None
    end_date: date | None = None
    last_season: bool = Field(default=False, description="Its dates and price are last season's; new ones not posted.")
    state: PickState
    note: str | None = None


class Cell(BaseModel):
    week_of: date
    state: CellState
    label: str | None = Field(default=None, description="What covers the week: a camp, a trip, or nothing yet.")
    hours: Literal["ok", "check", "short"] | None = Field(
        default=None, description="Does the week's camp cover the care hours? 'check' when we don't know its hours."
    )
    hours_note: str | None = None
    picks: list[Pick] = []
    options: list[CoverageOption] = Field(default=[], description="Camps near home with a session this week.")


class KidRow(BaseModel):
    name: str
    age: int | None = None
    planned: int = Field(description="Weeks with a camp chosen, registered, on the calendar, or away.")
    weeks_needed: int = Field(description="Weeks that need care at all.")
    cost: float = Field(description="Chosen and registered camps, per the listed price.")
    cells: list[Cell]


class Week(BaseModel):
    week_of: date
    week_end: date


class Board(BaseModel):
    ready: bool = Field(description="False until we know the kids' names and the summer dates.")
    summer_start: date | None = None
    summer_end: date | None = None
    weeks: list[Week] = []
    kids: list[KidRow] = []
    planned: int = 0
    weeks_needed: int = 0
    cost: float = 0
    start_with: date | None = Field(default=None, description="The open week to plan next.")
    notes: list[str] = []


class PickCreate(BaseModel):
    child_name: str = Field(min_length=1, max_length=60)
    week_of: date = Field(description="Any day in the week; stored as its Monday.")
    camp_id: UUID
    session_id: UUID | None = None
    state: PickState = "idea"
    note: str | None = Field(default=None, max_length=500)


class PickUpdate(BaseModel):
    state: PickState | None = None
    note: str | None = Field(default=None, max_length=500)
