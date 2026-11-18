"""What a camp charges per week, and how to say it on a card.

A budget is per week, so only a weekly figure can be checked against it: `price_per_week`,
or the low end of a range the camp quotes per week. A price per session, per summer, or
with no unit is real but can't be compared, so search treats it as "no weekly price posted".
"""

from __future__ import annotations

from typing import Any

NOT_POSTED = "Price not posted"


def _num(v: Any) -> float | None:
    return float(v) if v not in (None, "") else None


def weekly_price(camp: dict[str, Any]) -> float | None:
    """The lowest weekly price on file, or None when the camp hasn't posted one per week."""
    ppw = _num(camp.get("price_per_week"))
    if ppw is not None:
        return ppw
    if camp.get("price_per") == "week":
        return _num(camp.get("price_min"))
    return None


def _money(v: float) -> str:
    return f"${v:,.0f}"


def price_label(camp: dict[str, Any]) -> str:
    """The price as a parent should read it: '$350/week', '$900 to $1,200 per session', or 'Price not posted'."""
    ppw = _num(camp.get("price_per_week"))
    if ppw is not None:
        return f"{_money(ppw)}/week"
    lo, hi = _num(camp.get("price_min")), _num(camp.get("price_max"))
    if lo is None and hi is None:
        return NOT_POSTED
    amount = _money(lo) if hi is None or hi == lo else f"up to {_money(hi)}" if lo is None else f"{_money(lo)} to {_money(hi)}"
    unit = camp.get("price_per")
    if unit == "week":
        return f"{amount}/week"
    return f"{amount} per {unit}" if unit else f"{amount} (weekly price not posted)"
