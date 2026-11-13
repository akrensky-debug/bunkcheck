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


CHECKED = date(2026, 10, 15)

# Summer 2027, Providence area. Last days from each school's own 2026-27 calendar. Public
# districts list a projected last day that moves later with snow days. No school has posted its
# 2027-28 first day yet, so the end of summer is guessed. Not yet listed: Moses Brown (no last day
# published), Providence Country Day (divisions end on different days), Achievement First
# elementary and middle schools.
SCHOOLS: list[SchoolCalendar] = [
    SchoolCalendar("Providence Public Schools", ("Providence", "PPSD", "Providence schools"), date(2027, 6, 17), None,
                   "https://www.providenceschools.org/fs/resource-manager/view/78c0b98a-468f-4abf-9472-5aae56885cbc", CHECKED),
    SchoolCalendar("Cranston Public Schools", ("Cranston",), date(2027, 6, 15), None,
                   "https://4.files.edl.io/a29b/06/04/26/151101-8c8dadea-36b2-4af8-a145-5e3763e99e66.pdf", CHECKED),
    SchoolCalendar("East Providence Schools", ("East Providence", "East Providence School Department", "EPSD"),
                   date(2027, 6, 22), None,
                   "https://files.smartsites.parentsquare.com/13906/2026-2027-school-calendar-approved-4-14-26_1.pdf", CHECKED),
    SchoolCalendar("Pawtucket Schools", ("Pawtucket", "Pawtucket School Department"), date(2027, 6, 18), None,
                   "https://www.psdri.net/wp-content/uploads/2026/04/2026-2027-School-Calendar-APPROVED-SC-April-28-2026.pdf",
                   CHECKED),
    SchoolCalendar("Warwick Public Schools", ("Warwick",), date(2027, 6, 16), None,
                   "https://www.warwickschools.org/page/calendar-and-schedules/", CHECKED),
    SchoolCalendar("Barrington Public Schools", ("Barrington",), date(2027, 6, 17), None,
                   "https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/995/Barrington_Schools/"
                   "3a20d914-a008-44c2-aa5d-a38e8fb9d21f/2026-2027--Calendar-draft-%283%29.pdf", CHECKED),
    SchoolCalendar("North Providence Schools", ("North Providence", "North Providence School Department"),
                   date(2027, 6, 18), None,
                   "https://nprovschools.org/wp-content/uploads/2026/06/UPDATED-2026-2027-School-Calendar.xlsx-Sheet1-3.pdf",
                   CHECKED),
    SchoolCalendar("Johnston Public Schools", ("Johnston",), date(2027, 6, 18), None,
                   "https://www.johnstonschools.org/school-calendar", CHECKED),
    SchoolCalendar("Wheeler School", ("Wheeler", "The Wheeler School"), date(2027, 6, 9), None,
                   "https://www.wheelerschool.org/wp-content/uploads/2025/12/2026-27-Major-Dates-Calendar-3.pdf", CHECKED),
    SchoolCalendar("Lincoln School", ("Lincoln School Providence",), date(2027, 6, 4), None,
                   "https://www.lincolnschool.org/calendar", CHECKED),
    SchoolCalendar("Gordon School", ("Gordon", "The Gordon School"), date(2027, 6, 9), None,
                   "https://www.gordonschool.org/family-hub/calendar", CHECKED),
    SchoolCalendar("Achievement First Providence High", ("AF Providence High",), date(2027, 6, 18), None,
                   "https://www.afprovidencehigh.org/about-us/calendar", CHECKED),
    SchoolCalendar("Paul Cuffee School", ("Paul Cuffee",), date(2027, 6, 14), None,
                   "https://www.paulcuffee.org/wp-content/uploads/2026/06/26-27-School-Calendar-ES.pdf", CHECKED),
]


def school_names(year: int) -> list[str]:
    return sorted(s.name for s in SCHOOLS if s.last_day.year == year)


def _norm(s: str) -> str:
    return " ".join(s.lower().replace("-", " ").split())


def find_school(name: str, year: int, schools: list[SchoolCalendar] | None = None) -> SchoolCalendar | None:
    """The calendar whose summer falls in `year`, matched on name or alias, ignoring case."""
    key = _norm(name)
    for s in SCHOOLS if schools is None else schools:
        if s.last_day.year == year and key in {_norm(s.name), *(_norm(a) for a in s.aliases)}:
            return s
    return None
