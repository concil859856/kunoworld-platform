"""A small in-memory rate limiter.

The gateway runs as a single process today, so a per-process sliding window is exact. When it
runs as several processes this has to move to shared storage; callers only use `allow`.
"""

from __future__ import annotations

import threading
import time
from collections import deque


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window_s: float, now: float | None = None) -> bool:
        """Records a hit for `key` and says whether it is within `limit` hits per `window_s`.

        A refused attempt is not recorded, so someone hammering a limit can't extend it forever.
        """
        now = time.monotonic() if now is None else now
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= now - window_s:
                hits.popleft()
            if len(hits) >= limit:
                return False
            hits.append(now)
            return True

    def prune(self, max_window_s: float, now: float | None = None) -> None:
        """Forgets keys with no hits inside the longest window in use, so memory stays bounded."""
        now = time.monotonic() if now is None else now
        with self._lock:
            stale = [key for key, hits in self._hits.items() if not hits or hits[-1] <= now - max_window_s]
            for key in stale:
                del self._hits[key]

    def __len__(self) -> int:
        with self._lock:
            return len(self._hits)


class DatabaseRateLimiter:
    """Fixed-window counters in the shared database, for several gateway processes behind one limit.

    Unlike the in-memory limiter, a refused attempt still counts toward its window; the window resets
    on its own, so the effect is the same for a client that backs off.
    """

    def __init__(self, session_factory) -> None:
        self._session = session_factory

    def allow(self, key: str, limit: int, window_s: float, now: float | None = None) -> bool:
        from sqlalchemy.exc import IntegrityError

        from .db import RateLimitCounter

        now = time.time() if now is None else now
        window = int(now // window_s)
        for _ in range(3):
            try:
                with self._session() as s, s.begin():
                    row = s.get(RateLimitCounter, (key, window), with_for_update=True)
                    if row is None:
                        s.add(RateLimitCounter(key=key, window=window, count=1, expires_at=(window + 1) * window_s))
                        return True
                    if row.count >= limit:
                        return False
                    row.count += 1
                    return True
            except IntegrityError:
                # Another process created this window's counter first; count against it instead.
                continue
        return False

    def prune(self, max_window_s: float, now: float | None = None) -> None:
        from sqlalchemy import delete

        from .db import RateLimitCounter

        now = time.time() if now is None else now
        with self._session() as s, s.begin():
            s.execute(delete(RateLimitCounter).where(RateLimitCounter.expires_at < now))
