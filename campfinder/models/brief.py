"""Pydantic v2 models for the summer brief: what we know about a family's summer, and what to ask next."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from campfinder.models.coverage import AwayRange, WorkBlock

BriefField = Literal[
    "kids", "home", "school", "camp_weeks", "sleepaway", "care_hours", "interests",
    "weekly_budget", "max_drive_minutes", "booked_elsewhere",
]
Source = Literal["said", "looked_up", "guessed"]


class Kid(BaseModel):
    name: str | None = Field(default=None, description="First name or nickname only.")
    age: int | None = Field(
        default=None, ge=0, le=19,
        description="Age in years. If the parent gave only a grade, leave it unset: it's worked out from the grade.",
    )
    grade: int | None = Field(
        default=None, ge=-1, le=12,
        description="School grade this school year: -1 pre-K, 0 kindergarten, 1 to 12. A 'rising 4th grader' "
        "or a kid 'going into 4th' is in 3rd grade now, so 3.",
    )
    age_estimated: bool = Field(
        default=False,
        description="True when the age was worked out from the grade. Keep it as it is in the profile; set it "
        "false when the parent tells you the age.",
    )
    interests: list[str] = Field(default_factory=list)
    notes: str | None = Field(
        default=None,
        description="Friends, likes, dislikes, schedule needs. Never medical, allergy, medication or "
        "dietary details: those belong in the encrypted info kit, not here.",
    )


class BriefUpdate(BaseModel):
    """Facts about the family's summer. Only fields that are set are changed."""

    home_location: str | None = Field(default=None, description="'City, ST'.")
    kids: list[Kid] | None = Field(
        default=None, description="The full list of kids. Replaces the stored list, so include everyone."
    )
    school: str | None = Field(
        default=None, description="The kids' school or district, e.g. 'Providence Public Schools'. Used to look up summer dates."
    )
    summer_start: date | None = None
    summer_end: date | None = None
    weekly_budget: float | None = Field(default=None, ge=0, description="Per child, per week, in USD.")
    max_drive_minutes: int | None = Field(default=None, ge=0, le=180, description="Longest drive to camp, one way.")
    camp_weeks: list[date] | None = Field(
        default=None,
        description="The weeks the family wants camp, as the Monday of each week. Weeks left out need no camp "
        "(vacation, family, already sorted). Replaces the stored list, so include every week. Leave unset "
        "until the parent says which weeks; unset means every week of the summer.",
    )
    sleepaway: bool | None = Field(
        default=None,
        description="True if overnight (sleepaway) camp is an option, false for day camp only. Overnight camp "
        "means nights away from home, usually a week or more; day camp means home every night.",
    )
    booked_elsewhere: bool | None = Field(
        default=None, description="True if some weeks are already booked outside Bunkcheck."
    )
    needs: list[str] | None = Field(
        default=None,
        description="Household logistics, e.g. 'extended care until 5:30', 'no driving on Tuesdays'. Replaces the stored list.",
    )
    notes: str | None = Field(default=None, description="Anything else worth remembering. Replaces stored notes.")
    work_schedule: list[WorkBlock] | None = Field(
        default=None,
        description="When each parent works over the summer (days and hours), used to find the hours "
        "that need camp or care. Replaces the stored list, so include every parent.",
    )
    away: list[AwayRange] | None = Field(
        default=None,
        description="Vacations, travel and weeks a kid spends elsewhere (e.g. with grandparents). "
        "Replaces the stored list, so include every trip. An empty list means no weeks are sorted yet.",
    )


class Question(BaseModel):
    field: BriefField
    prompt: str
    help: str | None = None
    returning: bool = Field(default=False, description="Asked before and skipped or answered 'not sure'; back because it matters now.")


class Chip(BaseModel):
    """One answer, shown above the question; tapping it edits that answer."""

    field: BriefField
    label: str
    source: Source


class LaterItem(BaseModel):
    field: BriefField
    prompt: str
    why: Literal["skipped", "not_sure"]


class Brief(BaseModel):
    chips: list[Chip]
    next_question: Question | None
    finish_later: list[LaterItem] = Field(description="Skipped or 'not sure' questions, for a quiet 'Finish later' list.")
