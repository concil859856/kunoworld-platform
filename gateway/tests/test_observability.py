"""Logs, request ids, metrics and Sentry scrubbing, on a throwaway FastAPI app.

Needs `prometheus-client` (and `httpx` for TestClient); the metrics tests skip without it.
"""

from __future__ import annotations

import io
import json
import logging
import time

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from kuno_gateway import observability
from kuno_gateway.db import Account, Base, Job, LedgerEntry
from kuno_gateway.observability import configure_logging, install, redact, scrub_event

prometheus = pytest.importorskip("prometheus_client")

QUIET = {"KUNO_LOG_CONFIGURE": "0"}
SECRET_KEY = "kw_live_" + "S3cr3tS3cr3tS3cr3tS3cr3t"
CIPHERTEXT = "Q2lwaGVydGV4dA" * 40  # 560 base64 characters


@pytest.fixture
def restore_logging():
    root = logging.getLogger()
    saved = (root.handlers[:], root.level, logging.getLogger("uvicorn.access").disabled)
    yield
    root.handlers[:] = saved[0]
    root.setLevel(saved[1])
    logging.getLogger("uvicorn.access").disabled = saved[2]


def throwaway_app(env=None, maker=None) -> tuple[FastAPI, observability.Observability]:
    app = FastAPI()
    app_log = logging.getLogger("kuno.test.app")

    @app.get("/items/{item_id}")
    async def item(item_id: int, request: Request):
        app_log.info("looked up item %s", item_id)
        return {"item_id": item_id, "request_id": request.state.request_id}

    @app.post("/echo")
    async def echo(request: Request):
        body = await request.body()
        app_log.info("received %d bytes", len(body))
        return {"n": len(body)}

    @app.get("/boom")
    async def boom():
        raise RuntimeError("kaboom")

    @app.get("/healthz")
    async def healthz():
        return {"ok": True}

    obs = install(app, None, env={**QUIET, **(env or {})}, sessionmaker=maker)
    return app, obs


def sample(obs, name: str, **labels) -> float:
    value = obs.metrics.registry.get_sample_value(name, labels)
    return 0.0 if value is None else value


# ------------------------------------------------------------ request ids


def test_request_id_is_generated_and_returned():
    app, _ = throwaway_app()
    with TestClient(app) as client:
        response = client.get("/items/1")
    request_id = response.headers["x-request-id"]
    assert len(request_id) == 32
    assert response.json()["request_id"] == request_id


def test_well_formed_incoming_request_id_is_propagated_and_bad_ones_replaced():
    app, _ = throwaway_app()
    with TestClient(app) as client:
        kept = client.get("/items/1", headers={"x-request-id": "edge-abc.123:9"})
        replaced = client.get("/items/1", headers={"x-request-id": "evil\nlog line " + "x" * 200})
    assert kept.headers["x-request-id"] == "edge-abc.123:9"
    assert kept.json()["request_id"] == "edge-abc.123:9"
    assert replaced.headers["x-request-id"] != "evil" and len(replaced.headers["x-request-id"]) == 32


# ------------------------------------------------------------ logging


def test_json_logs_carry_the_request_id_and_no_secrets(restore_logging):
    stream = io.StringIO()
    configure_logging("INFO", "json", stream=stream)
    app, _ = throwaway_app()
    with TestClient(app) as client:
        response = client.post(
            "/echo?token=querysecret",
            content=CIPHERTEXT.encode(),
            headers={"authorization": f"Bearer {SECRET_KEY}", "x-request-id": "req-1"},
        )
        client.get("/items/7")
    assert response.status_code == 200
    output = stream.getvalue()
    lines = [json.loads(line) for line in output.splitlines()]
    for forbidden in (SECRET_KEY, CIPHERTEXT[:64], "querysecret", "Bearer"):
        assert forbidden not in output

    app_line = next(line for line in lines if line["logger"] == "kuno.test.app" and "bytes" in line["msg"])
    assert app_line["request_id"] == "req-1"
    access = [line for line in lines if line["logger"] == "kuno.access"]
    assert {(a["route"], a["status"]) for a in access} == {("/echo", 200), ("/items/{item_id}", 200)}
    assert all("duration_ms" in a and a["level"] == "info" for a in access)


def test_formatter_redacts_messages_and_drops_sensitive_extras(restore_logging):
    stream = io.StringIO()
    configure_logging("INFO", "json", stream=stream)
    logger = logging.getLogger("kuno.test.redaction")
    logger.info(
        "headers were Authorization: Bearer abc.def and key %s and blob %s", SECRET_KEY, CIPHERTEXT,
        extra={"ciphertext": CIPHERTEXT, "authorization": "Bearer x", "prompt": "a cat", "job_id": "j1", "body": b"raw"},
    )
    try:
        raise ValueError(f"bad envelope {CIPHERTEXT}")
    except ValueError:
        logger.exception("failed")
    out = stream.getvalue()
    first, second = (json.loads(line) for line in out.splitlines())
    assert "abc.def" not in out and SECRET_KEY not in out and CIPHERTEXT[:64] not in out and "a cat" not in out
    assert first["job_id"] == "j1"
    assert not {"ciphertext", "authorization", "prompt", "body"} & set(first)
    assert "[redacted 560 chars]" in first["msg"] and "kw_live_[redacted]" in first["msg"]
    assert "ValueError" in second["exc"]


