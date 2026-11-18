"""What a camp charges per week, and how to say it on a card.

A budget is per week, so only a weekly figure can be checked against it: `price_per_week`,
or the low end of a range the camp quotes per week. A price per session, per summer, or
with no unit is real but can't be compared, so search treats it as "no weekly price posted".
A camp that lists $0 is free, whatever the unit, and fits every budget.

Prices come from scraped listings, so nothing here trusts the row: text, negatives, NaN and
a swapped range all read as "not posted" or get put in order, never raise.
"""

from __future__ import annotations

import math
from typing import Any

NOT_POSTED = "Price not posted"
FREE = "Free"
_WEEK = {"week", "weekly", "per week", "wk", "/week", "/wk"}


def as_price(v: Any) -> float | None:
    """A usable price, or None. Supabase sends numeric columns as strings ("450.00")."""
    if v is None or isinstance(v, bool):
        return None
    try:
        n = float(str(v).replace("$", "").replace(",", "").strip())
    except ValueError:
        return None
    return n if math.isfinite(n) and n >= 0 else None


def _unit(camp: dict[str, Any]) -> str | None:
    u = str(camp.get("price_per") or "").strip().lower()
    return "week" if u in _WEEK else (u or None)


def _range(camp: dict[str, Any]) -> tuple[float | None, float | None]:
    lo, hi = as_price(camp.get("price_min")), as_price(camp.get("price_max"))
    if lo is not None and hi is not None and lo > hi:
        lo, hi = hi, lo
    return lo, hi


def weekly_price(camp: dict[str, Any]) -> float | None:
    """The lowest weekly price on file, or None when the camp hasn't posted one per week."""
    ppw = as_price(camp.get("price_per_week"))
    if ppw is not None:
        return ppw
    lo, hi = _range(camp)
    if lo == 0 and hi in (None, 0):
        return 0.0  # free, whatever the unit
    if _unit(camp) == "week":
        return lo if lo is not None else hi  # "up to $X a week" still fits a budget of $X
    return None


def _money(v: float) -> str:
    return f"${v:,.0f}"


def price_label(camp: dict[str, Any]) -> str:
    """The price as a parent should read it: '$350/week', '$900 to $1,200 per session', 'Free', 'Price not posted'."""
    if weekly_price(camp) == 0:
        return FREE
    ppw = as_price(camp.get("price_per_week"))
    if ppw is not None:
        return f"{_money(ppw)}/week"
    lo, hi = _range(camp)
    if lo is None and hi is None:
        return NOT_POSTED
    if lo is None:
        amount = f"up to {_money(hi)}"
    elif hi is None or hi == lo:
        amount = _money(lo)
    else:
        amount = f"{_money(lo)} to {_money(hi)}"
    unit = _unit(camp)
    if unit == "week":
        return f"{amount}/week"
    return f"{amount} per {unit}" if unit else f"{amount} (weekly price not posted)"
