"""
Build campfinder/seed/town_zips.json: New England towns that sit inside one ZIP code.

    curl -O https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_cousub20_natl.txt
    python scripts/build_town_zips.py tab20_zcta520_cousub20_natl.txt

Source: the 2020 Census ZCTA to county subdivision relationship file. A town is kept when one
ZCTA covers at least 99% of its land, and its name is unique in its state. The fill step
(campfinder/ingest/fill.py) uses it for a draft with a town but no street address.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

STATES = {"09": "CT", "23": "ME", "25": "MA", "33": "NH", "44": "RI", "50": "VT"}
SUFFIX = re.compile(r" (town|city|Town city|plantation|gore|grant|location|purchase)$")
OUT = Path(__file__).resolve().parent.parent / "campfinder" / "seed" / "town_zips.json"


def build(path: Path) -> dict[str, str]:
    parts: dict[str, list[tuple[str, int]]] = defaultdict(list)
    towns: dict[str, tuple[str, int]] = {}
    with path.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh, delimiter="|"):
            geoid = r["GEOID_COUSUB_20"]
            if geoid[:2] not in STATES or not r["GEOID_ZCTA5_20"]:
                continue
            name = SUFFIX.sub("", r["NAMELSAD_COUSUB_20"]).lower()
            towns[geoid] = (f"{name}|{STATES[geoid[:2]]}", int(r["AREALAND_COUSUB_20"]))
            parts[geoid].append((r["GEOID_ZCTA5_20"], int(r["AREALAND_PART"])))
    names = Counter(key for key, _ in towns.values())
    out = {}
    for geoid, (key, land) in towns.items():
        if names[key] > 1 or not land:
            continue
        zcta, area = max(parts[geoid], key=lambda p: p[1])
        if area / land >= 0.99:
            out[key] = zcta
    return dict(sorted(out.items()))


if __name__ == "__main__":
    zips = build(Path(sys.argv[1]))
    OUT.write_text(json.dumps(zips, indent=0) + "\n")
    print(f"{len(zips)} towns with one ZIP -> {OUT}")
