"""
Parent reports, for the person who reads them (docs/parent-checks.md).

    python -m campfinder.checks inbox                        # what's waiting, oldest first
    python -m campfinder.checks show <id>
    python -m campfinder.checks fixed <id> --by NAME [--source URL]   # the parent was right; the listing is changed
    python -m campfinder.checks as-listed <id> --by NAME     # the camp's page agrees with us
    python -m campfinder.checks ask-camp <id> --by NAME      # can't tell; shows "checking with the camp"
    python -m campfinder.checks close <id> --by NAME --reason "..."   # not_a_fact, spam, duplicate

<id> is the report's id or the first characters of it, as the report email shows.

Read the camp's own page first. `fixed` doesn't change the listing: change it the way it's
changed today (the camp's file in data/camps/ and the import, or `owners spots`), then run
`fixed`, which refuses until the listed value differs from what the parent saw. It writes the
change log with the parent's words. --source is the camp's page you read; with it, the fact
becomes "checked by our team" against that page.

`ask-camp` sends nothing. The camp shows first in `python -m campfinder.owners queue`, and
writing to it is Andrew's call. `close --reason not_a_fact` also clears the parent's text.
"""

from __future__ import annotations

import argparse
import sys

from campfinder.checks.emails import report_lines
from campfinder.services import checks as service
from campfinder.services.errors import ServiceError


def _print(r: dict) -> None:
    print(f"{r['camp_name']}  ({r['status']}, {str(r['created_at'])[:10]})")
    print("\n".join(report_lines(r)))
    if r.get("handled_by"):
        why = f": {r['reason']}" if r.get("reason") else ""
        print(f"  {r['status']} by {r['handled_by']} on {str(r['handled_at'])[:10]}{why}")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m campfinder.checks", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("inbox")
    sub.add_parser("show").add_argument("report")
    for name in ("fixed", "as-listed", "ask-camp", "close"):
        s = sub.add_parser(name)
        s.add_argument("report")
        s.add_argument("--by", required=True, help="your name, for the record")
        if name == "fixed":
            s.add_argument("--source", help="the camp's own page you read")
        if name == "close":
            s.add_argument("--reason", required=True, help="not_a_fact, spam, duplicate, or a few words")
    args = p.parse_args(argv)
    try:
        if args.cmd == "inbox":
            rows = service.inbox()
            print(f"{len(rows)} waiting")
            for r in rows:
                print()
                _print(r)
            return 0
        if args.cmd == "show":
            row = service.get_report(args.report)
        elif args.cmd == "fixed":
            row = service.fixed(args.report, by=args.by, source_url=args.source)
        elif args.cmd == "as-listed":
            row = service.as_listed(args.report, by=args.by)
        elif args.cmd == "ask-camp":
            row = service.ask_camp(args.report, by=args.by)
        else:
            row = service.close(args.report, by=args.by, reason=args.reason)
    except ServiceError as e:
        print(e.detail, file=sys.stderr)
        return 1
    _print(row)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
