"""Known-content matching for Standard-mode uploads.

Every plaintext upload (images, video and audio references, source clips) runs through an `UploadScanner`
before it is stored. A scanner is a list of `Matcher`s; the first match wins. What ships here is an exact
SHA-256 list (`KUNO_BLOCKED_HASHES_FILE`). Exact hashes only catch byte-identical files; re-encoding,
resizing or cropping defeats them, which is why production deployments should add a perceptual matcher.

Plugging in a perceptual service
--------------------------------
A matcher receives the plaintext bytes, their SHA-256 and the sniffed MIME type, and returns a `Match` or
None. It never logs, stores or forwards the bytes except to the service it wraps. Candidates (see
MODERATION.md for sources and licensing; confirm terms with counsel before integrating):

* Microsoft PhotoDNA Cloud Service: robust image hashing against CSAM hash sets; free for vetted
  organizations, used solely for combating child sexual abuse content, under Microsoft's terms of use.
  Integration is an HTTPS call, so the matcher is remote and must fail closed.
* Meta PDQ (images) and TMK+PDQF (video): open-source perceptual hashes (ThreatExchange repository,
  BSD licence). Computing them locally needs image/video decoding; the hash *lists* to match against come
  from membership programmes (NCMEC hash sharing for registered electronic service providers, StopNCII,
  Tech Coalition / GIFCT for their members), each with its own agreement.
* Commercial services (e.g. Thorn Safer) under their own contracts.

A matcher that can't reach its service raises `ScanUnavailable`; the gateway then refuses the upload
(503) instead of storing unscanned content.
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


class ScanUnavailable(Exception):
    """A matcher couldn't give an answer. The upload must not be accepted unscanned."""


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
    matchers: list[Matcher] = []
    if settings.blocked_hashes_file:
        matchers.append(Sha256ListMatcher(settings.blocked_hashes_file))
    return UploadScanner(matchers)
