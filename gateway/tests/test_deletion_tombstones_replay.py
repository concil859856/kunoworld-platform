"""Deletions survive restores: each deletion path records tombstones in its transaction, the janitor exports them, and
`reapply-deletions` deletes what a bucket or database restore brought back, idempotently, with a dry run, and never
content a preservation hold covers in the restored database.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import datetime
import json
import os
import shutil
import sqlite3
import time
from types import SimpleNamespace

import pytest
from sqlalchemy import select
from test_standard_moderation_flow import (  # fixtures and helpers
    _private_job,
    create_standard,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    new_account,
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
    render,
)

from kuno_gateway import holds, ops_cli, standard_jobs, tombstones
from kuno_gateway.db import Blob, Job
from kuno_gateway.db_holds import PreservationHold
from kuno_gateway.db_moderation import StandardJob, StandardUpload
from kuno_gateway.db_storage import DeletionTombstone, StorageDataKey
from kuno_gateway.state import GatewayState
from kuno_gateway.vault import vault

PROMPT = "a lantern on a jetty"
# These tests restore a database by copying the SQLite file, which a Postgres schema (scripts/pytest_postgres.py) can't
# do; the replay they check runs the same SQL on both, and the Postgres leg still runs every other test here.
sqlite_file_restore = pytest.mark.skipif(
    bool(os.environ.get("KUNO_TEST_DATABASE_URL")), reason="simulates a database restore by copying the SQLite file"
)


def tombstoned(state, since: float = 0.0) -> dict[str, set[str]]:
    with state.session() as s:
        rows = s.scalars(select(DeletionTombstone).where(DeletionTombstone.created_at >= since)).all()
    out: dict[str, set[str]] = {}
    for row in rows:
        out.setdefault(row.kind, set()).add(row.ref)
    return out


def stored(state, blob_id: str | None) -> bool:
    return blob_id is not None and state.blobs.exists(blob_id)


def standard_video(gw, media, key) -> SimpleNamespace:
    """A finished standard job with an input upload, a stored video and a thumbnail."""
    job_id = create_standard(gw, key, prompt=PROMPT, media=media.red)["job_id"]
    render(gw, job_id, media.clip)
    assert gw.client.get(f"/v1/standard/videos/{job_id}/thumbnail", headers=key).status_code == 200
    with gw.state.session() as s:
        row = s.get(StandardJob, job_id)
        upload = s.scalars(select(StandardUpload).where(StandardUpload.job_id == job_id)).one()
        job_blobs = [b.id for b in s.scalars(select(Blob).where(Blob.job_id == job_id)).all()]
    labels = {f"standard/video/{job_id}", f"standard/thumbnail/{job_id}", f"standard/output-key/{job_id}", f"standard/upload/{upload.id}"}
    return SimpleNamespace(
        job_id=job_id, video_blob=row.video_blob_id, thumbnail_blob=row.thumbnail_blob_id, upload_id=upload.id,
        upload_blob=upload.blob_id, job_blobs=job_blobs, labels=labels,
        objects=[row.video_blob_id, row.thumbnail_blob_id, upload.blob_id, *job_blobs],
    )


def data_key_labels(state, labels) -> set[str]:
    with state.session() as s:
        return set(s.scalars(select(StorageDataKey.label).where(StorageDataKey.label.in_(sorted(labels)))).all())


def snapshot(state, blob_ids) -> dict[str, bytes]:
    return {blob_id: state.blobs.get(blob_id) for blob_id in blob_ids}


def restore_objects(state, objects: dict[str, bytes]) -> None:
    for blob_id, data in objects.items():
        (state.blobs.root / blob_id).write_bytes(data)


def backup_database(gw, target) -> float:
    taken = time.time()
    source, copy = sqlite3.connect(gw.settings.data_dir / "gateway.db"), sqlite3.connect(target)
    source.backup(copy)
    copy.close()
    source.close()
    return taken


def restore_database(gw, backup) -> GatewayState:
    gw.state.engine.dispose()
    shutil.copyfile(backup, gw.settings.data_dir / "gateway.db")
    return GatewayState(gw.settings)


# ------------------------------------------------------------------ recording


def test_the_owners_delete_of_a_standard_video_records_everything_it_destroyed(gw, media):
    account_id, key = new_account(gw)
    video = standard_video(gw, media, key)
    assert data_key_labels(gw.state, video.labels) == video.labels
    assert gw.client.delete(f"/v1/videos/{video.job_id}", headers=key).status_code == 204

    recorded = tombstoned(gw.state)
    assert recorded["video"] == {video.job_id} and recorded["standard_content"] == {video.job_id}
    assert recorded["job_blobs"] == {video.job_id} and recorded["standard_upload"] == {video.upload_id}
    assert set(video.objects) <= recorded["blob"]
    assert recorded["data_key"] == video.labels and data_key_labels(gw.state, video.labels) == set()
    assert not any(stored(gw.state, b) for b in video.objects)
    with gw.state.session() as s:
        assert {t.account_id for t in s.scalars(select(DeletionTombstone)).all()} == {account_id}

    # The janitor copies them out of the database.
    gw.state.janitor()
    exported = [json.loads(line) for f in sorted((gw.settings.data_dir / "tombstones").glob("*.jsonl")) for line in f.read_text().splitlines()]
    assert {(e["kind"], e["ref"]) for e in exported} >= {("video", video.job_id), ("standard_content", video.job_id)}
    with gw.state.session() as s:
        assert all(t.exported_at is not None for t in s.scalars(select(DeletionTombstone)).all())
    gw.state.janitor()  # nothing new: no second file
    assert len(list((gw.settings.data_dir / "tombstones").glob("*.jsonl"))) == 1


def test_the_owners_delete_of_a_private_video_records_its_blobs(gw, media):
    account_id, key = new_account(gw)
    job_id, _ = _private_job(gw, account_id, media.clip)
    with gw.state.session() as s:
        output_blob = s.get(Job, job_id).output_blob_id
    assert gw.client.delete(f"/v1/videos/{job_id}", headers=key).status_code == 204
    recorded = tombstoned(gw.state)
    assert recorded["video"] == {job_id} and recorded["job_blobs"] == {job_id} and recorded["blob"] == {output_blob}
    assert "standard_content" not in recorded and not stored(gw.state, output_blob)


def test_operator_removal_upload_expiry_and_the_blob_sweep_record_tombstones(gw, media):
    account_id, key = new_account(gw)
    video = standard_video(gw, media, key)
    with gw.state.session() as s, s.begin():
        standard_jobs.purge(gw.state, s, s.get(StandardJob, video.job_id), "removed", time.time())
    recorded = tombstoned(gw.state)
    assert recorded["standard_content"] == {video.job_id} and "video" not in recorded
    assert recorded["data_key"] == video.labels

    upload = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=key).json()
    unused = gw.client.post("/v1/blobs", content=b"KUNOB1" + b"\x00" * 64, headers=key).json()
    with gw.state.session() as s:
        upload_blob = s.get(StandardUpload, upload["upload_id"]).blob_id
    tomorrow = time.time() + 86400 + 60
    with gw.state.session() as s, s.begin():
        holds.sweep_blobs(gw.state, s, tomorrow)
        assert standard_jobs.expire_unused_uploads(gw.state, s, tomorrow) == 1
    recorded = tombstoned(gw.state)
    assert upload["upload_id"] in recorded["standard_upload"] and f"standard/upload/{upload['upload_id']}" in recorded["data_key"]
    assert {unused["blob_id"], upload_blob} <= recorded["blob"]


def test_held_content_is_recorded_only_when_the_hold_ends_and_it_is_destroyed(gw, media):
    account_id, key = new_account(gw)
    video = standard_video(gw, media, key)
    with gw.state.session() as s, s.begin():
        hold = holds.place(s, gw.settings, reason="legal_request", created_by="counsel@kunoworld.test", account_id=account_id, job_id=video.job_id)
        hold.output_key = vault(gw.state).seal_secret(holds.output_key_label(hold.id), b"k" * 32)
        hold_id = hold.id
    assert gw.client.delete(f"/v1/videos/{video.job_id}", headers=key).status_code == 204
    assert tombstoned(gw.state) == {} and stored(gw.state, video.video_blob)

    with gw.state.session() as s, s.begin():
        holds.release(gw.state, s, s.get(PreservationHold, hold_id), "counsel@kunoworld.test", "matter closed", time.time())
    assert tombstoned(gw.state)["data_key"] == {f"hold/{hold_id}/output-key"}
    gw.state.janitor()  # settles the deletion the hold deferred
    recorded = tombstoned(gw.state)
    assert recorded["standard_content"] == {video.job_id} and set(video.objects) <= recorded["blob"]
    assert not any(stored(gw.state, b) for b in video.objects)


def test_a_transaction_records_the_same_thing_once_and_rolls_back_with_the_deletion(gw):
    with gw.state.session() as s, s.begin():
        first = tombstones.record(s, tombstones.BLOB, "b" * 32, "acct")
        assert tombstones.record(s, tombstones.BLOB, "b" * 32, "acct") is first
    with pytest.raises(RuntimeError):
        with gw.state.session() as s, s.begin():
            tombstones.record(s, tombstones.BLOB, "c" * 32)
            raise RuntimeError("the deletion failed")
    assert tombstoned(gw.state) == {"blob": {"b" * 32}}
    with pytest.raises(ValueError):
        with gw.state.session() as s:
            tombstones.record(s, "", "x")


# ------------------------------------------------------------------ replay


def test_replay_after_a_bucket_restore_deletes_what_came_back_and_is_idempotent(gw, media):
    account_id, key = new_account(gw)
    video = standard_video(gw, media, key)
    private_job, _ = _private_job(gw, account_id, media.clip)
    with gw.state.session() as s:
        private_blob = s.get(Job, private_job).output_blob_id
    objects = snapshot(gw.state, [*video.objects, private_blob])
    backup_taken = time.time()
    for job_id in (video.job_id, private_job):
        assert gw.client.delete(f"/v1/videos/{job_id}", headers=key).status_code == 204

    restore_objects(gw.state, objects)  # the bucket is restored from a copy taken before the deletions
    assert all(stored(gw.state, b) for b in objects)

    dry = tombstones.reapply(gw.state, backup_taken, dry_run=True)
    assert dry.count("would_delete", "blob") == len(objects) and dry.count("deleted") == 0
    assert all(stored(gw.state, b) for b in objects)

    report = tombstones.reapply(gw.state, backup_taken)
    assert report.count("deleted", "blob") == len(objects) and not report.errors
    assert not any(stored(gw.state, b) for b in objects)

    again = tombstones.reapply(gw.state, backup_taken)
    assert again.count("deleted") == 0 and again.count("absent") == again.considered
    assert tombstones.reapply(gw.state, time.time() + 60).considered == 0  # nothing that recent


@sqlite_file_restore
def test_replay_after_a_database_and_bucket_restore_uses_the_exported_tombstones(gw, media, tmp_path):
    account_id, key = new_account(gw)
    video = standard_video(gw, media, key)
    objects = snapshot(gw.state, video.objects)
    backup = tmp_path / "gateway-backup.db"
    backup_taken = backup_database(gw, backup)
    assert gw.client.delete(f"/v1/videos/{video.job_id}", headers=key).status_code == 204
    gw.state.janitor()  # exports the tombstones

    restored = restore_database(gw, backup)
    restore_objects(restored, objects)
    with restored.session() as s:
        row = s.get(StandardJob, video.job_id)
        # Everything is back, readable, and the database has no memory of the deletion.
        assert row.deleted_at is None and row.prompt == PROMPT
        assert s.scalars(select(DeletionTombstone)).all() == []
    assert standard_jobs.load_video(restored, row) == media.clip
    assert data_key_labels(restored, video.labels) == video.labels

    report = tombstones.reapply(restored, backup_taken)
    assert report.restored_tombstones >= report.considered > 0 and not report.errors and report.count("held") == 0
    with restored.session() as s:
        row = s.get(StandardJob, video.job_id)
        assert row.deleted_at is not None and row.prompt is None and row.video_blob_id is None
        assert s.scalars(select(StandardUpload).where(StandardUpload.job_id == video.job_id)).all() == []
        assert s.scalars(select(Blob).where(Blob.job_id == video.job_id)).all() == []
        assert s.get(DeletionTombstone, next(iter(s.scalars(select(DeletionTombstone.id)).all()))) is not None
    assert data_key_labels(restored, video.labels) == set()
    assert not any(stored(restored, b) for b in objects)

    again = tombstones.reapply(restored, backup_taken)
    assert again.count("deleted") == 0 and again.restored_tombstones == 0
    restored.engine.dispose()


@sqlite_file_restore
def test_replay_leaves_content_a_hold_in_the_restored_database_covers(gw, media, tmp_path):
    account_id, key = new_account(gw)
    video = standard_video(gw, media, key)
    with gw.state.session() as s, s.begin():
        hold_id = holds.place(s, gw.settings, reason="legal_request", created_by="counsel@kunoworld.test", account_id=account_id,
                              job_id=video.job_id).id
    objects = snapshot(gw.state, video.objects)
    backup = tmp_path / "gateway-held.db"
    backup_taken = backup_database(gw, backup)  # taken while the hold was active
    with gw.state.session() as s, s.begin():
        holds.release(gw.state, s, s.get(PreservationHold, hold_id), "counsel@kunoworld.test", "released", time.time())
    assert gw.client.delete(f"/v1/videos/{video.job_id}", headers=key).status_code == 204
    gw.state.janitor()

    restored = restore_database(gw, backup)
    restore_objects(restored, objects)
    report = tombstones.reapply(restored, backup_taken)
    assert report.count("held") > 0 and report.count("deleted") == 0
    assert any("held:" in line for line in report.lines())
    assert all(stored(restored, b) for b in objects)
    with restored.session() as s:
        assert s.get(StandardJob, video.job_id).prompt == PROMPT
    restored.engine.dispose()


def test_other_modules_kinds_replay_through_registered_replayers(gw, tmp_path):
    since = time.time() - 1
    with gw.state.session() as s, s.begin():
        tombstones.record(s, "kuno-test-unregistered", "thing-1", "acct")
        tombstones.record(s, "kuno-test-kind", "thing-2")
    seen = []

    def replayer(state, s, entry, now, dry_run):
        seen.append((entry.ref, entry.account_id, dry_run))
        return tombstones.WOULD_DELETE if dry_run else tombstones.DELETED

    tombstones.register_replayer("kuno-test-kind", replayer)
    try:
        report = tombstones.reapply(gw.state, since)
        assert report.unhandled["kuno-test-unregistered"] == 1 and report.count("deleted", "kuno-test-kind") == 1
        assert seen == [("thing-2", None, False)]
        assert any("unhandled 1" in line for line in report.lines())

        lines: list[str] = []
        args = SimpleNamespace(since=datetime.datetime.fromtimestamp(since, datetime.timezone.utc).isoformat(), until=None, dry_run=True, source="db")
        assert ops_cli.reapply_deletions(args, gw.settings, out=lines.append) == 0
        assert "(dry run)" in lines[0] and seen[-1] == ("thing-2", None, True)
        bad = SimpleNamespace(since="last tuesday", until=None, dry_run=True, source="db")
        assert ops_cli.reapply_deletions(bad, gw.settings, out=lines.append) == 2
    finally:
        tombstones._REPLAYERS.pop("kuno-test-kind", None)


def test_times_parse_as_iso_8601_or_unix_seconds():
    assert tombstones.parse_time("2026-09-14T10:00:00Z") == datetime.datetime(2026, 9, 14, 10, tzinfo=datetime.timezone.utc).timestamp()
    assert tombstones.parse_time("2026-09-14T10:00:00") == tombstones.parse_time("2026-09-14T10:00:00+00:00")
    assert tombstones.parse_time("1789380000.5") == 1789380000.5
    with pytest.raises(ValueError):
        tombstones.parse_time("yesterday")
