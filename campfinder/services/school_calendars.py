"""
School calendars, entered and checked by hand: the last day of school and the first day of the
next year, which bound the summer. A school that isn't here gets guessed dates, marked as a guess.

Add an entry only from the school's own published calendar, with its URL and the day you
checked it. Leave first_day as None until the next year's calendar is out; the summer brief
then guesses the end of summer.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class SchoolCalendar:
    name: str
    aliases: tuple[str, ...]
    last_day: date
    first_day: date | None
    source_url: str
    checked_on: date


# Summer 2027, Providence area. Empty until checked by hand (docs/summer-board.md lists the first 15).
SCHOOLS: list[SchoolCalendar] = []


def _norm(s: str) -> str:
    return " ".join(s.lower().replace("-", " ").split())


def find_school(name: str, year: int, schools: list[SchoolCalendar] | None = None) -> SchoolCalendar | None:
    """The calendar whose summer falls in `year`, matched on name or alias, ignoring case."""
    key = _norm(name)
    for s in SCHOOLS if schools is None else schools:
        if s.last_day.year == year and key in {_norm(s.name), *(_norm(a) for a in s.aliases)}:
            return s
    return None
