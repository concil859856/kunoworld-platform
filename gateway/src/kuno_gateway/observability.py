"""Structured logs, request ids, Prometheus metrics and optional Sentry for the gateway.

`install(app, settings)` wires all of it into a FastAPI app:

* JSON logs on stdout, one object per line, carrying the request id of the request that
  produced them. Messages are redacted (bearer tokens, KunoWorld keys, long base64 runs)
  and extra fields named like secrets or payloads are dropped.
* An ASGI middleware that accepts a well-formed incoming `x-request-id` (or makes one),
  returns it on the response and writes one access-log line per request using the
  *route template* (`/v1/jobs/{job_id}`), never the raw URL, query string, headers or body.
* Prometheus metrics on their own registry: HTTP requests and latency by route template,
  job state transitions and ledger postings (counted when the transaction commits),
  served at `/metrics`, behind a bearer token when one is configured.
* Sentry when `SENTRY_DSN` is set and `sentry-sdk` is installed, with request bodies,
  cookies, query strings, non-allowlisted headers and local variables stripped.

Configuration comes from attributes on the settings object when present, else from the
environment:

    settings attr               env var                     default
    log_format                  KUNO_LOG_FORMAT             json      (json | text)
    log_level                   KUNO_LOG_LEVEL              INFO
    configure_logs              KUNO_LOG_CONFIGURE          1
    access_log                  KUNO_ACCESS_LOG             1
    metrics_enabled             KUNO_METRICS_ENABLED        1
    metrics_token               KUNO_METRICS_TOKEN          (none: /metrics is open)
    sentry_dsn                  SENTRY_DSN                  (none: Sentry off)
    sentry_environment          SENTRY_ENVIRONMENT
    sentry_traces_sample_rate   SENTRY_TRACES_SAMPLE_RATE   0

`prometheus-client` and `sentry-sdk` are optional: without them the metrics or Sentry parts
are skipped with a warning and the rest still works.

When running under uvicorn, pass `log_config=None` to `uvicorn.run` so uvicorn doesn't
replace these handlers; its own access log is disabled in favour of `kuno.access`.
Metrics are per process; running several uvicorn workers needs prometheus multiprocess mode.
"""

from __future__ import annotations

import contextvars
import hmac
import json
import logging
import os
import re
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from starlette.requests import Request
from starlette.responses import PlainTextResponse, Response

log = logging.getLogger("kuno.observability")
access_log = logging.getLogger("kuno.access")

REQUEST_ID_HEADER = "x-request-id"
_REQUEST_ID_OK = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")
_request_id: contextvars.ContextVar[str | None] = contextvars.ContextVar("kuno_request_id", default=None)

UNMATCHED_ROUTE = "<unmatched>"
_QUIET_ROUTES = {"/healthz"}


def current_request_id() -> str | None:
    return _request_id.get()


# ================================================================== redaction

_REDACTIONS: list[tuple[re.Pattern[str], Any]] = [
    # Authorization: Bearer <token> / Basic <creds>
    (re.compile(r"(?i)\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]+"), r"\1 [redacted]"),
    # authorization=..., "cookie": "...", x-api-key: ...
    (re.compile(r"(?i)\b(authorization|proxy-authorization|cookie|set-cookie|x-api-key)(['\"]?\s*[:=]\s*['\"]?)[^'\"\s,}]+"), r"\1\2[redacted]"),
    # Credentials in URL query strings, including S3 presigned-URL signatures.
    (re.compile(r"(?i)([?&](?:token|access_token|api_key|key|code|signature|sig|secret|password|x-amz-signature|x-amz-credential|x-amz-security-token)=)[^&\s\"'#]+"), r"\1[redacted]"),
    # API keys, web sessions, studio tokens and the dev kit's keys.
    (re.compile(r"\b(kw_live_|kws_|kwt_|kuno_dev_|kuno_val_)[A-Za-z0-9_-]+"), r"\1[redacted]"),
    # Long base64/hex runs: ciphertext, HPKE encapsulations, raw keys.
    (re.compile(r"[A-Za-z0-9+/_=-]{200,}"), lambda m: f"[redacted {len(m.group(0))} chars]"),
]

