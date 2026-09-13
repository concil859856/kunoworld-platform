"""Limits on the job API, validator-only feeds, shared nonces, and signed, retried webhooks."""

from __future__ import annotations

import hashlib
import hmac
import http.server
import json
import threading
import time
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from kuno_gateway import webhooks
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Enclave, Job, WebhookDelivery
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState
from kuno_protocol import devkit
from kuno_protocol.profiles import Mode
from kuno_protocol.schemas import GenerationParams, JobState

PARAMS = GenerationParams(
    profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24
)


@pytest.fixture
def settings(tmp_path) -> Settings:
    devkit.init(tmp_path / "data")
    return Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})


def bearer(key: str) -> dict:
    return {"authorization": f"Bearer {key}"}


def add_enclave(state: GatewayState) -> None:
    now = time.time()
    with state.session() as s, s.begin():
        s.add(
            Enclave(
                id="e" * 32, miner_hotkey="5Miner", tee="mock", image_digest=devkit.DEV_IMAGE_DIGEST,
                hpke_public_key="x", signing_public_key="y", profiles=json.dumps(["ltx-2.5-fast"]), hardware="{}",
                evidence="{}", capacity=1, inflight=0, status="active", verified_at=now, last_seen=now,
            )
        )


def job_body(**extra) -> dict:
    return {
        "job_id": str(uuid.uuid4()), "params": PARAMS.model_dump(mode="json"), "enclave_id": "e" * 32,
        "enc": "AAAA", "ciphertext": "AAAA", "input_blob_ids": [], **extra,
    }


def app_and_state(settings: Settings):
    app = create_app(settings)
    state: GatewayState = app.state.gw
    add_enclave(state)
    return TestClient(app), state


def balance_micros(state: GatewayState, account_id: str = "dev") -> int:
    with state.session() as s:
        return s.get(Account, account_id).balance_micros


# ------------------------------------------------------------------ limits


def test_starting_too_many_videos_a_minute_is_refused_and_not_charged(settings):
    settings.jobs_per_minute = 3
    client, state = app_and_state(settings)
    before = balance_micros(state)
    codes = [client.post("/v1/videos", json=job_body(), headers=bearer(settings.dev_api_key)).status_code for _ in range(4)]
    assert codes == [201, 201, 201, 429]
    price = round(state.profiles["ltx-2.5-fast"].price_usd(PARAMS) * 1_000_000)
    assert balance_micros(state) == before - 3 * price


def test_an_account_can_only_have_so_many_videos_in_progress(settings):
    settings.max_active_jobs = 2
    client, state = app_and_state(settings)
    dev = bearer(settings.dev_api_key)
    created = [client.post("/v1/videos", json=job_body(), headers=dev) for _ in range(3)]
    assert [r.status_code for r in created] == [201, 201, 429]
    assert created[2].json()["detail"]["code"] == "too_many_active_jobs"

    with state.session() as s, s.begin():
        state.finish_job(s, s.get(Job, created[0].json()["job_id"]), JobState.CANCELED, "canceled", "Canceled.")
    assert client.post("/v1/videos", json=job_body(), headers=dev).status_code == 201


def test_validators_are_not_rate_limited(settings):
    settings.jobs_per_minute = 1
    settings.max_active_jobs = 1
    client, _ = app_and_state(settings)
    codes = [client.post("/v1/videos", json=job_body(), headers=bearer(settings.validator_api_key)).status_code for _ in range(4)]
    assert codes == [201] * 4


def test_oversized_bodies_are_refused_before_being_read(settings):
    settings.max_json_body_bytes = 2_000
    settings.max_blob_bytes = 1_000
    client, _ = app_and_state(settings)
    dev = bearer(settings.dev_api_key)

    big = client.post("/v1/videos", json=job_body(ciphertext="A" * 5_000), headers=dev)
    assert big.status_code == 413 and big.json()["detail"]["code"] == "too_large"

    blob = b"KUNOB1" + b"\0" * 2_000
    assert client.post("/v1/blobs", content=blob, headers=dev).status_code == 413
    # Without a Content-Length the bytes are still counted.
    chunked = client.post("/v1/blobs", content=iter([blob[:600], blob[600:]]), headers=dev)
    assert chunked.status_code == 413
    assert client.post("/v1/blobs", content=b"KUNOB1" + b"\0" * 100, headers=dev).status_code == 201


# ------------------------------------------------------------------ validator feeds


def test_validator_feeds_need_a_validator_key(settings):
    client, _ = app_and_state(settings)
    for path in ("/validator/v1/enclaves", "/validator/v1/ledger"):
        assert client.get(path).status_code == 401
        assert client.get(path, headers=bearer(settings.dev_api_key)).status_code == 403
        assert client.get(path, headers=bearer(settings.validator_api_key)).status_code == 200


# ------------------------------------------------------------------ nonces and shared limits


def test_a_nonce_is_single_use_across_gateway_processes(settings):
    first, second = GatewayState(settings), GatewayState(settings)
    nonce = first.issue_nonce()
    assert second.consume_nonce(nonce) is True
    assert first.consume_nonce(nonce) is False
    assert second.consume_nonce("0" * 64) is False


