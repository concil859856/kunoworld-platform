"""Known-content matching for Standard content: uploads before they are stored, and finished videos before they are
kept (output_scan.py).

Content runs through an `UploadScanner`, a list of `Matcher`s; the first match wins. What ships here:

* an exact SHA-256 list (`KUNO_BLOCKED_HASHES_FILE`), which only catches byte-identical files;
* Meta's PDQ for images, and PDQ per sampled frame for video, against `KUNO_PERCEPTUAL_HASH_FILES`
  (perceptual.py), which survives re-encoding, resizing and small crops;
* placeholders for membership programmes' hash lists (`KUNO_HASH_SHARING_PROGRAMMES`), which fail closed until an
  adapter exists.

Plugging in another matcher
---------------------------
A matcher receives the plaintext bytes, their SHA-256 and the sniffed MIME type, and returns a `Match` or
None. It never logs, stores or forwards the bytes except to the service it wraps. Other candidates (see
MODERATION.md for sources and licensing; confirm terms with counsel before integrating):

* Microsoft PhotoDNA Cloud Service: robust image hashing against CSAM hash sets; free for vetted
  organizations, used solely for combating child sexual abuse content, under Microsoft's terms of use.
  Integration is an HTTPS call, so the matcher is remote and must fail closed.
* Commercial services (e.g. Thorn Safer) under their own contracts.

A matcher that can't reach its service raises `ScanUnavailable`; the gateway then refuses the upload
(503) instead of storing unscanned content. Content a matcher can't decode raises `Unscannable`.
"""

from __future__ import annotations

import logging
import re
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

log = logging.getLogger("kuno.upload_scan")

_SHA256 = re.compile(r"^[0-9a-f]{64}$")


@dataclass(frozen=True)
class Match:
    matcher: str
    # exact or perceptual
    kind: str
    list_name: str
    category: str | None = None
    # Perceptual matches only: Hamming distance, the threshold it was within, the content's PDQ quality, where in a
    # video the matching frame was sampled, which version of the list matched, and the content's own PDQ hash.
    distance: int | None = None
    threshold: int | None = None
    quality: int | None = None
    frame_time_s: float | None = None
    list_version: str | None = None
    content_pdq: str | None = None

    def detail(self) -> dict:
        """The perceptual fields for a moderation item's detail (hashes and numbers only)."""
        fields = {
            "distance": self.distance, "threshold": self.threshold, "quality": self.quality,
            "frame_time_s": self.frame_time_s, "list_version": self.list_version, "pdq": self.content_pdq,
        }
        return {k: v for k, v in fields.items() if v is not None}


class ScanUnavailable(Exception):
    """A matcher couldn't give an answer. The upload must not be accepted unscanned."""


class Unscannable(ScanUnavailable):
    """The content itself can't be scanned (it doesn't decode). Refuse it rather than retry."""


class Matcher(Protocol):
    name: str

    def match(self, data: bytes, sha256: str, mime: str) -> Match | None: ...


class Sha256ListMatcher:
    """Exact matches against a local file: one SHA-256 per line, optionally followed by a category.

    The file is re-read when its modification time changes, so operators can update it without a restart.
    """

    name = "sha256_list"

    def __init__(self, path: Path):
        self.path = Path(path)
        self._lock = threading.Lock()
        self._mtime: float | None = None
        self._hashes: dict[str, str | None] = {}

    def _load(self) -> dict[str, str | None]:
        try:
            mtime = self.path.stat().st_mtime
        except OSError as exc:
            raise ScanUnavailable(f"blocked hash list {self.path.name} is unreadable") from exc
        with self._lock:
            if mtime != self._mtime:
                hashes: dict[str, str | None] = {}
                for raw in self.path.read_text().splitlines():
                    line = raw.split("#", 1)[0].strip()
                    if not line:
                        continue
                    digest, _, category = line.partition(" ")
                    digest = digest.lower()
                    if _SHA256.match(digest):
                        hashes[digest] = category.strip() or None
                self._hashes, self._mtime = hashes, mtime
                log.info("loaded %d blocked hashes from %s", len(hashes), self.path.name)
            return self._hashes

    def __len__(self) -> int:
        return len(self._load())

    def match(self, data: bytes, sha256: str, mime: str) -> Match | None:
        hashes = self._load()
        if sha256 in hashes:
            return Match(matcher=self.name, kind="exact", list_name=self.path.name, category=hashes[sha256])
        return None


class UploadScanner:
    def __init__(self, matchers: list[Matcher] | None = None):
        self.matchers: list[Matcher] = list(matchers or [])

    def scan(self, data: bytes, sha256: str, mime: str) -> Match | None:
        for matcher in self.matchers:
            found = matcher.match(data, sha256, mime)
            if found is not None:
                return found
        return None


def build_scanner(settings) -> UploadScanner:
    """Exact hashes first (cheap), then perceptual lists, then membership programmes."""
    matchers: list[Matcher] = []
    if settings.blocked_hashes_file:
        matchers.append(Sha256ListMatcher(settings.blocked_hashes_file))
    perceptual_files = list(getattr(settings, "perceptual_hash_files", None) or [])
    programmes = list(getattr(settings, "hash_sharing_programmes", None) or [])
    if perceptual_files or programmes:
        from .perceptual import PdqMatcher, programme_matchers

        if perceptual_files:
            matchers.append(PdqMatcher(settings, perceptual_files))
        matchers.extend(programme_matchers(programmes))
    return UploadScanner(matchers)


def scanner_for(state) -> UploadScanner:
    """The gateway's scanner for content it holds outside a request (finished Standard videos). Built once per gateway."""
    cached = getattr(state, "_kuno_scanner", None)
    if cached is None:
        cached = state._kuno_scanner = build_scanner(state.settings)
    return cached
