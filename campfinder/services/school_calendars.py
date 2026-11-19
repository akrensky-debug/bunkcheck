"""
School calendars, entered and checked by hand: the last day of school and the first day of the
next year, which bound the summer. A school that isn't here gets guessed dates, marked as a guess.

Add an entry only from the school's own published calendar, with its URL and the day you
checked it. Leave first_day as None until the next year's calendar is out. Until then the end
of summer comes from this year's first day (prior_first_day, on the same calendar), moved
forward a year to the same weekday, and is shown as last year's date: the same way a camp's
sessions from last year stand in until the new ones are posted. Only with neither is it guessed.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

# A year on, same weekday: what camp sessions use too (agent.tools.LAST_YEAR).
NEXT_YEAR = timedelta(weeks=52)


@dataclass(frozen=True)
class SchoolCalendar:
    name: str
    aliases: tuple[str, ...]
    last_day: date
    first_day: date | None
    source_url: str
    checked_on: date
    # The first day of the school year this calendar covers, the fall before the summer. When
    # grades start on different days, the day the last of them starts: a kid who hasn't started
    # yet still needs care, so an earlier date would hide a week.
    prior_first_day: date | None = None

    def next_first_day(self) -> tuple[date | None, bool]:
        """Next fall's first day, and whether it is last year's date carried forward."""
        if self.first_day:
            return self.first_day, False
        if self.prior_first_day:
            return self.prior_first_day + NEXT_YEAR, True
        return None, False


CHECKED = date(2026, 10, 15)

# Summer 2027, Providence area. Last days from each school's own 2026-27 calendar. Public
# districts list a projected last day that moves later with snow days. No school has posted its
# 2027-28 first day yet, so the end of summer is last fall's first day carried forward
# (prior_first_day, read from the same calendars on 19 November 2026), or guessed where that
# calendar doesn't show it: Warwick (the page links only last year's), Lincoln and Achievement
# First (event widgets), Gordon ("the first Wednesday of September", no date). Not yet listed:
# Moses Brown (no last day published), Providence Country Day (divisions end on different days),
# Achievement First elementary and middle schools.
SCHOOLS: list[SchoolCalendar] = [
    SchoolCalendar("Providence Public Schools", ("Providence", "PPSD", "Providence schools"), date(2027, 6, 17), None,
                   "https://www.providenceschools.org/fs/resource-manager/view/78c0b98a-468f-4abf-9472-5aae56885cbc", CHECKED,
                   prior_first_day=date(2026, 8, 25)),  # "25 First Day of School" (August)
    SchoolCalendar("Cranston Public Schools", ("Cranston",), date(2027, 6, 15), None,
                   "https://4.files.edl.io/a29b/06/04/26/151101-8c8dadea-36b2-4af8-a145-5e3763e99e66.pdf", CHECKED,
                   prior_first_day=date(2026, 8, 28)),  # "8/27 First Day K, 1, 6, 9", "8/28 All Grades Report"
    SchoolCalendar("East Providence Schools", ("East Providence", "East Providence School Department", "EPSD"),
                   date(2027, 6, 22), None,
                   "https://files.smartsites.parentsquare.com/13906/2026-2027-school-calendar-approved-4-14-26_1.pdf", CHECKED,
                   prior_first_day=date(2026, 9, 4)),  # Most grades 9/2 to 9/3; "4- Kindergarten 1st Full Day"
    SchoolCalendar("Pawtucket Schools", ("Pawtucket", "Pawtucket School Department"), date(2027, 6, 18), None,
                   "https://www.psdri.net/wp-content/uploads/2026/04/2026-2027-School-Calendar-APPROVED-SC-April-28-2026.pdf",
                   CHECKED,
                   prior_first_day=date(2026, 8, 31)),  # "STUDENTS' FIRST DAY OF SCHOOL: AUGUST 31, 2026"
    SchoolCalendar("Warwick Public Schools", ("Warwick",), date(2027, 6, 16), None,
                   "https://www.warwickschools.org/page/calendar-and-schedules/", CHECKED),
    SchoolCalendar("Barrington Public Schools", ("Barrington",), date(2027, 6, 17), None,
                   "https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/995/Barrington_Schools/"
                   "3a20d914-a008-44c2-aa5d-a38e8fb9d21f/2026-2027--Calendar-draft-%283%29.pdf", CHECKED,
                   prior_first_day=date(2026, 8, 26)),  # "First day of school - August 26th" (calendar marked draft)
    SchoolCalendar("North Providence Schools", ("North Providence", "North Providence School Department"),
                   date(2027, 6, 18), None,
                   "https://nprovschools.org/wp-content/uploads/2026/06/UPDATED-2026-2027-School-Calendar.xlsx-Sheet1-3.pdf",
                   CHECKED,
                   prior_first_day=date(2026, 9, 1)),  # "August 31 ... (PK & 1 - 9)", "September 1 ... (10 - 12)"
    SchoolCalendar("Johnston Public Schools", ("Johnston",), date(2027, 6, 18), None,
                   "https://www.johnstonschools.org/school-calendar", CHECKED,
                   prior_first_day=date(2026, 8, 26)),  # "26 * First Day of School" (August), on the calendar image the page embeds
    SchoolCalendar("Wheeler School", ("Wheeler", "The Wheeler School"), date(2027, 6, 9), None,
                   "https://www.wheelerschool.org/wp-content/uploads/2025/12/2026-27-Major-Dates-Calendar-3.pdf", CHECKED,
                   prior_first_day=date(2026, 9, 1)),  # "Mon 31 Student Orientations", "Tue 1 8:00AM Classes begin"
    SchoolCalendar("Lincoln School", ("Lincoln School Providence",), date(2027, 6, 4), None,
                   "https://www.lincolnschool.org/calendar", CHECKED),
    SchoolCalendar("Gordon School", ("Gordon", "The Gordon School"), date(2027, 6, 9), None,
                   "https://www.gordonschool.org/family-hub/calendar", CHECKED),
    SchoolCalendar("Achievement First Providence High", ("AF Providence High",), date(2027, 6, 18), None,
                   "https://www.afprovidencehigh.org/about-us/calendar", CHECKED),
    SchoolCalendar("Paul Cuffee School", ("Paul Cuffee",), date(2027, 6, 14), None,
                   "https://www.paulcuffee.org/wp-content/uploads/2026/06/26-27-School-Calendar-ES.pdf", CHECKED,
                   prior_first_day=date(2026, 8, 27)),  # "27 First Day of School" (August)
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
