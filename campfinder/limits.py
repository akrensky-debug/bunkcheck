"""In-memory per-key limits: sliding windows for request rates, daily tallies for spend.

These live in one process and reset on deploy. That suits short windows (a minute, an hour),
where losing the count on a deploy costs little. Anything that must hold across deploys and
replicas, like the assistant's spend caps, is kept in Postgres instead (agent/budget.py).
"""

from __future__ import annotations

import time
from collections import deque
from typing import Callable

MAX_KEYS = 10_000


class SlidingWindow:
    """At most `limit` hits per key in any `seconds`-long window."""

    def __init__(self, limit: Callable[[], int] | int, seconds: float):
        self._limit = limit if callable(limit) else (lambda: limit)
        self.seconds = seconds
        self.windows: dict[str, deque[float]] = {}

    def hit(self, key: str) -> bool:
        """Count one hit for key. False, and nothing counted, if the key is over its limit."""
        now = time.monotonic()
        window = self.windows.setdefault(key, deque())
        while window and now - window[0] > self.seconds:
            window.popleft()
        if len(window) >= self._limit():
            return False
        window.append(now)
        if len(self.windows) > MAX_KEYS:  # drop idle keys so memory stays bounded
            for k in [k for k, w in self.windows.items() if not w or now - w[-1] > self.seconds]:
                del self.windows[k]
        return True

    def clear(self) -> None:
        self.windows.clear()


class DailyTally:
    """A running total per key that starts over when the day changes."""

    def __init__(self) -> None:
        self.totals: dict[str, tuple[str, int]] = {}

    def get(self, key: str, day: str) -> int:
        d, total = self.totals.get(key, (day, 0))
        return total if d == day else 0

    def add(self, key: str, day: str, amount: int) -> int:
        total = self.get(key, day) + amount
        self.totals[key] = (day, total)
        if len(self.totals) > MAX_KEYS:
            for k in [k for k, (d, _) in self.totals.items() if d != day]:
                del self.totals[k]
        return total

    def clear(self) -> None:
        self.totals.clear()