def test_configure_logging_replaces_basic_config_handler(restore_logging):
    logging.basicConfig(level=logging.INFO)  # what kuno-gateway's main() does today
    configure_logging("INFO", "text", stream=io.StringIO())
    configure_logging("INFO", "json", stream=io.StringIO())
    ours = [h for h in logging.getLogger().handlers if getattr(h, "_kuno", False)]
    plain = [h for h in logging.getLogger().handlers if type(h) is logging.StreamHandler]
    assert len(ours) == 1 and plain == ours


def test_text_format_is_redacted_too(restore_logging):
    stream = io.StringIO()
    configure_logging("INFO", "text", stream=stream)
    logging.getLogger("kuno.test.text").info("auth=Bearer %s", SECRET_KEY)
    assert SECRET_KEY not in stream.getvalue() and "[-]" in stream.getvalue()
    assert redact("cookie: kws_abcdef") == "cookie: [redacted]"


# ------------------------------------------------------------ http metrics


def test_requests_are_counted_by_route_template():
    app, obs = throwaway_app()
    with TestClient(app, raise_server_exceptions=False) as client:
        for n in (1, 2, 3):
            client.get(f"/items/{n}")
        client.get("/items/not-a-number")  # 422, same template
        client.get("/nowhere/at/all")
        client.get("/boom")
    assert sample(obs, "kuno_http_requests_total", method="GET", route="/items/{item_id}", status="200") == 3
    assert sample(obs, "kuno_http_requests_total", method="GET", route="/items/{item_id}", status="422") == 1
    assert sample(obs, "kuno_http_requests_total", method="GET", route="<unmatched>", status="404") == 1
    assert sample(obs, "kuno_http_requests_total", method="GET", route="/boom", status="500") == 1
    assert sample(obs, "kuno_http_request_duration_seconds_count", method="GET", route="/items/{item_id}") == 4
    assert sample(obs, "kuno_http_requests_in_flight") == 0
    # No raw paths as labels.
    assert "/items/1" not in obs.metrics.render()[0].decode()