SENSITIVE_FIELDS = frozenset(
    {
        "authorization", "proxy-authorization", "cookie", "cookies", "set-cookie", "headers",
        "body", "request_body", "content", "data", "payload", "ciphertext", "enc", "prompt",
        "negative_prompt", "shots", "brief", "style", "plan", "password", "secret", "token", "api_key", "x-api-key", "key",
    }
)
_MAX_FIELD_CHARS = 2000
_MAX_EXC_CHARS = 8000


def redact(text: str) -> str:
    for pattern, replacement in _REDACTIONS:
        text = pattern.sub(replacement, text)
    return text


def _clean(value: Any, depth: int = 0) -> Any:
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, bytes):
        return f"[{len(value)} bytes]"
    if depth < 4 and isinstance(value, dict):
        return {str(k): _clean(v, depth + 1) for k, v in value.items() if str(k).lower() not in SENSITIVE_FIELDS}
    if depth < 4 and isinstance(value, (list, tuple, set)):
        return [_clean(v, depth + 1) for v in list(value)[:50]]
    return redact(str(value))[:_MAX_FIELD_CHARS]


# ================================================================== logging

_STANDARD_ATTRS = frozenset(vars(logging.makeLogRecord({}))) | {"message", "asctime", "taskName", "request_id"}


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not getattr(record, "request_id", None):
            record.request_id = _request_id.get() or "-"
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        try:
            message = record.getMessage()
        except Exception:
            message = str(record.msg)
        payload: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname.lower(),
            "logger": record.name,
            "msg": redact(message)[:_MAX_FIELD_CHARS],
        }
        request_id = getattr(record, "request_id", None) or _request_id.get()
        if request_id and request_id != "-":
            payload["request_id"] = request_id
        for key, value in record.__dict__.items():
            if key in _STANDARD_ATTRS or key.startswith("_") or key in payload or key.lower() in SENSITIVE_FIELDS:
                continue
            payload[key] = _clean(value)
        if record.exc_info:
            payload["exc"] = redact(self.formatException(record.exc_info))[-_MAX_EXC_CHARS:]
        if record.stack_info:
            payload["stack"] = redact(self.formatStack(record.stack_info))[-_MAX_EXC_CHARS:]
        return json.dumps(payload, default=str, ensure_ascii=False)


class RedactingTextFormatter(logging.Formatter):
    def __init__(self) -> None:
        super().__init__("%(asctime)s %(levelname)s %(name)s [%(request_id)s] %(message)s")

    def format(self, record: logging.LogRecord) -> str:
        return redact(super().format(record))


def configure_logging(level: str | int = "INFO", fmt: str = "json", stream: Any = None) -> logging.Handler:
    """Points the root logger at one stdout handler. Replaces plain StreamHandlers (such as
    the one `logging.basicConfig` adds) and any handler this function added before; other
    handlers (pytest's capture, Sentry's) are left alone."""
    root = logging.getLogger()
    for handler in list(root.handlers):
        if getattr(handler, "_kuno", False) or type(handler) is logging.StreamHandler:
            root.removeHandler(handler)
    handler = logging.StreamHandler(stream if stream is not None else sys.stdout)
    handler._kuno = True  # type: ignore[attr-defined]
    handler.setFormatter(JsonFormatter() if fmt == "json" else RedactingTextFormatter())
    handler.addFilter(RequestIdFilter())
    root.addHandler(handler)
    root.setLevel(level if isinstance(level, int) else level.upper())
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = True
    # uvicorn's access log prints raw URLs with query strings; kuno.access replaces it.
    logging.getLogger("uvicorn.access").disabled = True
    # httpx/httpcore log every outbound request's full URL at INFO (webhooks, mail provider).
    for name in ("httpx", "httpcore"):
        logging.getLogger(name).setLevel(logging.WARNING)
    return handler


# ================================================================== metrics

LATENCY_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0)


