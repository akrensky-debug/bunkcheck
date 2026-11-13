"""
Which summer a listing's dates and prices belong to.

Most camps post next summer's dates in winter, so from July until then the newest facts we
have are last season's. They are still useful (a camp's weeks and price rarely move much), but
a parent must never mistake them for this season's. Everything that shows a date or a price
says which season it is from.
"""

from __future__ import annotations

from datetime import date


def planning_year(today: date | None = None) -> int:
    """The summer parents are planning: this year until July, then next year."""
    today = today or date.today()
    return today.year if today.month < 7 else today.year + 1


def is_last_season(year: int | None, today: date | None = None) -> bool:
    """True when the year's dates and prices are older than the summer being planned."""
    return year is not None and year < planning_year(today)


def season_note(year: int | None, today: date | None = None) -> str | None:
    """One line for a parent, or None when the dates are current (or there are none)."""
    if not is_last_season(year, today):
        return None
    return f"Dates and prices are from the {year} season. {planning_year(today)} details aren't posted yet."
