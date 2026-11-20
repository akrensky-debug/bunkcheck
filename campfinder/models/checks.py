"""Pydantic v2 models for parent checks: "still right" or "this is wrong" on a camp's facts."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

Verdict = Literal["right", "wrong"]
Basis = Literal["registered", "camp_site", "camp_told_me", "other"]
SAYS_MAX = 280
MAX_ANSWERS = 40


class Answer(BaseModel):
    field: str = Field(max_length=40, description="One of the facts GET /camps/{id}/checks lists.")
    session_id: UUID | None = Field(default=None, description="Required when the fact is a session's.")
    verdict: Verdict
    says: str | None = Field(default=None, max_length=SAYS_MAX, description="What it is now. Only for 'wrong'.")
    basis: Basis | None = Field(default=None, description="How the parent knows.")
    evidence_url: str | None = Field(default=None, max_length=500)


class CheckSubmission(BaseModel):
    answers: list[Answer] = Field(min_length=1, max_length=MAX_ANSWERS)
    email: str | None = Field(default=None, max_length=254,
                              description="Needed for a 'still right'. Optional for a report.")
    token: str | None = Field(default=None, max_length=64,
                              description="The link token of an address that already confirmed, kept by its browser.")


class FactCheck(BaseModel):
    field: str
    label: str
    session_id: UUID | None = None
    session_name: str | None = None
    value: Any = Field(default=None, description="What the listing says now. Null: not in the listing.")
    shown: str = Field(description="The value as a parent reads it.")
    right_count: int = Field(default=0, description="Parents who say this value is still right. 0 until two agree.")
    latest_right: str | None = Field(default=None, description="The date of the newest of those answers.")
    checking: bool = Field(default=False, description="A person has looked at a report and is asking the camp.")


class CampChecks(BaseModel):
    camp_id: UUID
    facts: list[FactCheck]


class PendingAnswer(BaseModel):
    camp_name: str
    label: str
    session_name: str | None = None
    verdict: Verdict
    shown: str
    says: str | None = None


class ReporterView(BaseModel):
    status: Literal["pending", "on", "expired", "stopped"]
    email_hint: str | None = None
    answers: list[PendingAnswer] = []