class Metrics:
    """The gateway's Prometheus metrics, on a registry of their own."""

    def __init__(self, registry: Any = None):
        from prometheus_client import (
            CollectorRegistry,
            Counter,
            Gauge,
            GCCollector,
            Histogram,
            PlatformCollector,
            ProcessCollector,
        )

        if registry is None:
            registry = CollectorRegistry(auto_describe=True)
            ProcessCollector(registry=registry)
            PlatformCollector(registry=registry)
            GCCollector(registry=registry)
        self.registry = registry
        self.http_requests = Counter(
            "kuno_http_requests_total", "HTTP requests by method, route template and status.",
            ["method", "route", "status"], registry=registry,
        )
        self.http_latency = Histogram(
            "kuno_http_request_duration_seconds", "HTTP request latency by method and route template.",
            ["method", "route"], buckets=LATENCY_BUCKETS, registry=registry,
        )
        self.http_in_flight = Gauge("kuno_http_requests_in_flight", "HTTP requests being served.", registry=registry)
        self.job_transitions = Counter(
            "kuno_job_state_transitions_total", "Committed job state changes (from 'none' when a job is created).",
            ["from_state", "to_state"], registry=registry,
        )
        self.ledger_postings = Counter(
            "kuno_ledger_postings_total", "Committed ledger entries by kind and source.",
            ["kind", "source"], registry=registry,
        )

    def render(self) -> tuple[bytes, str]:
        from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

        return generate_latest(self.registry), CONTENT_TYPE_LATEST


_PENDING = "kuno_metrics_pending"


def _state(value: Any) -> str:
    return str(getattr(value, "value", value))


def track_database(target: Any, metrics: Metrics) -> None:
    """Counts job transitions and ledger postings from ORM changes, once they commit.

    `target` is a sessionmaker (e.g. `GatewayState.Session`) or a Session class. Nothing in
    the gateway's code paths needs to call into metrics for this.
    """
    from sqlalchemy import event
    from sqlalchemy import inspect as sa_inspect

    from .db import Job, LedgerEntry

    if getattr(target, "_kuno_metrics", None) is not None:
        return

    def before_flush(session, _flush_context, _instances) -> None:
        pending = session.info.setdefault(_PENDING, [])
        for obj in session.new:
            if isinstance(obj, Job) and obj.status is not None:
                pending.append(("job", "none", _state(obj.status)))
            elif isinstance(obj, LedgerEntry):
                pending.append(("ledger", str(obj.kind), str(obj.source)))
        for obj in session.dirty:
            if isinstance(obj, Job):
                history = sa_inspect(obj).attrs.status.history
                if history.added:
                    old = _state(history.deleted[0]) if history.deleted else "unknown"
                    new = _state(history.added[-1])
                    if old != new:
                        pending.append(("job", old, new))

    def after_commit(session) -> None:
        for kind, a, b in session.info.pop(_PENDING, []):
            if kind == "job":
                metrics.job_transitions.labels(from_state=a, to_state=b).inc()
            else:
                metrics.ledger_postings.labels(kind=a, source=b).inc()

    def after_transaction_end(session, transaction) -> None:
        # Commit has already consumed the list; anything left was rolled back or abandoned.
        if transaction.parent is None:
            session.info.pop(_PENDING, None)

    event.listen(target, "before_flush", before_flush)
    event.listen(target, "after_commit", after_commit)
    event.listen(target, "after_transaction_end", after_transaction_end)
    target._kuno_metrics = metrics


def _bearer_ok(header: str | None, token: str) -> bool:
    scheme, _, credential = (header or "").partition(" ")
    return scheme.lower() == "bearer" and hmac.compare_digest(credential.strip().encode(), token.encode())


def add_metrics_route(app: Any, metrics: Metrics, token: str | None, path: str = "/metrics") -> None:
    async def metrics_endpoint(request: Request) -> Response:
        if token and not _bearer_ok(request.headers.get("authorization"), token):
            return PlainTextResponse("unauthorized\n", status_code=401, headers={"WWW-Authenticate": "Bearer"})
        body, content_type = metrics.render()
        return Response(content=body, media_type=content_type)

    app.add_api_route(path, metrics_endpoint, methods=["GET"], include_in_schema=False)


# ================================================================== middleware


