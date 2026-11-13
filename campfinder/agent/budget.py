"""
What the family assistant may spend, and what it has spent.

Every chat message can run up to MAX_TURNS model calls, so the limits are on money, not only
on requests. Four caps, checked before a chat and again after every model call:

  everyone   AGENT_GLOBAL_DAILY_USD      all families together; when hit, the assistant pauses
                                         for the day and everything else keeps working
  family     AGENT_FAMILY_DAILY_USD      a family saved to an account
             AGENT_GUEST_DAILY_USD       a guest family (no sign-in), lower
  address    AGENT_GUEST_IP_DAILY_USD    all guest families from one IP, so making a new guest
                                         family doesn't buy a new allowance

The family and everyone totals are kept in Postgres (ai_spend_daily, migration 0019) so they
hold across deploys and replicas. The per-address total is in memory: it resets on deploy,
and the everyone cap backs it up. A day is a US Eastern day, so "tomorrow" means tomorrow
for the parents we serve.

Costs are estimates from the token counts the API returns, priced at list rates. When a
fallback model served the call, the dearer of the two prices is used, so the estimate errs
high. The Anthropic console's own spend limit is the hard backstop.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from campfinder.config import get_settings
from campfinder.database import get_supabase
from campfinder.limits import DailyTally

log = logging.getLogger(__name__)

try:
    from zoneinfo import ZoneInfo

    EASTERN: Any = ZoneInfo("America/New_York")
except Exception:  # no tz database on the host: Eastern Standard Time is close enough
    EASTERN = timezone(timedelta(hours=-5))

# US dollars per million tokens: input, output, cache write (5 minutes), cache read.
# List prices, November 2026.
PRICES: dict[str, tuple[float, float, float, float]] = {
    "claude-opus-5-5": (4.00, 20.00, 5.00, 0.20),
    "claude-opus-5": (5.00, 25.00, 6.25, 0.50),
    "claude-opus-4-8": (5.00, 25.00, 6.25, 0.50),
    "claude-opus-4-7": (5.00, 25.00, 6.25, 0.50),
    "claude-opus-4-6": (5.00, 25.00, 6.25, 0.50),
    "claude-sonnet-5-5": (2.00, 10.00, 2.50, 0.10),
    "claude-sonnet-5": (2.00, 10.00, 2.50, 0.20),
}
# A model we don't have a price for is charged like the dearest one we know of.
UNKNOWN_PRICE = (10.00, 50.00, 12.50, 1.00)
# A response with no usage at all is charged as if it wrote this many output tokens.
NO_USAGE_OUTPUT_TOKENS = 16_000

GUEST_LIMIT = ("You've used today's free assistant time. Sign in to keep going, or come back "
               "tomorrow. Search, your plan and your calendar still work.")
FAMILY_LIMIT = ("You've reached today's assistant limit. It resets tomorrow. Search, your plan "
                "and your calendar still work.")
GLOBAL_LIMIT = ("Bunkcheck's assistant has reached its limit for today and will be back tomorrow. "
                "Search, your plan and your calendar still work.")


class LimitReached(Exception):
    """A cap or rate limit was hit. status follows HTTP; detail is shown to the parent."""

    def __init__(self, detail: str, status: int = 429, retry_after: int | None = None):
        super().__init__(detail)
        self.detail, self.status, self.retry_after = detail, status, retry_after


def today() -> date:
    return datetime.now(EASTERN).date()


def micros(usd: float) -> int:
    return int(round(usd * 1_000_000))


def _price(model: str | None) -> tuple[float, float, float, float]:
    if model in PRICES:
        return PRICES[model]
    for name in sorted(PRICES, key=len, reverse=True):  # "claude-opus-5-5-fast" -> claude-opus-5-5
        if model and model.startswith(name):
            return PRICES[name]
    return UNKNOWN_PRICE


def cost_micros(usage: Any, model: str | None, primary: str | None = None) -> int:
    """Estimated cost of one model call in millionths of a dollar."""
    def n(field: str) -> int:
        return int(getattr(usage, field, 0) or 0) if usage is not None else 0

    if usage is None:
        tokens = (0, NO_USAGE_OUTPUT_TOKENS, 0, 0)
    else:
        tokens = (n("input_tokens"), n("output_tokens"), n("cache_creation_input_tokens"), n("cache_read_input_tokens"))
    # tokens x (dollars per million tokens) = millionths of a dollar
    costs = [sum(t * p for t, p in zip(tokens, _price(m))) for m in {model, primary or model}]
    return int(round(max(costs)))


# Guest spend per address, in memory (see the module docstring).
_guest_ip_spend = DailyTally()
_global_logged: set[str] = set()


class ChatBudget:
    """One chat message's spending: checked before it starts, charged after each model call."""

    def __init__(self, family_id: str, signed_in: bool, ip_key: str):
        self.family_id, self.signed_in, self.ip_key = family_id, signed_in, ip_key
        self.day = today().isoformat()
        self.stop_reason: str | None = None  # set when a cap is crossed mid-chat

    @property
    def family_cap(self) -> int:
        s = get_settings()
        return micros(s.agent_family_daily_usd if self.signed_in else s.agent_guest_daily_usd)

    def _totals(self, rpc: str, **extra: Any) -> tuple[int, int]:
        rows = get_supabase().rpc(rpc, {"p_day": self.day, "p_family_id": self.family_id, **extra}).execute().data
        row = rows[0] if rows else {}
        return int(row.get("family_micros") or 0), int(row.get("total_micros") or 0)

    def _over(self, family: int, total: int, ip: int) -> str | None:
        s = get_settings()
        if total >= micros(s.agent_global_daily_usd):
            if self.day not in _global_logged:
                _global_logged.add(self.day)
                log.error("assistant paused: everyone's spend today reached $%.2f (AGENT_GLOBAL_DAILY_USD)",
                          s.agent_global_daily_usd)
            return GLOBAL_LIMIT
        if family >= self.family_cap:
            return FAMILY_LIMIT if self.signed_in else GUEST_LIMIT
        if not self.signed_in and ip >= micros(s.agent_guest_ip_daily_usd):
            return GUEST_LIMIT
        return None

    def check(self) -> None:
        """Raise LimitReached if this family, this address or everyone is out for today."""
        family, total = self._totals("ai_spend_today")
        reason = self._over(family, total, _guest_ip_spend.get(self.ip_key, self.day))
        if reason:
            status = 503 if reason == GLOBAL_LIMIT else 429
            raise LimitReached(reason, status=status)

    def charge(self, usage: Any, model: str | None, primary: str | None = None) -> None:
        """Record one model call. Sets stop_reason when a cap is now crossed."""
        cost = cost_micros(usage, model, primary)
        ip = _guest_ip_spend.add(self.ip_key, self.day, cost) if not self.signed_in else 0
        try:
            family, total = self._totals("record_ai_spend", p_cost_micros=cost)
        except Exception:
            # Don't lose the parent's reply over bookkeeping; stop after this call instead.
            log.exception("could not record assistant spend for family %s", self.family_id)
            self.stop_reason = "Something went wrong on our side. Please try again in a minute."
            return
        self.stop_reason = self._over(family, total, ip)
