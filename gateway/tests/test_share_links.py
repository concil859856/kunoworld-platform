"""Share links (shares.py, api_shares.py): owner-created, revocable, optionally expiring links to one video. Standard links
serve the video; private links serve ciphertext only; every way a link stops works; public routes are rate-limited
per IP without keeping addresses.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import hashlib
import json
import time
import uuid

from kuno_protocol import devkit
from kuno_protocol.blobs import decrypt_blob
from kuno_protocol.canonical import b64d, b64e, canonical_json, sha256_hex
from kuno_protocol.crypto import public_key_bytes
from kuno_protocol.receipts import Receipt, ReceiptBody, VideoInfo, sign_receipt, verify_receipt
from kuno_protocol.schemas import output_label
from test_standard_moderation_flow import (  # fixtures and helpers
    ENCLAVE,
    TEXT,
    _private_job,
    create_standard,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    new_account,
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
    render,
)

from kuno_gateway import identity, moderation, shares, standard_jobs
from kuno_gateway.db import Account, Blob, Job, User
from kuno_gateway.db_moderation import StandardJob
from kuno_gateway.db_shares import VideoShare


def session_for(gw, account_id: str) -> dict:
    """A web session for an account new_account made (it has an owner user id, but no user row yet)."""
    with gw.state.session() as s, s.begin():
        account = s.get(Account, account_id)
        if s.get(User, account.owner_user_id) is None:
            s.add(User(id=account.owner_user_id, email=f"{account_id[:12]}@example.com", created_at=time.time()))
            s.flush()
        token, _ = identity.open_session(s, account.owner_user_id, identity.WEB, 3600)
    return {"authorization": f"Bearer {token}"}


def sign(gw, job_id: str, video: bytes) -> None:
    """The receipt a worker signs for a private job (_private_job stores the sealed output but no receipt)."""
    with gw.state.session() as s, s.begin():
        job = s.get(Job, job_id)
        blob = s.get(Blob, job.output_blob_id)
        now = time.time()
        body = ReceiptBody(
            job_id=job_id, enclave_id=ENCLAVE, profile_id=job.profile_id, image_digest=devkit.DEV_IMAGE_DIGEST,
            params_digest=sha256_hex(canonical_json(TEXT.model_dump(mode="json"))), input_digest="0" * 64,
            output_digest=blob.sha256, output_bytes=blob.size, content_digest=sha256_hex(video), attestation_digest="0" * 64,
            started_at=now, finished_at=now, gpu_seconds=1.0, video=VideoInfo(duration_s=1, width=320, height=176, fps=24, frames=24, audio=False),
        )
        job.receipt = sign_receipt(gw.signing, body).model_dump_json()


def standard_video(gw, media, headers) -> str:
    job_id = create_standard(gw, headers, prompt="a lantern on a jetty")["job_id"]
    render(gw, job_id, media.clip)
    return job_id


def share(gw, job_id: str, headers, path: str = "/v1/me/videos/{job_id}/shares", **body):
    return gw.client.post(path.format(job_id=job_id), json=body or None, headers=headers)


def public(gw, token: str, suffix: str = "", ip: str = "198.51.100.7"):
    return gw.client.get(f"/v1/shares/{token}{suffix}", headers={"cf-connecting-ip": ip})


def owner_status(gw, headers, share_id: str) -> str:
    rows = gw.client.get("/v1/me/shares", headers=headers).json()
    return next(r["status"] for r in rows if r["share_id"] == share_id)


def expect_gone(gw, token: str) -> None:
    for suffix in ("", "/video"):
        answer = public(gw, token, suffix)
        assert answer.status_code == 410, (suffix, answer.text)
        # The same words whatever the cause, so a link can't reveal a hold or a removal.
        assert answer.json()["detail"] == {"code": "share_unavailable", "message": "This link no longer works."}


def test_a_standard_link_plays_for_anyone_until_the_owner_revokes_it(gw, media):
    account_id, key = new_account(gw)
    me = session_for(gw, account_id)
    job_id = standard_video(gw, media, key)

    made = share(gw, job_id, me)
    assert made.status_code == 201, made.text
    link = made.json()
    token = link["token"]
    assert len(b64d(token)) == 32 and link["url_path"] == f"/s/{token}" and link["url"] == f"{gw.settings.site_url}/s/{token}"
    assert (link["job_id"], link["privacy"], link["status"], link["expires_at"], link["view_count"]) == (job_id, "standard", "active", None, 0)
    with gw.state.session() as s:
        row = s.get(VideoShare, link["share_id"])
        assert row.token_hash == hashlib.sha256(token.encode()).hexdigest()
        assert token not in json.dumps({c.name: getattr(row, c.name) for c in row.__table__.columns}, default=str)

    details = public(gw, token)
    assert details.status_code == 200
    assert details.headers["x-robots-tag"] == "noindex, nofollow" and details.headers["cache-control"] == "no-store"
    body = details.json()
    assert set(body) == {"privacy", "profile_id", "created_at", "shared_at", "expires_at", "content_digest", "receipt", "signing_public_key"}
    assert (body["privacy"], body["profile_id"], body["content_digest"]) == ("standard", "ltx-2.5-fast", sha256_hex(media.clip))
    assert account_id not in details.text and "lantern" not in details.text

    video = public(gw, token, "/video")
    assert video.status_code == 200 and video.headers["content-type"] == "video/mp4" and video.content == media.clip
    assert video.headers["x-robots-tag"] == "noindex, nofollow"
    assert public(gw, token, "/video").status_code == 200
    [listed] = gw.client.get("/v1/me/shares", headers=me).json()
    assert (listed["share_id"], listed["status"], listed["view_count"]) == (link["share_id"], "active", 2)
    assert "token" not in listed

    revoked = gw.client.delete(f"/v1/me/shares/{link['share_id']}", headers=me)
    assert revoked.status_code == 200 and revoked.json()["status"] == "revoked"
    expect_gone(gw, token)
    # Revoking twice is harmless; the owner's own access never depended on the link.
    assert gw.client.delete(f"/v1/me/shares/{link['share_id']}", headers=me).json()["status"] == "revoked"
    assert gw.client.get(f"/v1/standard/videos/{job_id}/video", headers=key).content == media.clip


def test_a_private_link_serves_only_the_sealed_video_which_the_fragment_key_opens(gw, media):
    account_id, key = new_account(gw)
    job_id, output_key = _private_job(gw, account_id, media.clip)
    sign(gw, job_id, media.clip)

    # Developers make links with an API key, through the job API.
    made = share(gw, job_id, key, path="/v1/videos/{job_id}/shares")
    assert made.status_code == 201, made.text
    token = made.json()["token"]
    assert made.json()["privacy"] == "private" and b64e(output_key) not in made.text

    body = public(gw, token).json()
    assert body["privacy"] == "private"
    with gw.state.session() as s:
        signing_key = public_key_bytes(gw.signing)
        assert body["signing_public_key"] == b64e(signing_key)
    receipt = Receipt.model_validate(body["receipt"])
    assert verify_receipt(receipt, b64d(body["signing_public_key"])) and receipt.body.job_id == job_id

    sealed = public(gw, token, "/video")
    assert sealed.status_code == 200 and sealed.headers["content-type"] == "application/octet-stream"
    assert sealed.content.startswith(b"KUNOB1") and media.clip not in sealed.content
    assert sha256_hex(sealed.content) == receipt.body.output_digest
    # What the share page does with #k=...: only the key opens it.
    assert decrypt_blob(output_key, output_label(job_id), sealed.content) == media.clip
    assert b64e(output_key) not in json.dumps(gw.client.get("/v1/account/shares", headers=key).json())


def test_links_stop_when_revoked_expired_deleted_removed_held_or_the_account_closes(gw, media):
    account_id, key = new_account(gw)
    me = session_for(gw, account_id)

    # Expired.
    job = standard_video(gw, media, key)
    expiring = share(gw, job, me, expires_at=time.time() + 3600).json()
    assert public(gw, expiring["token"]).status_code == 200
    with gw.state.session() as s, s.begin():
        s.get(VideoShare, expiring["share_id"]).expires_at = time.time() - 1
    expect_gone(gw, expiring["token"])
    assert owner_status(gw, me, expiring["share_id"]) == "expired"

    # Held: gone for viewers while the hold lasts, and the owner's list doesn't say why.
    held = share(gw, job, me).json()
    placed = gw.client.post("/admin/v1/holds", json={"job_id": job, "reason": "legal_request", "note": "order 9"}, headers=gw.admin)
    assert placed.status_code == 201
    expect_gone(gw, held["token"])
    assert owner_status(gw, me, held["share_id"]) == "unavailable"
    refused = share(gw, job, me)
    assert refused.status_code == 409 and refused.json()["detail"]["code"] == "share_unavailable"
    gw.client.post(f"/admin/v1/holds/{placed.json()['hold_id']}/release", json={"note": "lapsed"}, headers=gw.admin)
    assert public(gw, held["token"]).status_code == 200

    # Removed by moderation.
    removed_job = standard_video(gw, media, key)
    removed = share(gw, removed_job, me).json()
    with gw.state.session() as s, s.begin():
        standard_jobs.purge(gw.state, s, s.get(StandardJob, removed_job), "removed", time.time())
    expect_gone(gw, removed["token"])
    assert owner_status(gw, me, removed["share_id"]) == "video_removed"

    # Deleted by the owner, in both modes.
    deleted = share(gw, job, me).json()
    private_job, _ = _private_job(gw, account_id, media.clip)
    sign(gw, private_job, media.clip)
    private = share(gw, private_job, me).json()
    assert public(gw, private["token"], "/video").status_code == 200
    for job_id in (job, private_job):
        assert gw.client.delete(f"/v1/videos/{job_id}", headers=me).status_code == 204
    for link in (deleted, private):
        expect_gone(gw, link["token"])
        assert owner_status(gw, me, link["share_id"]) == "video_deleted"
    assert share(gw, job, me).json()["detail"]["code"] == "deleted"

    # Account closure (another module calls shares.revoke_account).
    still = standard_video(gw, media, key)
    open_link = share(gw, still, me).json()
    with gw.state.session() as s, s.begin():
        # Every link not yet ended: this one, and the removed video's (removal hides a link without ending it).
        assert shares.revoke_account(s, account_id) == 2
    expect_gone(gw, open_link["token"])
    assert owner_status(gw, me, open_link["share_id"]) == "account_closed"


def test_making_a_link_checks_ownership_readiness_expiry_limits_and_standing(gw, media, monkeypatch):
    account_id, key = new_account(gw)
    other_id, other_key = new_account(gw)
    me = session_for(gw, account_id)
    job = standard_video(gw, media, key)

    assert share(gw, job, other_key, path="/v1/videos/{job_id}/shares").status_code == 404
    assert share(gw, str(uuid.uuid4()), me).status_code == 404
    queued = create_standard(gw, key)["job_id"]
    assert share(gw, queued, me).json()["detail"]["code"] == "not_ready"
    for expires_at in (time.time() - 10, time.time() + 30, time.time() + 11 * 365 * 86400):
        answer = share(gw, job, me, expires_at=expires_at)
        assert answer.status_code == 422 and answer.json()["detail"]["code"] == "invalid_expiry"
    assert share(gw, job, me, expires_at=time.time() + 86400, note="hi").status_code == 422
    # Session-only routes refuse the API key; the job API routes take both.
    assert gw.client.get("/v1/me/shares", headers=key).status_code == 401
    assert share(gw, job, key).status_code == 401
    assert gw.client.get("/v1/account/shares", headers=me).status_code == 200

    monkeypatch.setattr(shares, "MAX_ACTIVE_PER_JOB", 2)
    first, second = share(gw, job, me).json(), share(gw, job, me).json()
    limited = share(gw, job, me)
    assert limited.status_code == 409 and limited.json()["detail"]["code"] == "too_many_shares"
    gw.client.delete(f"/v1/account/shares/{first['share_id']}", headers=key)
    assert share(gw, job, me).status_code == 201
    assert gw.client.delete(f"/v1/account/shares/{second['share_id']}", headers=other_key).status_code == 404
    assert [r["job_id"] for r in gw.client.get("/v1/account/shares", params={"job_id": job}, headers=key).json()] == [job] * 3
    assert gw.client.get("/v1/account/shares", headers=other_key).json() == []

    with gw.state.session() as s, s.begin():
        moderation.restrict(s, account_id, until=time.time() + 3600, reason="test", source="operator", by="test")
    restricted = share(gw, job, me)
    assert restricted.status_code == 403 and restricted.json()["detail"]["code"] == "account_restricted"
    assert restricted.json()["detail"]["restricted_until"] > time.time()

    for token in ("short", "!" * 43, b64e(b"\x00" * 32)):
        assert public(gw, token).status_code == 404


def test_public_routes_are_rate_limited_per_ip_without_keeping_the_address(gw, media):
    account_id, key = new_account(gw)
    token = share(gw, standard_video(gw, media, key), key, path="/v1/videos/{job_id}/shares").json()["token"]
    gw.settings.share_views_per_minute_per_ip = 3
    answers = [public(gw, token, suffix, ip="203.0.113.5").status_code for suffix in ("", "/video", "")]
    assert answers == [200, 200, 200]
    limited = public(gw, token, "/video", ip="203.0.113.5")
    assert limited.status_code == 429 and limited.json()["detail"]["code"] == "rate_limited"
    assert public(gw, "x" * 43, ip="203.0.113.5").status_code == 429
    assert public(gw, token, ip="203.0.113.6").status_code == 200
    keys = " ".join(getattr(gw.state.limiter, "_hits", {}).keys())
    assert "share-views:" in keys and "203.0.113" not in keys
