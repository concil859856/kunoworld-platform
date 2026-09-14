from __future__ import annotations

import argparse
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import (
    __version__,
    api_admin,
    api_audits,
    api_auth,
    api_ca,
    api_miner,
    api_moderation,
    api_payments,
    api_public,
    api_reports,
    api_standard,
    api_turbo,
    api_validator,
    api_validator_standard,
    observability,
    standard_jobs,
    webhooks,
)
from .ca import IssuingCA
from .limits import BodyLimitMiddleware
from .nowpayments import NowPayments
from .settings import Settings
from .state import GatewayState
from .stripe_payments import StripeTopups
from .upload_scan import build_scanner

log = logging.getLogger("kuno.gateway")


async def _janitor_loop(state: GatewayState) -> None:
    while True:
        try:
            await asyncio.to_thread(state.janitor)
        except Exception:  # keep the loop alive; surface the error in logs
            log.exception("janitor pass failed")
        await asyncio.sleep(state.settings.janitor_interval_s)


async def _webhook_loop(state: GatewayState) -> None:
    while True:
        try:
            await asyncio.to_thread(webhooks.deliver_due, state)
        except Exception:  # keep delivering; surface the error in logs
            log.exception("webhook delivery pass failed")
        await asyncio.sleep(state.settings.webhook_interval_s)


async def _standard_retention_loop(state: GatewayState) -> None:
    """Deletes standard content past KUNO_STANDARD_RETENTION_DAYS and uploads nobody used."""
    while True:
        try:
            await asyncio.to_thread(standard_jobs.expire, state)
        except Exception:  # keep the loop alive; surface the error in logs
            log.exception("standard retention pass failed")
        await asyncio.sleep(max(state.settings.janitor_interval_s, 60.0))


async def _chain_loop(state: GatewayState) -> None:
    """Credits TAO and alpha top-ups from finalized blocks, reconnecting after any failure."""
    from .chainwatch import ChainWatcher, SubstrateChain
    from .prices import TaoPriceOracle

    oracle = TaoPriceOracle(state.settings.price_max_divergence)
    watcher = None
    while True:
        try:
            if watcher is None:
                watcher = await asyncio.to_thread(lambda: ChainWatcher(state, SubstrateChain(state.settings.subtensor_url), oracle))
            await asyncio.to_thread(watcher.run_once)
        except ImportError:
            log.error("TAO top-ups need the gateway's chain extra (substrate-interface); the chain watcher is off")
            return
        except Exception:  # a dropped connection or a bad block: reconnect and retry
            log.exception("chain watcher pass failed")
            watcher = None
        await asyncio.sleep(12)


def _body_limit(settings: Settings, path: str) -> int:
    # Ciphertext blobs are the only large bodies the gateway accepts.
    if path in ("/v1/blobs", "/miner/v1/blobs", "/v1/standard/uploads", "/v1/me/standard/uploads"):
        return settings.max_blob_bytes
    # Step-audit openings carry encrypted latents: tens of MB for H3.
    if path.startswith("/miner/v1/audits/") and path.endswith("/opening"):
        return settings.max_blob_bytes
    return settings.max_json_body_bytes


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    state = GatewayState(settings)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        tasks = [
            asyncio.create_task(_janitor_loop(state)),
            asyncio.create_task(_webhook_loop(state)),
            asyncio.create_task(_standard_retention_loop(state)),
        ]
        if settings.tao_treasury_address:
            tasks.append(asyncio.create_task(_chain_loop(state)))
        try:
            yield
        finally:
            for task in tasks:
                task.cancel()

    app = FastAPI(title="KunoWorld Gateway", version=__version__, lifespan=lifespan)
    app.state.gw = state
    app.state.stripe_topups = StripeTopups(settings)
    app.state.nowpayments = NowPayments(settings)
    app.state.upload_scanner = build_scanner(settings)
    # A misconfigured CA stops start-up; an unconfigured one just answers 503.
    app.state.c2pa_ca = IssuingCA.from_settings(settings)
    if app.state.c2pa_ca is not None and not settings.c2pa_tsa_url and state.policy.production:
        log.warning("C2PA CA without KUNO_C2PA_TSA_URL: manifests stop validating when their short-lived certificates expire")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(BodyLimitMiddleware, limit_for=lambda path: _body_limit(settings, path))
    for module in (
        api_public, api_auth, api_payments, api_miner, api_ca, api_validator, api_admin, api_turbo, api_audits,
        api_standard, api_reports, api_moderation, api_validator_standard,
    ):
        app.include_router(module.router)

    @app.get("/healthz")
    async def healthz():
        return {"ok": True, "version": __version__}

    # Request ids, structured logs, /metrics and Sentry, each only as far as it is configured.
    observability.install(app, settings)
    return app


def main() -> None:
    import uvicorn

    parser = argparse.ArgumentParser(prog="kuno-gateway")
    parser.add_argument("--host", default=os.environ.get("KUNO_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("KUNO_PORT", "8080")))
    args = parser.parse_args()
    observability.configure_logging(os.environ.get("KUNO_LOG_LEVEL", "INFO"), os.environ.get("KUNO_LOG_FORMAT", "json"))
    uvicorn.run(create_app(), host=args.host, port=args.port, log_config=None)


if __name__ == "__main__":
    main()