class ObservabilityMiddleware:
    """Request ids, access log and HTTP metrics. Pure ASGI, so streaming responses are untouched."""

    def __init__(self, app: Any, metrics: Metrics | None = None, access_log_enabled: bool = True, quiet_routes: set[str] | None = None):
        self.app = app
        self.metrics = metrics
        self.access_log_enabled = access_log_enabled
        self.quiet_routes = _QUIET_ROUTES if quiet_routes is None else quiet_routes

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        incoming = _header(scope, b"x-request-id")
        request_id = incoming if incoming and _REQUEST_ID_OK.match(incoming) else uuid.uuid4().hex
        token = _request_id.set(request_id)
        scope.setdefault("state", {})["request_id"] = request_id
        _sentry_tag(request_id)
        status = 500
        start = time.perf_counter()
        if self.metrics:
            self.metrics.http_in_flight.inc()

        async def send_with_id(message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                headers = [(k, v) for k, v in message.get("headers", []) if k.lower() != b"x-request-id"]
                headers.append((b"x-request-id", request_id.encode()))
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        except BaseException:
            status = 500
            raise
        finally:
            elapsed = time.perf_counter() - start
            route = scope.get("route")
            template = getattr(route, "path_format", None) or getattr(route, "path", None) or UNMATCHED_ROUTE
            method = scope.get("method", "GET")
            if self.metrics:
                self.metrics.http_in_flight.dec()
                self.metrics.http_requests.labels(method=method, route=template, status=str(status)).inc()
                self.metrics.http_latency.labels(method=method, route=template).observe(elapsed)
            if self.access_log_enabled and not (template in self.quiet_routes and status < 400):
                access_log.info(
                    "%s %s %d %.1fms", method, template, status, elapsed * 1000,
                    extra={"http_method": method, "route": template, "status": status, "duration_ms": round(elapsed * 1000, 2)},
                )
            _request_id.reset(token)


def _header(scope, name: bytes) -> str | None:
    for key, value in scope.get("headers") or []:
        if key.lower() == name:
            try:
                return value.decode("latin-1")
            except Exception:
                return None
    return None


# ================================================================== sentry

_SAFE_HEADERS = frozenset({"user-agent", "content-type", "content-length", "accept", "host", "x-request-id", "cf-ipcountry"})


def scrub_event(event: dict[str, Any], _hint: Any = None) -> dict[str, Any]:
    request = event.get("request")
    if isinstance(request, dict):
        for field in ("data", "cookies", "query_string", "env"):
            request.pop(field, None)
        headers = request.get("headers")
        if isinstance(headers, dict):
            request["headers"] = {k: v for k, v in headers.items() if k.lower() in _SAFE_HEADERS}
        if isinstance(request.get("url"), str):
            request["url"] = request["url"].split("?", 1)[0]
    for exc in (event.get("exception") or {}).get("values") or []:
        if isinstance(exc.get("value"), str):
            exc["value"] = redact(exc["value"])[:_MAX_FIELD_CHARS]
        for frame in (exc.get("stacktrace") or {}).get("frames") or []:
            frame.pop("vars", None)
    logentry = event.get("logentry") or event.get("message")
    if isinstance(logentry, dict):
        for field in ("message", "formatted"):
            if isinstance(logentry.get(field), str):
                logentry[field] = redact(logentry[field])
        logentry.pop("params", None)
    elif isinstance(logentry, str):
        event["message"] = redact(logentry)
    if isinstance(event.get("extra"), dict):
        event["extra"] = _clean(event["extra"])
    breadcrumbs = event.get("breadcrumbs")
    values = breadcrumbs.get("values") if isinstance(breadcrumbs, dict) else breadcrumbs
    for crumb in values or []:
        scrub_breadcrumb(crumb)
    return event


def scrub_breadcrumb(crumb: dict[str, Any], _hint: Any = None) -> dict[str, Any]:
    if isinstance(crumb.get("message"), str):
        crumb["message"] = redact(crumb["message"])[:_MAX_FIELD_CHARS]
    if isinstance(crumb.get("data"), dict):
        data = _clean(crumb["data"])
        if isinstance(data.get("url"), str):
            data["url"] = data["url"].split("?", 1)[0]
        crumb["data"] = data
    return crumb


def init_sentry(dsn: str, environment: str | None = None, release: str | None = None, traces_sample_rate: float = 0.0) -> bool:
    try:
        import sentry_sdk
    except ImportError:
        log.warning("SENTRY_DSN is set but sentry-sdk is not installed; Sentry is off")
        return False
    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        traces_sample_rate=traces_sample_rate,
        send_default_pii=False,
        max_request_body_size="never",
        include_local_variables=False,
        before_send=scrub_event,
        before_send_transaction=scrub_event,
        before_breadcrumb=scrub_breadcrumb,
    )
    return True


