from __future__ import annotations

import argparse
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__, api_admin, api_auth, api_miner, api_public, api_validator
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


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    state = GatewayState(settings)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        task = asyncio.create_task(_janitor_loop(state))
        try:
            yield
        finally:
            task.cancel()

    app = FastAPI(title="KunoWorld Gateway", version=__version__, lifespan=lifespan)
    app.state.gw = state
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
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
