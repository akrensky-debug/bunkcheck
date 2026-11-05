"""
Fill draft gaps that have exactly one right answer, and say so in the draft.

    python -m campfinder.ingest.fill data/drafts/<metro>

- zip: looked up from the street address with the US Census geocoder, only when it returns a
  single match. The lookup is recorded as the zip's source.
- zip, with no street address: when the town sits inside one ZIP code
  (campfinder/seed/town_zips.json, from the 2020 Census; scripts/build_town_zips.py).
- state: when the town is in cities.py under one state only.

Everything else (season year without dates, town, camp type, zip for a town with several ZIP
codes) needs a person. Each fill is listed first in the draft's review warnings.
"""

from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
from datetime import date
from functools import cache
from pathlib import Path
from typing import Any, Callable

from campfinder.ingest.batch import write_summary
from campfinder.seed.cities import CITY_COORDS
from campfinder.seed.import_real import validate

CENSUS = "https://geocoding.geo.census.gov/geocoder/locations/address"
TOWN_ZIPS = Path(__file__).resolve().parent.parent / "seed" / "town_zips.json"
Lookup = Callable[[str], list[dict[str, Any]]]


def census_lookup(url: str) -> list[dict[str, Any]]:
    with urllib.request.urlopen(url, timeout=30) as r:  # noqa: S310 - fixed https host
        return json.load(r)["result"]["addressMatches"]


@cache
def town_zips() -> dict[str, str]:
    return json.loads(TOWN_ZIPS.read_text())


def fill_draft(d: dict[str, Any], *, metro: str, today: date, lookup: Lookup = census_lookup) -> list[str]:
    """Fill what has one right answer. Returns the notes added (empty if nothing changed)."""
    notes: list[str] = []
    if not d.get("state") and d.get("city"):
        states = {s for (c, s) in CITY_COORDS if c == d["city"].strip().lower()}
        if len(states) == 1:
            d["state"] = states.pop()
            d["sources"][0]["fields"].append("state")
            notes.append(f"Filled state {d['state']}: {d['city']} is in our town list under that state only")
    if not d.get("zip") and d.get("street_address") and d.get("city") and d.get("state"):
        url = CENSUS + "?" + urllib.parse.urlencode({
            "street": d["street_address"], "city": d["city"], "state": d["state"],
            "benchmark": "Public_AR_Current", "format": "json"})
        try:
            matches = lookup(url)
        except Exception:  # noqa: BLE001 - a failed lookup leaves the gap for a person
            matches = []
        zips = {m["addressComponents"]["zip"] for m in matches}
        if len(zips) == 1:
            d["zip"] = zips.pop()
            d["sources"].append({"url": url, "checked": today.isoformat(), "fields": ["zip"],
                                 "note": f"ZIP from the US Census geocoder for {matches[0]['matchedAddress']}"})
            notes.append(f"Filled zip {d['zip']} from the US Census geocoder ({matches[0]['matchedAddress']})")
    if not d.get("zip") and not d.get("street_address") and d.get("city") and d.get("state"):
        zip_ = town_zips().get(f"{d['city'].strip().lower()}|{d['state']}")
        if zip_:
            d["zip"] = zip_
            d["sources"].append({"url": "https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html",
                                 "checked": today.isoformat(), "fields": ["zip"],
                                 "note": f"{d['city']}, {d['state']} sits inside one ZIP code (2020 Census ZCTA relationship file)"})
            notes.append(f"Filled zip {zip_}: {d['city']} has one ZIP code (2020 Census)")
    if notes:
        d["review"]["warnings"] = notes + d["review"]["warnings"]
        record = {k: v for k, v in d.items() if k != "review"}
        d["review"]["errors"] = [e.split(": ", 1)[-1] for e in validate([(metro, record)])]
    return notes


def fill_folder(folder: Path, *, metro: str, today: date | None = None, lookup: Lookup = census_lookup) -> int:
    filled = 0
    for f in sorted(folder.glob("*.json")):
        if f.name.startswith("_"):
            continue
        d = json.loads(f.read_text())
        if fill_draft(d, metro=metro, today=today or date.today(), lookup=lookup):
            f.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
            filled += 1
    log = folder / "_log.json"
    write_summary(folder, json.loads(log.read_text()) if log.exists() else [])
    return filled


def main(argv: list[str] | None = None) -> int:
    from campfinder.seed.import_real import DATA_DIR
    p = argparse.ArgumentParser(prog="python -m campfinder.ingest.fill", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("folder", type=Path, help="data/drafts/<metro>")
    args = p.parse_args(argv)
    metro = json.loads((DATA_DIR / f"{args.folder.name}.json").read_text())["metro"]
    print(f"filled {fill_folder(args.folder, metro=metro)} drafts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
