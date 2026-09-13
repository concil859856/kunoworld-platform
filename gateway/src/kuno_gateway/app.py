from __future__ import annotations

import argparse
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__, api_admin, api_auth, api_miner, api_public, api_validator, webhooks
from .limits import BodyLimitMiddleware
from .settings import Settings
from .state import GatewayState

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


def _body_limit(settings: Settings, path: str) -> int:
    # Ciphertext blobs are the only large bodies the gateway accepts.
    if path in ("/v1/blobs", "/miner/v1/blobs"):
        return settings.max_blob_bytes
    return settings.max_json_body_bytes


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    state = GatewayState(settings)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        tasks = [asyncio.create_task(_janitor_loop(state)), asyncio.create_task(_webhook_loop(state))]
        try:
            yield
        finally:
            for task in tasks:
                task.cancel()

    app = FastAPI(title="KunoWorld Gateway", version=__version__, lifespan=lifespan)
    app.state.gw = state
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(BodyLimitMiddleware, limit_for=lambda path: _body_limit(settings, path))
    for module in (api_public, api_auth, api_miner, api_validator, api_admin):
        app.include_router(module.router)

    @app.get("/healthz")
    async def healthz():
        return {"ok": True, "version": __version__}

    return app


def main() -> None:
    import uvicorn

    parser = argparse.ArgumentParser(prog="kuno-gateway")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    uvicorn.run(create_app(), host=args.host, port=args.port)


if __name__ == "__main__":
    main()
