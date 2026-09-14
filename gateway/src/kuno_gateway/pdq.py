"""Meta's PDQ perceptual image hash, in numpy (MODERATION.md, "Perceptual matching").

A port of the reference implementation in facebook/ThreatExchange (`pdq/python/pdqhashing/hasher/pdq_hasher.py`,
BSD licence, https://github.com/facebook/ThreatExchange/tree/main/pdq), algorithm described in
https://github.com/facebook/ThreatExchange/blob/main/hashing/hashing.pdf:

1. RGB to luma: Y = 0.299 R + 0.587 G + 0.114 B.
2. Two X/Y passes of a 1-D box filter (Jarosz), window ceil(dimension / 128) along each axis.
3. Decimate to 64x64 by sampling the filtered image at block centres.
4. Quality: a count of significant gradients in the 64x64 image, 0..100.
5. Slots 1..16 x 1..16 of the 64x64 DCT-II.
6. Bit k (k = row * 16 + column) is set when that coefficient is above the median of the 256.

Every floating-point operation happens in the reference's order (running sums, sequential DCT accumulation), so the
same luma buffer gives the same hash as the reference, bit for bit. Decoding and resizing images happens elsewhere
(perceptual.py); Meta notes that different decoders give slightly different hashes for the same file.

Matching (PDQ README): two hashes match at a Hamming distance of 31 or less; hashes with quality 49 or less are too
unreliable to match on (python-threatexchange `QUALITY_THRESHOLD = 50`).

This module never logs or stores image data.
"""

from __future__ import annotations

import math
import re
from collections.abc import Iterable
from dataclasses import dataclass

import numpy as np

HASH_BITS = 256
# PDQ README: "Distance Threshold to consider two hashes to be similar/matching: <=31".
MATCH_DISTANCE = 31
# PDQ README: "Quality Threshold where we recommend discarding hashes: <=49".
MIN_QUALITY = 50
# Both reference loaders shrink images larger than this before hashing.
DOWNSAMPLE_DIMS = 512

_HEX = re.compile(r"^[0-9a-f]{64}$")
_LUMA_R, _LUMA_G, _LUMA_B = 0.299, 0.587, 0.114
_WINDOW_DIVISOR = 128
_JAROSZ_PASSES = 2


def _dct_matrix() -> np.ndarray:
    scale = math.sqrt(2.0 / 64.0)
    d = np.empty((16, 64), dtype=np.float64)
    for i in range(16):
        for j in range(64):
            d[i, j] = scale * math.cos((math.pi / 2 / 64.0) * (i + 1) * (2 * j + 1))
    return d


_DCT = _dct_matrix()


@dataclass(frozen=True)
class PdqHash:
    """A 256-bit PDQ hash as Meta's 64-character hex (bit 0 is the last hex digit's lowest bit), and its quality."""

    hex: str
    quality: int

    def distance(self, other: PdqHash | str) -> int:
        return hamming(self.hex, other if isinstance(other, str) else other.hex)


def is_pdq_hex(value: str) -> bool:
    return bool(_HEX.match(value))


def hamming(a: str, b: str) -> int:
    return (int(a, 16) ^ int(b, 16)).bit_count()


# ------------------------------------------------------------------ hashing


def luma_from_rgb(rgb: np.ndarray) -> np.ndarray:
    """(rows, cols, 3+) uint8 RGB (extra channels such as alpha are ignored) to float64 luma."""
    rgb = np.asarray(rgb)
    if rgb.ndim != 3 or rgb.shape[2] < 3 or rgb.shape[0] < 1 or rgb.shape[1] < 1:
        raise ValueError("expected an image of shape (rows, cols, 3)")
    r, g, b = (rgb[..., c].astype(np.float64) for c in range(3))
    return _LUMA_R * r + _LUMA_G * g + _LUMA_B * b


def hash_rgb(rgb: np.ndarray) -> PdqHash:
    return hash_luma(luma_from_rgb(rgb))


def hash_luma(luma: np.ndarray) -> PdqHash:
    """PDQ of a (rows, cols) luma image, values 0..255."""
    image = np.array(luma, dtype=np.float64)
    if image.ndim != 2 or image.shape[0] < 1 or image.shape[1] < 1:
        raise ValueError("expected a (rows, cols) luma image")
    rows, cols = image.shape
    along_rows, along_cols = _window(cols), _window(rows)
    for _ in range(_JAROSZ_PASSES):
        image = _box_last_axis(image, along_rows)
        image = _box_last_axis(image.T, along_cols).T
    block = _decimate(image)
    quality = _quality(block)
    dct = _dct64_to_16(block)
    median = _torben([float(v) for v in dct.ravel()])
    value = 0
    for k, coefficient in enumerate(dct.ravel().tolist()):
        if coefficient > median:
            value |= 1 << k
    return PdqHash(hex=f"{value:064x}", quality=quality)


