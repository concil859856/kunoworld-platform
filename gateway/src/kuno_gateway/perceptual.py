"""Perceptual matching for Standard content (MODERATION.md, "Perceptual matching").

* **Images:** Meta's PDQ (pdq.py) of the decoded image, shrunk to fit 512x512 first as both reference loaders do.
* **Video:** PDQ of frames sampled every `KUNO_PERCEPTUAL_FRAME_INTERVAL_S` (default 1 s, the interval vPDQ's README
  gives as its example), up to `KUNO_PERCEPTUAL_MAX_FRAMES`. A video matches when any sampled frame is within the
  distance of a listed hash: the "matching individual frames against known bad images" use of vPDQ
  (https://github.com/facebook/ThreatExchange/tree/main/vpdq). Frames or images below the quality floor are not matched.
* **Lists:** `KUNO_PERCEPTUAL_HASH_FILES`, comma-separated files of `<pdq hex> <category> <list name>` lines (`#` starts a
  comment). Each file is re-read when it changes. Hash lists are sensitive: keep them out of the repository.
* **Membership programmes** (NCMEC hash sharing, StopNCII, Tech Coalition Lantern): interfaces and configuration
  placeholders only (`PROGRAMMES`). Their hashes come under each programme's own agreement; enabling one here before an
  adapter exists makes scanning fail closed.

Decoding uses ffmpeg. The media reaches it through an in-memory file (memfd) on Linux, or a pipe elsewhere, so no
plaintext touches the disk. Nothing here logs, stores or forwards image or video data: only hashes, list names,
distances and counts.
"""

from __future__ import annotations

import contextlib
import hashlib
import logging
import os
import shutil
import subprocess
import sys
import threading
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

import numpy as np

from . import pdq
from .upload_scan import Match, ScanUnavailable, Unscannable

log = logging.getLogger("kuno.perceptual")

_WHITESPACE = b" \t\r\n"


# ------------------------------------------------------------------ decoding


@dataclass(frozen=True)
class FrameHash:
    """A PDQ hash of an image (`time_s` None) or of a video frame sampled near `time_s`."""

    time_s: float | None
    hash: pdq.PdqHash


def ffmpeg_path(settings) -> str:
    configured = getattr(settings, "ffmpeg_path", None)
    if configured:
        return configured
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:
        raise ScanUnavailable("ffmpeg is not available for perceptual scanning") from exc


def _memfd() -> int | None:
    """An anonymous in-memory file (Linux), or None. Some Python builds lack os.memfd_create; glibc still has it."""
    if not sys.platform.startswith("linux"):
        return None
    create = getattr(os, "memfd_create", None)
    if create is not None:
        return create("kuno-scan", getattr(os, "MFD_CLOEXEC", 1))
    try:
        import ctypes

        fd = ctypes.CDLL(None, use_errno=True).memfd_create(b"kuno-scan", 1)  # MFD_CLOEXEC
    except (OSError, AttributeError):
        return None
    return fd if fd >= 0 else None


@contextlib.contextmanager
def _media_source(data: bytes) -> Iterator[tuple[str, bytes | None, tuple[int, ...]]]:
    """(input url, bytes for stdin, fds to pass). A memfd is seekable, which MP4s without faststart need; through a pipe
    those can't be decoded, and are refused as unscannable."""
    fd = _memfd()
    if fd is not None:
        try:
            view, written = memoryview(data), 0
            while written < len(data):
                written += os.write(fd, view[written:])
            os.lseek(fd, 0, os.SEEK_SET)
            yield f"/proc/self/fd/{fd}", None, (fd,)
        finally:
            os.close(fd)
    else:
        yield "pipe:0", data, ()


def _scale_filter() -> str:
    """Shrink to fit 512x512 and convert to RGB in one scaler. Accurate rounding and full chroma interpolation keep
    JPEG decoding close to the reference decoders: on Meta's pdq/data images of quality 80 or more, hashes land within
    4 bits of the reference hashes (Meta's guidance for a correct implementation is within 10)."""
    d = pdq.DOWNSAMPLE_DIMS
    return (f"scale=w='min({d},iw)':h='min({d},ih)':force_original_aspect_ratio=decrease"
            f":flags=area+accurate_rnd+full_chroma_int+full_chroma_inp,format=rgb24")


