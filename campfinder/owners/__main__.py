"""
Owner confirmation, run by a person on the team.

    python -m campfinder.owners preview <camp> [--to EMAIL]   # print the email; records and sends nothing
    python -m campfinder.owners checked <camp> --by NAME      # you checked the listing against its sources
    python -m campfinder.owners send    <camp> --by NAME [--to EMAIL]
    python -m campfinder.owners status  <camp>                # emails sent, answers, and the change log
    python -m campfinder.owners spots   <camp> <session> <left> [--total N] --by NAME [--from-owner]
    python -m campfinder.owners queue                         # who to ask next, and why the rest aren't ready
    python -m campfinder.owners send-ready --by NAME [--limit N] [--yes]   # without --yes, only lists them

The season update ("your 2027 update"): add --update. No hand check needed first; the owner
is the checker for this email.

    python -m campfinder.owners preview <camp> --update [--to EMAIL]
    python -m campfinder.owners send    <camp> --update --by NAME [--to EMAIL]
    python -m campfinder.owners queue --update [--region "Providence, RI"]
    python -m campfinder.owners send-ready --update --by NAME [--limit N] [--yes]

`queue` starts with the January 1 number: Providence-area camps whose next-season facts the
owner confirmed.

Listing updates by email ("Week 3 is full"):

    python -m campfinder.owners receive --from EMAIL [--subject S] < email.txt   # read a pasted email
    python -m campfinder.owners inbox                          # emails waiting for a person
    python -m campfinder.owners apply  <message-id> --by NAME  # make the proposed changes, tell the owner
    python -m campfinder.owners reject <message-id> --by NAME --reason "..."

<camp> is the camp's id, its slug or its exact name. <session> is the session's id, exact
name or start date (YYYY-MM-DD). `spots` records spots left (0 marks the session full) and
writes it to the change log; --from-owner when the owner told you, so parents see who said it.
Email goes out only when EMAIL_MODE=resend and RESEND_API_KEY are set; otherwise
`send` records the email and prints the link for you to send by hand.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from campfinder.config import get_settings
from campfinder.owners import season, service, updates


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m campfinder.owners", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    for name in ("preview", "checked", "send", "status"):
        s = sub.add_parser(name)
        s.add_argument("camp", nargs="+" if name == "checked" else None)
        if name in ("checked", "send"):
            s.add_argument("--by", required=True, help="your name, for the change log")
        if name in ("preview", "send"):
            s.add_argument("--to", help="owner's email, if not the camp's contact")
            s.add_argument("--update", action="store_true", help="the season update email, not the listing one")
    s = sub.add_parser("spots")
    s.add_argument("camp")
    s.add_argument("session")
    s.add_argument("left", type=int, help="spots left; 0 means full")
    s.add_argument("--total", type=int, help="total spots, if known")
    s.add_argument("--by", required=True, help="your name, for the change log")
    s.add_argument("--from-owner", action="store_true", help="the camp owner gave this number")
    s = sub.add_parser("queue")
    s.add_argument("--update", action="store_true", help="who to send the season update to")
    s.add_argument("--region", default=season.PROVIDENCE, help="the area the January 1 number counts")
    s = sub.add_parser("send-ready")
    s.add_argument("--update", action="store_true", help="send the season update email")
    s.add_argument("--by", required=True, help="your name, for the change log")
    s.add_argument("--limit", type=int, default=10)
    s.add_argument("--yes", action="store_true", help="send; without it, only list who would be asked")
    s = sub.add_parser("receive", help="read an owner's email from stdin")
    s.add_argument("--from", dest="from_email", required=True)
    s.add_argument("--subject")
    sub.add_parser("inbox")
    s = sub.add_parser("apply")
    s.add_argument("message")
    s.add_argument("--by", required=True, help="your name, for the change log")
    s = sub.add_parser("reject")
    s.add_argument("message")
    s.add_argument("--by", required=True, help="your name, for the change log")
    s.add_argument("--reason", required=True)
    args = p.parse_args(argv)

    try:
        if args.cmd in ("receive", "inbox", "apply", "reject"):
            return _updates(args)
        if args.cmd in ("queue", "send-ready"):
            return _batch(args)
        if args.cmd == "checked":
            for ref in args.camp:
                camp = service.find_camp(ref)
                print(f"{camp['name']}: {service.mark_checked(camp, args.by)}")
            return 0
        camp = service.find_camp(args.camp)
        if args.cmd == "preview":
            prepared = season.prepare(camp, to=args.to) if args.update else service.prepare(camp, to=args.to)
            print(f"To: {prepared.email.to}\nSubject: {prepared.email.subject}\n\n{prepared.email.text}")
            print("\n(preview only: nothing recorded or sent; the link above will not work)")
        elif args.cmd == "spots":
            session = service.find_session(camp, args.session)
            row = service.set_spots(camp, session, args.left, total=args.total, actor=args.by,
                                    source="owner" if args.from_owner else "team")
            total = f" of {row['spots_total']}" if row.get("spots_total") is not None else ""
            print(f"{camp['name']}, {session.get('name') or session['start_date']}: {args.left}{total} left ({row['availability']})")
        elif args.cmd == "send":
            send = season.send if args.update else service.send
            prepared = asyncio.run(send(camp, sent_by=args.by, to=args.to))
            link = f"{get_settings().frontend_url.rstrip('/')}/owners/{'update' if args.update else 'confirm'}/{prepared.token}"
            print(f"Sent to {prepared.email.to}. If email isn't set up, send them this link yourself:\n{link}")
        else:
            print(f"{camp['name']} ({camp['verification_status']}, {'on' if camp.get('is_active', True) else 'off'} the site)")
            for c in service.confirmations_for(camp["id"]):
                what = f"{c.get('season_year')} update" if c.get("kind") == season.KIND else "listing"
                print(f"  {str(c['sent_at'])[:16]}  {what:<12} {c['status']:<10} to {c['email']} by {c['sent_by']}")
            for ch in service.changes_for(camp["id"], 20):
                print(f"  {str(ch['created_at'])[:16]}  {ch['field_name']}: {ch.get('old_value')} -> "
                      f"{ch.get('new_value')} ({ch['changed_by']}, {ch.get('actor') or '-'})")
    except service.ConfirmationError as e:
        print(e, file=sys.stderr)
        return 1
    return 0


def january_number(region: str) -> str:
    c = season.count(region)
    return (f"{region}: {c.owner_confirmed} of {c.live} live camps have {c.season} facts confirmed by the owner. "
            f"{c.shows_season} show {c.season} at all; {c.asked} asked and waiting; "
            f"{c.answered_without_dates} answered without dates.")


def _batch(args: argparse.Namespace) -> int:
    update = getattr(args, "update", False)
    q = season.queue() if update else service.queue()
    what = "the season update" if update else "the listing email"
    if args.cmd == "queue":
        print(january_number(args.region) + "\n")
        print(f"Ready to ask, {what} ({len(q.ready)}):")
        for camp, email in q.ready:
            print(f"  {camp['name']}  ->  {email}")
        print(f"Not ready ({len(q.waiting)}):")
        for camp, why in q.waiting:
            print(f"  {camp['name']}: {why}")
        return 0
    batch = q.ready[: args.limit]
    if not args.yes:
        for camp, email in batch:
            print(f"would ask {camp['name']}  ->  {email}")
        flag = " --update" if update else ""
        print(f"\n{len(batch)} of {len(q.ready)} ready. Preview any one with `preview <camp>{flag}`; add --yes to send.")
        return 0
    site = get_settings().frontend_url.rstrip("/")
    send, path = (season.send, "update") if update else (service.send, "confirm")
    for camp, _ in batch:
        prepared = asyncio.run(send(camp, sent_by=args.by))
        print(f"asked {camp['name']}  ->  {prepared.email.to}  ({site}/owners/{path}/{prepared.token})")
    return 0


def _show(m: dict) -> None:
    print(f"{m['id']}  {str(m.get('received_at') or '')[:16]}  {m['status']:<12} from {m['from_email']}"
          + (f"  ({m['reason']})" if m.get("reason") else ""))
    proposal = m.get("proposal") or {}
    for c in proposal.get("changes", []):
        left = f" {c['spots_left']}" if c.get("spots_left") is not None else ""
        print(f"    {c['change']}{left} for session {c['session_id']}: \"{c['quote']}\"")
    facts, quotes = proposal.get("season_facts") or {}, proposal.get("quotes") or {}
    for s in facts.get("sessions") or []:
        print(f"    {facts['season_year']} session: {s.get('name') or ''} {s['start_date']} to {s['end_date']}"
              + (f", ${s['price']}" if s.get("price") is not None else ""))
    if facts.get("price_per_week") is not None:
        print(f"    {facts['season_year']} price per week: ${facts['price_per_week']}  \"{quotes.get('price', '')}\"")
    if facts.get("registration_opens"):
        print(f"    registration opens {facts['registration_opens']} {facts.get('registration_time') or ''}"
              f"  \"{quotes.get('registration', '')}\"")
    if proposal.get("ask"):
        print(f"    will ask the owner to check {len(proposal['ask']['sessions'])} dates: {proposal['ask']['why']}")


def _updates(args: argparse.Namespace) -> int:
    if args.cmd == "receive":
        row = asyncio.run(updates.receive(args.from_email, sys.stdin.read(), subject=args.subject))
        _show(row)
    elif args.cmd == "inbox":
        rows = updates.inbox()
        for m in rows:
            _show(m)
        if not rows:
            print("Nothing waiting.")
    elif args.cmd == "apply":
        row = asyncio.run(updates.apply(args.message, handled_by=args.by))
        print(json.dumps(row["applied"], indent=2, default=str))
    else:
        _show(updates.reject(args.message, handled_by=args.by, reason=args.reason))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