def _window(dimension: int) -> int:
    return (dimension + _WINDOW_DIVISOR - 1) // _WINDOW_DIVISOR


def _box_last_axis(x: np.ndarray, window: int) -> np.ndarray:
    """`box1DFloat` over every vector along the last axis at once, with the reference's running sums."""
    n = x.shape[-1]
    half = (window + 2) // 2
    out = np.empty_like(x)
    total = np.zeros(x.shape[:-1], dtype=np.float64)
    count = li = ri = oi = 0
    for _ in range(half - 1):  # phase 1: accumulate, no writes
        total += x[..., ri]
        count += 1
        ri += 1
    for _ in range(window - half + 1):  # phase 2: writes with a growing window
        total += x[..., ri]
        count += 1
        out[..., oi] = total / count
        ri += 1
        oi += 1
    for _ in range(n - window):  # phase 3: full window
        total += x[..., ri]
        total -= x[..., li]
        out[..., oi] = total / count
        li += 1
        ri += 1
        oi += 1
    for _ in range(half - 1):  # phase 4: a shrinking window
        total -= x[..., li]
        count -= 1
        out[..., oi] = total / count
        li += 1
        oi += 1
    return np.ascontiguousarray(out)


def _decimate(image: np.ndarray) -> np.ndarray:
    rows, cols = image.shape
    ri = [int(((i + 0.5) * rows) / 64) for i in range(64)]
    ci = [int(((j + 0.5) * cols) / 64) for j in range(64)]
    return image[np.ix_(ri, ci)]


def _quality(block: np.ndarray) -> int:
    vertical = np.abs(np.trunc(((block[:-1, :] - block[1:, :]) * 100) / 255)).sum()
    horizontal = np.abs(np.trunc(((block[:, :-1] - block[:, 1:]) * 100) / 255)).sum()
    return min(int(int(vertical + horizontal) / 90), 100)


def _dct64_to_16(block: np.ndarray) -> np.ndarray:
    """B = D A D^T for the 16x64 matrix D, accumulated in the reference's order."""
    t = np.zeros((16, 64), dtype=np.float64)
    for k in range(64):
        t += _DCT[:, k:k + 1] * block[k:k + 1, :]
    b = np.zeros((16, 16), dtype=np.float64)
    for k in range(64):
        b += t[:, k:k + 1] * _DCT[:, k][None, :]
    return b


def _torben(values: list[float]) -> float:
    """Torben's median, exactly as the reference computes it (the lower median of the 256 values)."""
    n = len(values)
    midn = (n + 1) // 2
    lo = hi = values[0]
    for v in values:
        lo, hi = min(lo, v), max(hi, v)
    while True:
        guess = (lo + hi) / 2
        less = greater = equal = 0
        max_lt, min_gt = lo, hi
        for v in values:
            if v < guess:
                less += 1
                if v > max_lt:
                    max_lt = v
            elif v > guess:
                greater += 1
                if v < min_gt:
                    min_gt = v
            else:
                equal += 1
        if less <= midn and greater <= midn:
            break
        if less > greater:
            hi = max_lt
        else:
            lo = min_gt
    if less >= midn:
        return max_lt
    if less + equal >= midn:
        return guess
    return min_gt


# ------------------------------------------------------------------ matching many at once


def hashes_to_words(hexes: Iterable[str]) -> np.ndarray:
    """Hashes as an (n, 4) uint64 array, for `nearest`."""
    rows = [[int(h[i:i + 16], 16) for i in range(0, 64, 16)] for h in hexes]
    return np.array(rows, dtype=np.uint64).reshape(-1, 4)


def nearest(query: str, table: np.ndarray) -> tuple[int, int] | None:
    """(index, distance) of the closest hash in a `hashes_to_words` table, or None when the table is empty."""
    if table.shape[0] == 0:
        return None
    distances = np.bitwise_count(table ^ hashes_to_words([query])).sum(axis=1, dtype=np.int64)
    index = int(np.argmin(distances))
    return index, int(distances[index])
