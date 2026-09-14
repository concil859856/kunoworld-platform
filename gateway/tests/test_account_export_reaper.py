"""A data export whose builder stopped (account_export.reap_stalled): the parts it stored and their keys are deleted, the
export is queued and built again (or failed after a day), and a builder that wakes up afterwards stops without touching
the new build.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import json
import time

import pytest
from account_sessions import build_exports, export_zip, signed_in, stored
from sqlalchemy import select
import test_standard_moderation_flow as flow
from test_standard_moderation_flow import (  # helpers
    create_standard,
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
    render,
)

from kuno_gateway import account_export
from kuno_gateway.db_lifecycle import AccountExport
from kuno_gateway.db_moderation import StandardJob
from kuno_gateway.db_storage import StorageDataKey
from kuno_gateway.vault import vault

# The flow's fixtures, bound here so pytest finds them in this module.
gw, media = flow.gw, flow.media

PART = 2048


class Crash(BaseException):
    """Stands in for the process dying mid-build: not an Exception, so build() can't clean up after it."""


def export_row(gw, export_id: str) -> AccountExport:
    with gw.state.session() as s:
        return s.get(AccountExport, export_id)


def part_keys(gw, export_id: str) -> list[str]:
    with gw.state.session() as s:
        return list(s.scalars(select(StorageDataKey.label).where(StorageDataKey.label.like(f"export/{export_id}/part/%"))).all())


def blobs_on_disk(gw) -> set[str]:
    return {path.name for path in gw.settings.blob_dir.iterdir() if not path.name.startswith(".")}


def request_export(gw, who) -> str:
    made = gw.client.post("/v1/me/exports", headers=who.headers)
    assert made.status_code == 202, made.text
    return made.json()["export_id"]


def stored_video(gw, media, who) -> str:
    job_id = create_standard(gw, who.headers)["job_id"]
    render(gw, job_id, media.clip)
    return job_id


def crash_after(parts: int):
    def write_export(state, account_id, fp, now, heartbeat=lambda: None):
        fp.write(bytes(parts * PART + 100))  # `parts` parts stored and listed, the rest still buffered
        raise Crash()

    return write_export


def thumbnail_blob(gw, job_id: str) -> str | None:
    with gw.state.session() as s:
        return s.get(StandardJob, job_id).thumbnail_blob_id


def test_a_crashed_builders_parts_and_keys_are_deleted_and_the_export_is_built_again(gw, media, monkeypatch):
    monkeypatch.setattr(account_export, "PART_BYTES", PART)
    alice = signed_in(gw, "alice@example.com")
    job_id = stored_video(gw, media, alice)
    before = blobs_on_disk(gw)
    export_id = request_export(gw, alice)

    real = account_export.write_export
    monkeypatch.setattr(account_export, "write_export", crash_after(5))
    with pytest.raises(Crash):
        account_export.build(gw.state, *account_export.claim(gw.state))
    stalled = export_row(gw, export_id)
    parts = json.loads(stalled.part_blob_ids)
    assert stalled.status == "running" and len(parts) == 5 and all(stored(gw, p) for p in parts)
    assert len(part_keys(gw, export_id)) == 5
    # A part stored in the instant before the builder could list it: only its key can be found.
    store = vault(gw.state)
    unlisted, _, _ = gw.state.blobs.put(store.seal(account_export.part_label(export_id, 5), b"unlisted"))
    monkeypatch.setattr(account_export, "write_export", real)

    # While the claim holds, a slow builder keeps its export.
    assert account_export.reap_stalled(gw.state) == 0
    assert account_export.run_pending(gw.state) == 0
    lapsed = stalled.locked_until + 1
    assert account_export.reap_stalled(gw.state, now=lapsed) == 1
    requeued = export_row(gw, export_id)
    assert (requeued.status, requeued.part_blob_ids, requeued.started_at, requeued.locked_until) == ("queued", None, None, None)
    assert requeued.active_account_id == alice.account_id  # still the account's one export in progress
    assert not any(stored(gw, p) for p in parts) and part_keys(gw, export_id) == []
    with pytest.raises(KeyError):
        store.open(account_export.part_label(export_id, 5), gw.state.blobs.get(unlisted))
    gw.state.blobs.delete(unlisted)
    # Idempotent: a second pass finds nothing to do.
    assert account_export.reap_stalled(gw.state, now=lapsed) == 0
    assert gw.client.post("/v1/me/exports", headers=alice.headers).status_code == 409

    build_exports(gw)
    done = export_row(gw, export_id)
    assert done.status == "ready"
    assert export_zip(gw, alice.headers, export_id).read(f"standard/{job_id}/video.mp4") == media.clip
    # Nothing is left of the crashed build: the store holds what it did, the new parts and the thumbnail the build made.
    assert blobs_on_disk(gw) == before | set(json.loads(done.part_blob_ids)) | {thumbnail_blob(gw, job_id)}