def decode_frames(settings, data: bytes, *, video: bool) -> list[tuple[float | None, np.ndarray]]:
    """RGB frames (at most 512 on a side): one for an image, one per interval for a video."""
    exe = ffmpeg_path(settings)
    interval = float(getattr(settings, "perceptual_frame_interval_s", 1.0))
    max_frames = int(getattr(settings, "perceptual_max_frames", 300))
    if video:
        vf, frames = f"fps={1.0 / interval:.6f},{_scale_filter()}", str(max(max_frames, 1))
    else:
        vf, frames = _scale_filter(), "1"
    with _media_source(data) as (url, stdin, fds):
        command = [exe, "-hide_banner", "-loglevel", "error", "-i", url, "-an", "-sn", "-dn", "-vf", vf,
                   "-frames:v", frames, "-f", "image2pipe", "-c:v", "ppm", "-pix_fmt", "rgb24", "pipe:1"]
        io = {"input": stdin} if stdin is not None else {"stdin": subprocess.DEVNULL}
        try:
            proc = subprocess.run(
                command, capture_output=True, timeout=float(getattr(settings, "perceptual_timeout_s", 300.0)),
                pass_fds=fds, check=False, **io,
            )
        except subprocess.TimeoutExpired as exc:
            raise Unscannable("the media took too long to decode for scanning") from exc
        except OSError as exc:
            raise ScanUnavailable("ffmpeg could not be started for perceptual scanning") from exc
    # ffmpeg's messages can quote container metadata, so they are never logged.
    if proc.returncode != 0:
        raise Unscannable("the media could not be decoded for scanning")
    images = _ppm_frames(proc.stdout)
    if not images:
        raise Unscannable("the media has no frames to scan")
    return [((i * interval) if video else None, image) for i, image in enumerate(images)]


def _ppm_frames(stream: bytes) -> list[np.ndarray]:
    frames, pos, n = [], 0, len(stream)
    while pos < n:
        tokens, i = [], pos
        while len(tokens) < 4:
            while i < n and stream[i] in _WHITESPACE:
                i += 1
            j = i
            while j < n and stream[j] not in _WHITESPACE:
                j += 1
            if i == j:
                raise Unscannable("truncated frame data")
            tokens.append(stream[i:j])
            i = j
        i += 1  # the single whitespace byte after maxval
        if tokens[0] != b"P6" or tokens[3] != b"255":
            raise Unscannable("unexpected frame format")
        width, height = int(tokens[1]), int(tokens[2])
        size = width * height * 3
        if width < 1 or height < 1 or i + size > n:
            raise Unscannable("truncated frame data")
        frames.append(np.frombuffer(stream, dtype=np.uint8, count=size, offset=i).reshape(height, width, 3))
        pos = i + size
    return frames


def media_hashes(settings, data: bytes, mime: str) -> list[FrameHash]:
    """PDQ hashes of an image or of a video's sampled frames. Audio and anything else: none."""
    if mime.startswith("image/"):
        video = False
    elif mime.startswith("video/"):
        video = True
    else:
        return []
    return [FrameHash(time_s, pdq.hash_rgb(rgb)) for time_s, rgb in decode_frames(settings, data, video=video)]


# ------------------------------------------------------------------ hash lists


@dataclass(frozen=True)
class ListSnapshot:
    words: np.ndarray
    categories: list[str]
    list_names: list[str]
    # The first 16 hex digits of the file's SHA-256: which version of the list matched.
    version: str
    source: str

    def __len__(self) -> int:
        return len(self.categories)


class PdqHashList:
    """One `<pdq hex> <category> <list name>` file, re-read when its modification time changes."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self._lock = threading.Lock()
        self._mtime: float | None = None
        self._snapshot: ListSnapshot | None = None

    def snapshot(self) -> ListSnapshot:
        try:
            mtime = self.path.stat().st_mtime
        except OSError as exc:
            raise ScanUnavailable(f"perceptual hash list {self.path.name} is unreadable") from exc
        with self._lock:
            if self._snapshot is None or mtime != self._mtime:
                try:
                    raw = self.path.read_bytes()
                except OSError as exc:
                    raise ScanUnavailable(f"perceptual hash list {self.path.name} is unreadable") from exc
                hexes, categories, names, skipped = [], [], [], 0
                for line in raw.decode("utf-8", errors="replace").splitlines():
                    line = line.split("#", 1)[0].strip()
                    if not line:
                        continue
                    parts = line.split(None, 2)
                    if len(parts) != 3 or not pdq.is_pdq_hex(parts[0].lower()):
                        skipped += 1
                        continue
                    hexes.append(parts[0].lower())
                    categories.append(parts[1])
                    names.append(parts[2].strip())
                self._snapshot = ListSnapshot(
                    words=pdq.hashes_to_words(hexes), categories=categories, list_names=names,
                    version=hashlib.sha256(raw).hexdigest()[:16], source=self.path.name,
                )
                self._mtime = mtime
                log.info("loaded %d perceptual hashes from %s (%d lines skipped)", len(hexes), self.path.name, skipped)
            return self._snapshot


class PdqMatcher:
    """Matches images and sampled video frames against PDQ hash lists."""

    name = "pdq"

    def __init__(self, settings, paths: Iterable[Path]):
        self.settings = settings
        self.lists = [PdqHashList(p) for p in paths]

    @property
    def max_distance(self) -> int:
        return int(getattr(self.settings, "pdq_match_distance", pdq.MATCH_DISTANCE))

    @property
    def min_quality(self) -> int:
        return int(getattr(self.settings, "pdq_min_quality", pdq.MIN_QUALITY))

    def __len__(self) -> int:
        return sum(len(lst.snapshot()) for lst in self.lists)

    def match(self, data: bytes, sha256: str, mime: str) -> Match | None:
        # Lists first: an unreadable list refuses the content before anything is decoded.
        snapshots = [lst.snapshot() for lst in self.lists]
        if not any(len(snap) for snap in snapshots):
            return None
        frames = media_hashes(self.settings, data, mime)
        best: tuple[int, FrameHash, ListSnapshot, int] | None = None
        for frame in frames:
            if frame.hash.quality < self.min_quality:
                continue
            for snap in snapshots:
                found = pdq.nearest(frame.hash.hex, snap.words)
                if found is not None and found[1] <= self.max_distance and (best is None or found[1] < best[0]):
                    best = (found[1], frame, snap, found[0])
        if best is None:
            return None
        distance, frame, snap, index = best
        return Match(
            matcher=self.name, kind="perceptual", list_name=snap.list_names[index], category=snap.categories[index],
            distance=distance, threshold=self.max_distance, quality=frame.hash.quality, frame_time_s=frame.time_s,
            list_version=snap.version, content_pdq=frame.hash.hex,
        )


# ------------------------------------------------------------------ membership programmes (placeholders)


@dataclass(frozen=True)
class HashEntry:
    """One hash a programme shares. `hash_type` is how the programme labels it: pdq, md5, sha1, photodna, tmk_pdqf."""

    hash_type: str
    value: str
    category: str
    list_name: str


class HashSharingProgramme(Protocol):
    """A membership programme's hash list. An implementation runs under that programme's agreement, with credentials
    it issues, and must fail closed (raise ScanUnavailable) when it can't answer."""

    key: str
    title: str

    def entries(self) -> Iterable[HashEntry]: ...