def _sentry_tag(request_id: str) -> None:
    sentry = sys.modules.get("sentry_sdk")
    if sentry is None:
        return
    try:
        sentry.get_isolation_scope().set_tag("request_id", request_id)
    except Exception:
        pass


# ================================================================== install


def _truthy(value: Any) -> bool:
    return value if isinstance(value, bool) else str(value).strip().lower() in ("1", "true", "yes", "on")


@dataclass
class ObservabilityConfig:
    log_format: str = "json"
    log_level: str = "INFO"
    configure_logs: bool = True
    access_log: bool = True
    metrics_enabled: bool = True
    metrics_token: str | None = None
    metrics_path: str = "/metrics"
    sentry_dsn: str | None = None
    sentry_environment: str | None = None
    sentry_traces_sample_rate: float = 0.0

    @classmethod
    def from_settings(cls, settings: Any = None, env: dict[str, str] | None = None) -> ObservabilityConfig:
        env = dict(os.environ if env is None else env)

        def pick(attr: str, var: str, default: Any) -> Any:
            value = getattr(settings, attr, None)
            if value is None or value == "":
                value = env.get(var)
            return default if value is None or value == "" else value

        return cls(
            log_format=str(pick("log_format", "KUNO_LOG_FORMAT", "json")).lower(),
            log_level=str(pick("log_level", "KUNO_LOG_LEVEL", "INFO")).upper(),
            configure_logs=_truthy(pick("configure_logs", "KUNO_LOG_CONFIGURE", True)),
            access_log=_truthy(pick("access_log", "KUNO_ACCESS_LOG", True)),
            metrics_enabled=_truthy(pick("metrics_enabled", "KUNO_METRICS_ENABLED", True)),
            metrics_token=pick("metrics_token", "KUNO_METRICS_TOKEN", None),
            sentry_dsn=pick("sentry_dsn", "SENTRY_DSN", None),
            sentry_environment=pick("sentry_environment", "SENTRY_ENVIRONMENT", None),
            sentry_traces_sample_rate=float(pick("sentry_traces_sample_rate", "SENTRY_TRACES_SAMPLE_RATE", 0.0)),
        )

    def __repr__(self) -> str:  # keep the metrics token and DSN out of logs
        return f"ObservabilityConfig(log_format={self.log_format!r}, metrics_enabled={self.metrics_enabled}, sentry={'on' if self.sentry_dsn else 'off'})"


@dataclass
class Observability:
    config: ObservabilityConfig
    metrics: Metrics | None
    sentry: bool


def install(app: Any, settings: Any = None, *, env: dict[str, str] | None = None, sessionmaker: Any = None, registry: Any = None) -> Observability:
    """Adds logging, request ids, metrics and Sentry to `app`. Call before the app starts.

    Job and ledger metrics attach to `sessionmaker`, or to `app.state.gw.Session` when the
    app is the gateway's.
    """
    existing = getattr(app.state, "observability", None)
    if existing is not None:
        return existing
    config = ObservabilityConfig.from_settings(settings, env)
    if config.configure_logs:
        configure_logging(config.log_level, config.log_format)

    metrics: Metrics | None = None
    if config.metrics_enabled:
        try:
            metrics = Metrics(registry)
        except ImportError:
            log.warning("prometheus-client is not installed; metrics are off")
    if metrics is not None:
        target = sessionmaker if sessionmaker is not None else getattr(getattr(app.state, "gw", None), "Session", None)
        if target is not None:
            track_database(target, metrics)
        add_metrics_route(app, metrics, config.metrics_token, config.metrics_path)
        if not config.metrics_token:
            log.warning("%s is served without a token; set KUNO_METRICS_TOKEN or keep it off the public network", config.metrics_path)

    sentry = False
    if config.sentry_dsn:
        release = getattr(app, "version", None)
        sentry = init_sentry(config.sentry_dsn, config.sentry_environment, f"kuno-gateway@{release}" if release else None, config.sentry_traces_sample_rate)

    app.add_middleware(ObservabilityMiddleware, metrics=metrics, access_log_enabled=config.access_log)
    result = Observability(config=config, metrics=metrics, sentry=sentry)
    app.state.observability = result
    return result
