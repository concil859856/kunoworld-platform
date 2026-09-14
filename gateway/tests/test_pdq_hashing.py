"""PDQ (pdq.py): agreement with Meta's reference implementation, Meta's reference test vectors, and robustness to
near-duplicates through the gateway's own decoder (perceptual.py).

Meta's test images (facebook/ThreatExchange, pdq/data) are not checked in: their provenance and licence are not stated
in the repository (the LabelMe subset presumably comes from MIT's LabelMe dataset), so the repository's BSD licence
can't be assumed to cover them. Instead:

* `STAND_INS` are deterministic synthetic images whose expected hashes were produced by Meta's reference Python
  implementation (pdq/python/pdqhashing/hasher/pdq_hasher.py, fetched 2026-09-14) from the same pixels. The port must
  match them bit for bit.
* `REFERENCE_VECTORS` are the expected hashes from Meta's pdq/python/pdqhashing/tests/pdq_test.py. With
  KUNO_PDQ_VECTORS_DIR pointing at a copy of ThreatExchange's pdq/data, the gateway's full pipeline (ffmpeg decoding)
  is checked against them using Meta's criterion for implementations with a different decoder: within 10 bits for
  images of quality 80 or more (pdq/README.md).
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest

from scan_helpers import ffmpeg

from kuno_gateway import pdq, perceptual
from kuno_gateway.upload_scan import ScanUnavailable, Unscannable

needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="needs ffmpeg")

SETTINGS = SimpleNamespace(ffmpeg_path=None, perceptual_frame_interval_s=1.0, perceptual_max_frames=300, perceptual_timeout_s=60.0,
                           pdq_match_distance=pdq.MATCH_DISTANCE, pdq_min_quality=pdq.MIN_QUALITY)

# (kind, columns, rows): (hash, quality) from Meta's reference pdq_hasher.py on `synthetic(kind, columns, rows)`.
STAND_INS = {
    ("rings", 300, 200): ("658feb3056c72d9c7a6056c7259f29384a60da63d4cfb59fa59ca938a930ab30", 100),
    ("blocks", 512, 384): ("c9cc0e97d5c0f17f15ba339e61bfeb009677cc00ea66ccd1ea858cad6e18cc42", 100),
    ("diagonal", 97, 131): ("f3dbce6f39b8c6e721994c661118c44211908462e108fc02ff00ffc0fff0fffc", 62),
}

REFERENCE_VECTORS = {
    "misc-images/c.png": "e64cc9d91e623842f8d1f1d9a398e78c9f199a3bd87924f2b7e11e0bf061b064",
    "misc-images/small.jpg": "0007001f003f003f007f00ff00ff00ff01ff01ff01ff03ff03ff03ff03ff03ff",
    "misc-images/wee.jpg": "6227401f601ff4ccafcc9fad4b0d95d371a2eb7265a3285234d228ca94deeb2d",
    "reg-test-input/labelme-subset/q0003.jpg": "54a977c221d14c1c43ba5e6e21d4a13989a3553f1462611cbb85fda7be83b677",
    "reg-test-input/labelme-subset/q0004.jpg": "992d44af36d69e6ca6b812585928bac11def254ef5398c6d07466c9abcc65b92",
    "reg-test-input/labelme-subset/q0122.jpg": "cfb2009ddd21c6dab0046a7745b5984757a8a4535b3377aea2591d32b33ff940",
    "reg-test-input/labelme-subset/q0291.jpg": "a0fe94f1e5cc1cc8dd855948498dc9243f7ca27336f036d7f212b74bc103c9a7",
    "reg-test-input/labelme-subset/q0746.jpg": "1049d96239e24d4dca2c55512b8bdb77425f4dbcf575a0a95555aaab5554aaaa",
    "reg-test-input/labelme-subset/q1050.jpg": "489db672e9190276d452aeab41eba20f02375fe4092d88defdf491a5c55c5f70",
    "reg-test-input/labelme-subset/q2821.jpg": "b150231ffae4710ffcf4f18bb574b109a576f14bb8543189f8743289f174b109",
    "reg-test-input/dih/bridge-1-original.jpg": "d8f8f0cce0f4a84f0e370a22028f67f0b36e2ed596623e1d33e6b39c4e9c9b22",
    "reg-test-input/dih/bridge-2-rotate-90.jpg": "38a50efd71c83f429013d68d0ffffc52e34e0e15ada952a9d29684214aa9e5af",
    "reg-test-input/dih/bridge-3-rotate-180.jpg": "2dadda64b5a142e5d362209057da895ae63b8c7fc277b4b766b319361f893188",
    "reg-test-input/dih/bridge-4-rotate-270.jpg": "a5f0a457248995e8c9065c275aaa54d8b61ba4bdf8fcfc0387c32f8b0bfc4f05",
    "reg-test-input/dih/bridge-5-flipx.jpg": "d8f80f31e0f417b00e37f5dd028f980fb36ed12a9662c1e233e64c634e9c64dd",
    "reg-test-input/dih/bridge-6-flipy.jpg": "0dad259bb1a1bd18d362576556da32a1e63b7380c2374b4866b3c6c91b89ce77",
    "reg-test-input/dih/bridge-7-flip-plus-1.jpg": "f0a5e10271dcc0bd9c5309720fff018de34ef1e8ada9a956d2967ade1ea91a50",
    "reg-test-input/dih/bridge-8-flip-minus-1.jpg": "69f05aa8a4996a17c146a2da5aaaab07b61b5b60f8fc07fc83c3d0740bfcb0fa",
}


def synthetic(kind: str, cols: int, rows: int) -> np.ndarray:
    """Integer-only patterns, so the pixels are identical on every platform."""
    y, x = np.mgrid[0:rows, 0:cols].astype(np.int64)
    if kind == "rings":
        r, g, b = ((x * x + 3 * y * y) // 97) % 256, (x * 255) // max(cols - 1, 1), ((x ^ y) * 7) % 256
    elif kind == "blocks":
        r, g, b = ((x // 23 + y // 17) % 5) * 60, ((x // 41) * 37 + (y // 13) * 11) % 256, (x * y // 311) % 256
    else:
        r, g, b = ((x + 2 * y) // 3) % 256, ((3 * x - y) % 509) // 2, ((x // 9) * (y // 7)) % 256
    return np.stack([r, g, b], axis=-1).astype(np.uint8)


def test_the_port_matches_metas_reference_implementation_bit_for_bit():
    for (kind, cols, rows), (expected, quality) in STAND_INS.items():
        got = pdq.hash_rgb(synthetic(kind, cols, rows))
        assert (got.hex, got.quality) == (expected, quality), kind


def test_hash_layout_distance_and_nearest():
    # Bit k is 2**k of the hex number: bit 0 is the last digit's lowest bit, as in Meta's Hash256.
    assert pdq.hamming("0" * 63 + "1", "0" * 64) == 1
    assert pdq.hamming("f" * 64, "0" * 64) == pdq.HASH_BITS
    one = pdq.hash_rgb(synthetic("rings", 300, 200))
    assert bin(int(one.hex, 16)).count("1") == 128  # above the median: half the bits
    table = pdq.hashes_to_words(["0" * 64, one.hex, "f" * 64])
    assert pdq.nearest(one.hex, table) == (1, 0)
    assert pdq.nearest("0" * 63 + "3", table) == (0, 2)
    assert pdq.nearest(one.hex, pdq.hashes_to_words([])) is None
    with pytest.raises(ValueError):
        pdq.hash_rgb(np.zeros((4, 4), dtype=np.uint8))
    # A featureless image has quality 0: too unreliable to match on.
    assert pdq.hash_rgb(np.full((64, 64, 3), 128, dtype=np.uint8)).quality < pdq.MIN_QUALITY


@needs_ffmpeg
@pytest.mark.skipif(not os.environ.get("KUNO_PDQ_VECTORS_DIR"), reason="set KUNO_PDQ_VECTORS_DIR to ThreatExchange's pdq/data")
def test_metas_reference_vectors_through_the_gateway_decoder():
    root = Path(os.environ["KUNO_PDQ_VECTORS_DIR"])
    checked = 0
    for name, expected in REFERENCE_VECTORS.items():
        [frame] = perceptual.media_hashes(SETTINGS, (root / name).read_bytes(), "image/jpeg" if name.endswith("jpg") else "image/png")
        if frame.hash.quality >= 80:
            assert frame.hash.distance(expected) <= 10, name
            checked += 1
    assert checked >= 12


@needs_ffmpeg
def test_near_duplicates_stay_within_the_match_distance_and_other_images_do_not(tmp_path):
    source = ffmpeg("-f", "lavfi", "-i", "testsrc2=size=640x360:rate=1", "-frames:v", "1", out=tmp_path / "source.png")
    variants = {
        "resized": ffmpeg("-i", tmp_path / "source.png", "-vf", "scale=320:180", out=tmp_path / "resized.png"),
        "recompressed": ffmpeg("-i", tmp_path / "source.png", "-q:v", "20", out=tmp_path / "recompressed.jpg"),
        "resized and recompressed": ffmpeg("-i", tmp_path / "source.png", "-vf", "scale=400:225", "-q:v", "15", out=tmp_path / "both.jpg"),
        # PDQ tolerates small crops only: on this picture 1% moves 6 bits, 2% about 22, 4% more than the threshold.
        "cropped 1%": ffmpeg("-i", tmp_path / "source.png", "-vf", "crop=iw*0.99:ih*0.99", out=tmp_path / "crop1.png"),
        "cropped 2%": ffmpeg("-i", tmp_path / "source.png", "-vf", "crop=iw*0.98:ih*0.98", out=tmp_path / "crop2.png"),
        "cropped 2% from one side": ffmpeg("-i", tmp_path / "source.png", "-vf", "crop=iw*0.98:ih:0:0", out=tmp_path / "crop-left.png"),
        "upscaled": ffmpeg("-i", tmp_path / "source.png", "-vf", "scale=1280:720", out=tmp_path / "large.png"),
    }
    unrelated = ffmpeg("-f", "lavfi", "-i", "mandelbrot=size=640x360:rate=1", "-frames:v", "1", out=tmp_path / "other.png")

    def image_hash(data: bytes, mime: str = "image/png") -> pdq.PdqHash:
        [frame] = perceptual.media_hashes(SETTINGS, data, mime)
        assert frame.time_s is None
        return frame.hash

    original = image_hash(source)
    assert original.quality >= pdq.MIN_QUALITY
    distances = {
        name: image_hash(data, "image/jpeg" if name.startswith(("recompressed", "resized and")) else "image/png").distance(original)
        for name, data in variants.items()
    }
    assert all(d <= pdq.MATCH_DISTANCE for d in distances.values()), distances
    assert image_hash(unrelated).distance(original) > 2 * pdq.MATCH_DISTANCE


@needs_ffmpeg
def test_videos_are_hashed_frame_by_frame_and_bad_media_is_unscannable(tmp_path):
    clip = ffmpeg("-f", "lavfi", "-i", "testsrc2=size=320x176:rate=24:duration=3", "-c:v", "libx264", "-preset", "ultrafast",
                  "-pix_fmt", "yuv420p", out=tmp_path / "clip.mp4")  # moov at the end: needs a seekable input
    frames = perceptual.media_hashes(SETTINGS, clip, "video/mp4")
    assert [f.time_s for f in frames] == [0.0, 1.0, 2.0]
    assert all(f.hash.quality >= pdq.MIN_QUALITY for f in frames)
    capped = perceptual.media_hashes(SimpleNamespace(**{**vars(SETTINGS), "perceptual_max_frames": 2}), clip, "video/mp4")
    assert len(capped) == 2
    assert perceptual.media_hashes(SETTINGS, b"ID3not really audio", "audio/mpeg") == []
    with pytest.raises(Unscannable):
        perceptual.media_hashes(SETTINGS, b"\x89PNG\r\n\x1a\n" + b"\0" * 64, "image/png")
    with pytest.raises(ScanUnavailable):
        perceptual.media_hashes(SimpleNamespace(**{**vars(SETTINGS), "ffmpeg_path": str(tmp_path / "no-ffmpeg")}), clip, "video/mp4")


def test_hash_list_files_parse_reload_and_fail_closed(tmp_path):
    good = pdq.hash_rgb(synthetic("blocks", 512, 384)).hex
    path = tmp_path / "list.txt"
    path.write_text(f"# header\n\n{good.upper()} csam NCMEC industry list  # trailing\nnot-a-hash csam x\n{'ab' * 32} ncii\n")
    listed = perceptual.PdqHashList(path)
    snap = listed.snapshot()
    assert (len(snap), snap.categories, snap.list_names, len(snap.version)) == (1, ["csam"], ["NCMEC industry list"], 16)
    path.write_text(f"{good} csam first\n{'cd' * 32} ncii second\n")
    os.utime(path, (snap_time := path.stat().st_mtime + 5, snap_time))
    assert len(listed.snapshot()) == 2 and listed.snapshot().version != snap.version
    path.unlink()
    with pytest.raises(ScanUnavailable):
        listed.snapshot()
    with pytest.raises(ValueError):
        perceptual.programme_matchers(["not-a-programme"])
    [placeholder] = perceptual.programme_matchers(["ncmec"])
    with pytest.raises(ScanUnavailable):
        placeholder.match(b"", "0" * 64, "image/png")