class ProgrammeNotConnected(ScanUnavailable):
    """The programme is enabled in configuration, but this gateway has no adapter for it."""


@dataclass(frozen=True)
class ProgrammePlaceholder:
    key: str
    title: str
    # Environment variables a real adapter is expected to read. Nothing reads them yet.
    env: tuple[str, ...]
    hash_types: tuple[str, ...]
    constraints: str
    sources: tuple[str, ...] = field(default_factory=tuple)

    def entries(self) -> Iterable[HashEntry]:
        raise ProgrammeNotConnected(f"{self.title} is enabled but has no adapter on this gateway")


PROGRAMMES: dict[str, ProgrammePlaceholder] = {
    "ncmec": ProgrammePlaceholder(
        key="ncmec", title="NCMEC hash sharing",
        env=("KUNO_NCMEC_HASH_SHARING_URL", "KUNO_NCMEC_HASH_SHARING_USERNAME", "KUNO_NCMEC_HASH_SHARING_PASSWORD"),
        hash_types=("md5", "sha1", "photodna", "pdq", "tmk_pdqf"),
        constraints="Voluntary for electronic service providers; credentials must be requested from and supplied by NCMEC.",
        sources=("https://www.missingkids.org/gethelpnow/cybertipline/cybertiplinedata", "https://lesp.ncmec.org/csam-hashsharing/"),
    ),
    "stopncii": ProgrammePlaceholder(
        key="stopncii", title="StopNCII.org",
        env=("KUNO_STOPNCII_API_URL", "KUNO_STOPNCII_API_KEY"),
        hash_types=("pdq", "photodna", "md5"),
        constraints="Industry partners join by agreement with SWGfL; hashes of non-consensual intimate imagery (PDQ or "
                    "PhotoDNA for photos, MD5 for videos).",
        sources=("https://stopncii.org/faq/",
                 "https://swgfl.org.uk/magazine/new-industry-partners-join-stopncii-org-to-prevent-the-sharing-of-non-consensual-intimate-images-online/"),
    ),
    "lantern": ProgrammePlaceholder(
        key="lantern", title="Tech Coalition Lantern",
        env=("KUNO_LANTERN_THREATEXCHANGE_APP_ID", "KUNO_LANTERN_ACCESS_TOKEN"),
        hash_types=("pdq", "md5", "tmk_pdqf"),
        constraints="Eligible companies join after an application, a compliance review and a legal agreement; signals are "
                    "for independent review, not automated enforcement.",
        sources=("https://technologycoalition.org/programs/lantern/",
                 "https://technologycoalition.org/news/expanding-lantern-to-the-financial-sector/"),
    ),
}


class ProgrammeMatcher:
    """Wraps a programme. Until a real adapter replaces the placeholder, every scan fails closed."""

    def __init__(self, programme: HashSharingProgramme):
        self.programme = programme
        self.name = f"programme:{programme.key}"

    def match(self, data: bytes, sha256: str, mime: str) -> Match | None:
        for _ in self.programme.entries():
            break
        return None


def programme_matchers(keys: Iterable[str]) -> list[ProgrammeMatcher]:
    matchers = []
    for key in keys:
        programme = PROGRAMMES.get(key)
        if programme is None:
            raise ValueError(f"unknown hash-sharing programme {key!r}; known: {', '.join(PROGRAMMES)}")
        log.error("hash-sharing programme %s is enabled but has no adapter: Standard scanning will refuse content", key)
        matchers.append(ProgrammeMatcher(programme))
    return matchers