def test_an_export_that_keeps_stopping_its_builder_fails_a_day_after_it_was_requested(gw, monkeypatch):
    monkeypatch.setattr(account_export, "PART_BYTES", PART)
    alice = signed_in(gw, "alice@example.com")
    before = blobs_on_disk(gw)
    export_id = request_export(gw, alice)
    monkeypatch.setattr(account_export, "write_export", crash_after(2))
    with pytest.raises(Crash):
        account_export.build(gw.state, *account_export.claim(gw.state))
    stalled = export_row(gw, export_id)
    assert account_export.reap_stalled(gw.state, now=stalled.created_at + account_export.GIVE_UP_AFTER_S + 1) == 1
    failed = export_row(gw, export_id)
    assert (failed.status, failed.error_code, failed.active_account_id, failed.part_blob_ids) == ("failed", "export_failed", None, None)
    assert blobs_on_disk(gw) == before and part_keys(gw, export_id) == []
    [listed] = gw.client.get("/v1/me/exports", headers=alice.headers).json()
    assert (listed["status"], listed["error_code"]) == ("failed", "export_failed")
    assert gw.client.post("/v1/me/exports", headers=alice.headers).status_code == 202


def test_a_builder_that_wakes_up_after_its_export_was_built_again_stops_and_leaves_the_new_build_alone(gw, media, monkeypatch):
    monkeypatch.setattr(account_export, "PART_BYTES", PART)
    alice = signed_in(gw, "alice@example.com")
    job_id = stored_video(gw, media, alice)
    before = blobs_on_disk(gw)
    export_id = request_export(gw, alice)
    real = account_export.write_export
    old: dict = {}

    def stalls_then_wakes(state, account_id, fp, now, heartbeat=lambda: None):
        if old:  # the second builder builds normally
            return real(state, account_id, fp, now, heartbeat)
        fp.write(bytes(3 * PART))
        old["parts"] = json.loads(export_row(gw, export_id).part_blob_ids)
        # This builder stalls past its claim: the export is cleaned up, queued, and built by another builder.
        assert account_export.reap_stalled(state, now=time.time() + account_export.LOCK_S + 1) == 1
        assert account_export.run_pending(state) == 1
        # It wakes up, stores one more part, finds its claim gone and stops.
        fp.write(bytes(PART))
        raise AssertionError("the stale builder should have stopped")

    monkeypatch.setattr(account_export, "write_export", stalls_then_wakes)
    assert account_export.build(gw.state, *account_export.claim(gw.state)) == account_export.DELETED

    done = export_row(gw, export_id)
    new_parts = json.loads(done.part_blob_ids)
    assert done.status == "ready" and all(stored(gw, p) for p in new_parts) and not set(new_parts) & set(old["parts"])
    assert not any(stored(gw, p) for p in old["parts"])
    assert export_zip(gw, alice.headers, export_id).read(f"standard/{job_id}/video.mp4") == media.clip
    # The stale builder's fourth part went too.
    assert blobs_on_disk(gw) == before | set(new_parts) | {thumbnail_blob(gw, job_id)}
