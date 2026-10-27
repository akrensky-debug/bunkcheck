"""
Move a checked draft into the reviewed dataset.

    python -m campfinder.ingest.promote data/drafts/providence/<slug>.json --by NAME
    python -m campfinder.ingest.promote --ready data/drafts/providence --by NAME

Running it is the person's statement that they checked every field against the camp's page
(year one, every camp is hand-checked before it is published). The draft's review notes are
dropped, the source is marked checked by that person today, and the whole dataset must still
pass the validator, or nothing is written. `--ready` promotes every draft in a folder whose
first pass (review.first_pass, by Claude) marked it ready; running it is the person's statement
that they reviewed that first pass. Then import as usual:
`python -m campfinder.seed.import_real --check` and `--load`.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from typing import Any

from campfinder.seed.import_real import DATA_DIR, load_dataset, validate


def promote(draft_path: Path, *, by: str, today: date | None = None, data_dir: Path = DATA_DIR) -> dict[str, Any]:
    draft = json.loads(draft_path.read_text())
    metro_file = data_dir / f"{draft_path.parent.name}.json"
    if not metro_file.exists():
        raise ValueError(f"No dataset {metro_file} for this draft's folder")
    dataset = json.loads(metro_file.read_text())
    record = {k: v for k, v in draft.items() if k != "review"}
    when = (today or date.today()).isoformat()
    first = (draft.get("review") or {}).get("first_pass")
    how = (f"checked against this page by {first.get('by', 'Claude')} on {first.get('date')}, approved by {by}"
           if first else f"checked against this page by {by}")
    for s in record.get("sources") or []:
        s["checked"] = when
        s["note"] = f"Drafted by the listing tool, {how}"
    others = [(m, c) for m, c in load_dataset(data_dir)]
    errors = validate(others + [(dataset["metro"], record)])
    if errors:
        raise ValueError("Fix these in the draft first:\n  " + "\n  ".join(errors))
    dataset["camps"].append(record)
    dataset["checked"] = max(dataset.get("checked") or when, when)
    metro_file.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n")
    draft_path.unlink()
    return record


def ready_drafts(folder: Path) -> list[Path]:
    """Drafts in a folder whose first pass marked them ready."""
    out = []
    for f in sorted(folder.glob("*.json")):
        if f.name.startswith("_"):
            continue
        review = json.loads(f.read_text()).get("review") or {}
        if review.get("status") == "ready" and review.get("first_pass"):
            out.append(f)
    return out


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m campfinder.ingest.promote", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("drafts", nargs="*", type=Path)
    p.add_argument("--ready", type=Path, metavar="FOLDER",
                   help="promote every draft in FOLDER whose first pass marked it ready")
    p.add_argument("--by", required=True, help="your name: you checked every field against the page")
    args = p.parse_args(argv)
    paths = list(args.drafts)
    if args.ready:
        paths += ready_drafts(args.ready)
    if not paths:
        p.error("name drafts to promote, or a folder with --ready")
    failed = 0
    for path in paths:
        try:
            rec = promote(path, by=args.by)
            print(f"promoted {rec['slug']}")
        except (ValueError, OSError) as e:
            print(f"{path}: {e}", file=sys.stderr)
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
