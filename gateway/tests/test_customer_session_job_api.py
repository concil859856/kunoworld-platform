"""Customers use the web session for everything, the job API included; API keys are for developers and manage nothing;
studio tokens are retired.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import time
import uuid

import pytest
from test_standard_moderation_flow import (  # fixtures and helpers
    ENCLAVE,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
    render,
)

from kuno_gateway import identity, ledger
from kuno_gateway.db import UserSession


def signed_in_customer(gw, email: str = "ada@example.com") -> tuple[dict, str, str]:
    """(session headers, account id, user id), with $50 of operator credit."""
    with gw.state.session() as s, s.begin():
        user = identity.redeem_login_token(s, identity.issue_login_token(s, email, 900))
        token, _ = identity.open_session(s, user.id, identity.WEB, 3600)
        account_id = identity.account_for_user(s, user.id).id
        ledger.post(s, account_id, ledger.to_micros(50), kind=ledger.ADJUSTMENT, source="admin", idempotency_key=f"t:{account_id}")
    return {"authorization": f"Bearer {token}"}, account_id, user.id


def test_the_web_session_makes_lists_downloads_and_deletes_videos(gw, media):
    session, account_id, _ = signed_in_customer(gw)
    upload = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=session)
    assert upload.status_code == 201
    created = gw.client.post(
        "/v1/standard/videos",
        json={"params": {"profile_id": "ltx-2.5-fast", "mode": "image_to_video", "duration_s": 2, "resolution": "720p",
                         "aspect_ratio": "16:9", "fps": 24, "input_roles": ["first_frame"]},
              "prompt": "a red kite", "inputs": [{"upload_id": upload.json()["upload_id"], "index": 0, "role": "first_frame"}]},
        headers=session,
    )
    assert created.status_code == 201, created.text
    job_id = created.json()["job_id"]
    render(gw, job_id, media.clip)

    assert gw.client.get(f"/v1/videos/{job_id}", headers=session).json()["status"] == "succeeded"
    assert [v["job_id"] for v in gw.client.get("/v1/videos", headers=session).json()] == [job_id]
    assert gw.client.get(f"/v1/standard/videos/{job_id}/video", headers=session).content == media.clip
    assert gw.client.get(f"/v1/me/standard/videos/{job_id}/video", headers=session).content == media.clip
    assert gw.client.get("/v1/account", headers=session).json()["account_id"] == account_id
    # A private upload works with the session too.
    assert gw.client.post("/v1/blobs", content=b"KUNOB1" + b"\x00" * 8, headers=session).status_code == 201

    # Another customer's session sees none of it.
    other, _, _ = signed_in_customer(gw, "grace@example.com")
    assert gw.client.get(f"/v1/standard/videos/{job_id}/video", headers=other).status_code == 404
    assert gw.client.delete(f"/v1/videos/{job_id}", headers=other).status_code == 404

    assert gw.client.delete(f"/v1/videos/{job_id}", headers=session).status_code == 204
    assert gw.client.get(f"/v1/standard/videos/{job_id}/video", headers=session).json()["detail"]["code"] == "deleted"


def test_api_keys_run_jobs_but_manage_nothing(gw):
    session, account_id, _ = signed_in_customer(gw)
    created = gw.client.post("/v1/me/keys", json={"name": "render farm"}, headers=session)
    key = {"authorization": f"Bearer {created.json()['key']}"}
    assert gw.client.get("/v1/account", headers=key).json()["account_id"] == account_id
    assert gw.client.get("/v1/standard/videos", headers=key).status_code == 200
    for method, path, body in (
        ("GET", "/v1/me", None), ("GET", "/v1/me/keys", None), ("POST", "/v1/me/keys", {"name": "another"}),
        ("DELETE", f"/v1/me/keys/{created.json()['key_id']}", None), ("GET", "/v1/me/topups", None),
        ("POST", "/v1/me/topups/card", {"amount_usd": 25}), ("GET", "/v1/me/wallets", None), ("GET", "/v1/me/eligibility", None),
        ("POST", "/v1/auth/logout", None), ("POST", "/v1/me/studio-token", None),
    ):
        assert gw.client.request(method, path, json=body, headers=key).status_code in (401, 410), (method, path)


def test_studio_tokens_are_retired_and_old_ones_stop_working(gw):
    session, _, user_id = signed_in_customer(gw)
    retired = gw.client.post("/v1/me/studio-token", headers=session)
    assert retired.status_code == 410
    assert retired.json()["detail"]["code"] == "gone" and "web session" in retired.json()["detail"]["message"]

    # A studio token issued before the change, still unexpired in the database.
    legacy = "kwt_" + uuid.uuid4().hex
    now = time.time()
    with gw.state.session() as s, s.begin():
        parent = s.query(UserSession).filter(UserSession.user_id == user_id).first()
        s.add(UserSession(id=uuid.uuid4().hex, token_hash=identity.hash_secret(legacy), user_id=user_id, kind="studio",
                          parent_id=parent.id, created_at=now, expires_at=now + 3600))
    assert gw.client.get("/v1/account", headers={"authorization": f"Bearer {legacy}"}).status_code == 401
    with pytest.raises(ValueError):
        with gw.state.session() as s, s.begin():
            identity.open_session(s, user_id, "studio", 60)