def test_the_database_rate_limit_is_shared_across_processes(settings):
    settings.rate_limit_backend = "database"
    first, second = GatewayState(settings), GatewayState(settings)
    results = [(first if i % 2 else second).limiter.allow("jobs:dev", 3, 60, now=1_000) for i in range(5)]
    assert results == [True, True, True, False, False]
    # A new window starts fresh.
    assert first.limiter.allow("jobs:dev", 3, 60, now=1_061) is True


# ------------------------------------------------------------------ webhooks


def test_webhook_destinations_must_be_public_https():
    for url in (
        "http://93.184.216.34/hook",
        "https://127.0.0.1/hook",
        "https://10.0.0.5/hook",
        "https://169.254.169.254/latest/meta-data",
        "https://[::1]/hook",
        "https://[::ffff:127.0.0.1]/hook",
        "https://user:secret@93.184.216.34/hook",
        "ftp://93.184.216.34/hook",
    ):
        with pytest.raises(webhooks.InvalidWebhookUrl):
            webhooks.check_url(url)
    webhooks.check_url("https://93.184.216.34/hook")
    webhooks.check_url("http://127.0.0.1:9000/hook", allow_private=True)


def test_a_private_webhook_is_refused_before_anything_is_charged(settings):
    client, state = app_and_state(settings)
    before = balance_micros(state)
    response = client.post("/v1/videos", json=job_body(webhook_url="https://127.0.0.1/hook"), headers=bearer(settings.dev_api_key))
    assert response.status_code == 422 and response.json()["detail"]["code"] == "invalid_webhook_url"
    assert balance_micros(state) == before


def recording_server(responses: list[int]):
    received: list[tuple[dict, bytes]] = []

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_POST(self):
            body = self.rfile.read(int(self.headers["content-length"]))
            received.append(({k.lower(): v for k, v in self.headers.items()}, body))
            self.send_response(responses.pop(0) if responses else 200)
            self.end_headers()

        def log_message(self, *args):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, received


def test_a_finished_job_is_posted_signed_and_retried_until_it_lands(settings):
    settings.allow_private_webhooks = True
    server, received = recording_server([500])
    try:
        client, state = app_and_state(settings)
        dev = bearer(settings.dev_api_key)
        url = f"http://127.0.0.1:{server.server_address[1]}/hook"
        job_id = client.post("/v1/videos", json=job_body(webhook_url=url), headers=dev).json()["job_id"]
        with state.session() as s, s.begin():
            state.finish_job(s, s.get(Job, job_id), JobState.FAILED, "timeout", "The worker did not finish in time.")

        assert webhooks.deliver_due(state) == 0
        with state.session() as s, s.begin():
            delivery = s.scalars(select(WebhookDelivery).where(WebhookDelivery.job_id == job_id)).one()
            assert (delivery.status, delivery.attempts, delivery.last_status_code) == ("pending", 1, 500)
            assert delivery.next_attempt_at > time.time()
            delivery.next_attempt_at = 0

        assert webhooks.deliver_due(state) == 1
        assert webhooks.deliver_due(state) == 0  # delivered once, not again

        headers, body = received[-1]
        timestamp, signature = (part.split("=", 1)[1] for part in headers["kunoworld-signature"].split(","))
        secret = client.get("/v1/account/webhook-secret", headers=dev).json()["secret"]
        assert hmac.compare_digest(signature, hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest())

        event = json.loads(body)
        assert event["event"] == "job.failed" and event["data"]["job_id"] == job_id and event["data"]["error_code"] == "timeout"
        assert "ciphertext" not in body.decode() and "enc" not in event["data"]
    finally:
        server.shutdown()


def test_a_delivery_gives_up_after_the_last_attempt(settings):
    settings.allow_private_webhooks = True
    settings.webhook_max_attempts = 2
    server, _ = recording_server([500, 500, 500])
    try:
        client, state = app_and_state(settings)
        url = f"http://127.0.0.1:{server.server_address[1]}/hook"
        job_id = client.post("/v1/videos", json=job_body(webhook_url=url), headers=bearer(settings.dev_api_key)).json()["job_id"]
        with state.session() as s, s.begin():
            state.finish_job(s, s.get(Job, job_id), JobState.CANCELED, "canceled", "Canceled.")
        for _ in range(3):
            with state.session() as s, s.begin():
                for d in s.scalars(select(WebhookDelivery)).all():
                    d.next_attempt_at = 0
            webhooks.deliver_due(state)
        with state.session() as s:
            delivery = s.scalars(select(WebhookDelivery).where(WebhookDelivery.job_id == job_id)).one()
        assert (delivery.status, delivery.attempts) == ("failed", 2)
    finally:
        server.shutdown()


def test_rotating_the_webhook_secret_replaces_it(settings):
    client, _ = app_and_state(settings)
    dev = bearer(settings.dev_api_key)
    first = client.get("/v1/account/webhook-secret", headers=dev).json()["secret"]
    assert first == client.get("/v1/account/webhook-secret", headers=dev).json()["secret"]
    rotated = client.post("/v1/account/webhook-secret/rotate", headers=dev).json()["secret"]
    assert rotated.startswith("whsec_") and rotated != first
