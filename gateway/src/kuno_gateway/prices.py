"""TAO/USD from several exchanges at once.

A crypto top-up is credited in dollars, so the rate decides how much money arrives. One exchange
can be wrong, stale or manipulated for a moment, so the rate is the median of independent sources,
and crediting stops rather than guesses when too few answer or they disagree by more than a set
margin. Binance refuses some locations, so it isn't relied on.
"""

from __future__ import annotations

import statistics
import threading
import time
from collections.abc import Callable
from decimal import Decimal

import httpx

SOURCES: dict[str, tuple[str, Callable[[dict], Decimal]]] = {
    "kraken": (
        "https://api.kraken.com/0/public/Ticker?pair=TAOUSD",
        lambda d: Decimal(next(iter(d["result"].values()))["c"][0]),
    ),
    "coinbase": (
        "https://api.exchange.coinbase.com/products/TAO-USD/ticker",
        lambda d: Decimal(d["price"]),
    ),
    "coingecko": (
        "https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd",
        lambda d: Decimal(str(d["bittensor"]["usd"])),
    ),
}

MIN_SOURCES = 2


class PriceUnavailable(Exception):
    pass


def _fetch_json(url: str) -> dict:
    response = httpx.get(url, timeout=10.0, headers={"user-agent": "kunoworld-gateway"})
    response.raise_for_status()
    return response.json()


class TaoPriceOracle:
    def __init__(self, max_divergence: float = 0.02, ttl_s: float = 60.0, fetch: Callable[[str], dict] = _fetch_json):
        self.max_divergence = Decimal(str(max_divergence))
        self.ttl_s = ttl_s
        self._fetch = fetch
        self._cached: tuple[float, Decimal, str] | None = None
        self._lock = threading.Lock()

    def usd_per_tao(self, now: float | None = None) -> tuple[Decimal, str]:
        """The median TAO/USD rate and a description of the sources behind it."""
        now = time.time() if now is None else now
        with self._lock:
            if self._cached and now - self._cached[0] < self.ttl_s:
                return self._cached[1], self._cached[2]
        quotes: dict[str, Decimal] = {}
        for name, (url, parse) in SOURCES.items():
            try:
                value = parse(self._fetch(url))
            except Exception:  # one unreachable or malformed exchange just doesn't vote
                continue
            if value > 0:
                quotes[name] = value
        if len(quotes) < MIN_SOURCES:
            raise PriceUnavailable(f"Only {len(quotes)} TAO price source(s) answered; {MIN_SOURCES} are needed.")
        median = Decimal(statistics.median(quotes.values()))
        spread = (max(quotes.values()) - min(quotes.values())) / median
        if spread > self.max_divergence:
            raise PriceUnavailable(f"TAO price sources disagree by {spread:.2%}.")
        source = "median of " + ", ".join(f"{k} {v}" for k, v in sorted(quotes.items()))
        with self._lock:
            self._cached = (now, median, source)
        return median, source