def test_metrics_endpoint_open_without_token():
    app, _ = throwaway_app()
    with TestClient(app) as client:
        client.get("/items/1")
        response = client.get("/metrics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert 'kuno_http_requests_total{method="GET",route="/items/{item_id}",status="200"} 1.0' in response.text
    assert "process_cpu_seconds_total" in response.text or "python_info" in response.text


def test_metrics_endpoint_requires_token_when_configured():
    app, _ = throwaway_app(env={"KUNO_METRICS_TOKEN": "metrics-token-123"})
    with TestClient(app) as client:
        assert client.get("/metrics").status_code == 401
        assert client.get("/metrics", headers={"authorization": "Bearer wrong"}).status_code == 401
        assert client.get("/metrics", headers={"authorization": "Basic metrics-token-123"}).status_code == 401
        ok = client.get("/metrics", headers={"authorization": "Bearer metrics-token-123"})
    assert ok.status_code == 200 and "kuno_http_requests_total" in ok.text


def test_metrics_can_be_disabled():
    app, obs = throwaway_app(env={"KUNO_METRICS_ENABLED": "0"})
    with TestClient(app) as client:
        assert client.get("/metrics").status_code == 404
        assert "x-request-id" in client.get("/items/1").headers
    assert obs.metrics is None


def test_install_is_idempotent():
    app, obs = throwaway_app()
    assert install(app, None, env=QUIET) is obs


# ------------------------------------------------------------ job and ledger metrics


def _job(status: str = "queued") -> Job:
    from kuno_protocol.profiles import Mode
    from kuno_protocol.schemas import GenerationParams

    params = GenerationParams(
        profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24
    ).model_dump_json()
    now = time.time()
    return Job(
        id="job-1", account_id="acct", profile_id="ltx-2.5-fast", enclave_id="e" * 32, params=params, enc="x",
        ciphertext="y", input_blob_ids="[]", status=status, progress=0.0, price_usd=0.1, created_at=now, updated_at=now,
    )


def _entry(key: str, amount: int, kind: str = "debit", source: str = "job") -> LedgerEntry:
    return LedgerEntry(
        id=key[-32:], account_id="acct", amount_micros=amount, kind=kind, source=source, idempotency_key=key,
        balance_after_micros=0, created_at=time.time(),
    )


def test_job_transitions_and_ledger_postings_count_on_commit_only(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'm.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(engine, expire_on_commit=False)
    app, obs = throwaway_app(maker=maker)

    with maker() as s, s.begin():
        s.add(Account(id="acct", name="A", balance_micros=0, is_validator=False, created_at=time.time()))
        s.add(_job())
        s.add(_entry("debit:job-1", -100_000))
    assert sample(obs, "kuno_job_state_transitions_total", from_state="none", to_state="queued") == 1
    assert sample(obs, "kuno_ledger_postings_total", kind="debit", source="job") == 1

    with maker() as s, s.begin():
        job = s.get(Job, "job-1")
        job.status = "running"
        s.flush()
        job.progress = 0.5  # not a state change
        s.flush()
        job.status = "succeeded"
    assert sample(obs, "kuno_job_state_transitions_total", from_state="queued", to_state="running") == 1
    assert sample(obs, "kuno_job_state_transitions_total", from_state="running", to_state="succeeded") == 1

    # Rolled back: nothing counted, and nothing leaks into the next commit.
    with pytest.raises(RuntimeError):
        with maker() as s, s.begin():
            s.get(Job, "job-1").status = "failed"
            s.add(_entry("refund:job-1", 100_000, kind="refund"))
            s.flush()
            raise RuntimeError("abort")
    with maker() as s, s.begin():
        s.add(_entry("adjust:acct", 5, kind="adjustment", source="admin"))
    assert sample(obs, "kuno_job_state_transitions_total", from_state="running", to_state="failed") == 0
    assert sample(obs, "kuno_ledger_postings_total", kind="refund", source="job") == 0
    assert sample(obs, "kuno_ledger_postings_total", kind="adjustment", source="admin") == 1

    with TestClient(app) as client:
        text = client.get("/metrics").text
    assert 'kuno_job_state_transitions_total{from_state="queued",to_state="running"} 1.0' in text


def test_installs_on_the_real_gateway_app(tmp_path, restore_logging):
    """install() finds GatewayState.Session on the gateway app; a janitor refund is counted."""
    from kuno_protocol import devkit

    from kuno_gateway.app import create_app
    from kuno_gateway.settings import Settings

    devkit.init(tmp_path / "data")
    app = create_app(Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")}))
    obs = install(app, app.state.gw.settings, env={"KUNO_LOG_CONFIGURE": "0", "KUNO_METRICS_TOKEN": "t"})
    state = app.state.gw
    with state.session() as s, s.begin():
        s.add(Account(id="acct", name="A", balance_micros=0, is_validator=False, created_at=time.time()))
        s.add(_job())  # its enclave doesn't exist, so the janitor fails it and refunds
    state.janitor()
    with TestClient(app) as client:
        assert client.get("/healthz").status_code == 200
        text = client.get("/metrics", headers={"authorization": "Bearer t"}).text
    assert 'route="/healthz",status="200"' in text
    assert sample(obs, "kuno_job_state_transitions_total", from_state="queued", to_state="failed") == 1
    assert sample(obs, "kuno_ledger_postings_total", kind="refund", source="job") == 1


# ------------------------------------------------------------ sentry


def test_sentry_events_are_scrubbed():
    event = {
        "request": {
            "url": "https://api.kunoworld.com/v1/blobs?token=abc",
            "query_string": "token=abc",
            "data": CIPHERTEXT,
            "cookies": {"kws": "kws_secret"},
            "headers": {"Authorization": f"Bearer {SECRET_KEY}", "User-Agent": "sdk/1", "X-Api-Key": "k", "Cookie": "c=1"},
        },
        "exception": {"values": [{"value": f"bad {CIPHERTEXT}", "stacktrace": {"frames": [{"vars": {"data": CIPHERTEXT}}]}}]},
        "extra": {"ciphertext": CIPHERTEXT, "job_id": "j"},
        "breadcrumbs": {"values": [{"message": f"Authorization: Bearer {SECRET_KEY}", "data": {"url": "http://x/?k=v"}}]},
    }
    scrubbed = json.dumps(scrub_event(event))
    for forbidden in (SECRET_KEY, CIPHERTEXT[:64], "token=abc", "kws_secret", "c=1", "k=v"):
        assert forbidden not in scrubbed
    assert event["request"]["headers"] == {"User-Agent": "sdk/1"}
    assert event["extra"] == {"job_id": "j"}


def test_sentry_initialised_only_with_dsn(monkeypatch):
    calls = []
    monkeypatch.setattr(observability, "init_sentry", lambda *args: calls.append(args) or True)
    _, without = throwaway_app()
    _, with_dsn = throwaway_app(env={"SENTRY_DSN": "https://public@sentry.invalid/1", "SENTRY_ENVIRONMENT": "test"})
    assert (without.sentry, with_dsn.sentry) == (False, True)
    # FastAPI's default app version is 0.1.0; the gateway's create_app sets its own.
    assert calls == [("https://public@sentry.invalid/1", "test", "kuno-gateway@0.1.0", 0.0)]
    assert "sentry.invalid" not in repr(with_dsn.config)
