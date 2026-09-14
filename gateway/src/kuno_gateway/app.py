from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from . import (
    __version__,
    account_export,
    api_account_lifecycle,
    api_admin,
    api_appeals,
    api_audits,
    api_auth,
    api_ca,
    api_cybertip,
    api_key_vault,
    api_miner,
    api_moderation,
    api_payments,
    api_public,
    api_reports,
    api_shares,
    api_standard,
    api_turbo,
    api_validator,
    api_validator_standard,
    observability,
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


async def _account_export_loop(state: GatewayState) -> None:
    """Builds queued data exports and deletes each copy a week after it finished (account_export.py)."""
    while True:
        try:
            await asyncio.to_thread(account_export.run_pending, state)
        except Exception:  # keep building; surface the error in logs
            log.exception("data export pass failed")
        await asyncio.sleep(state.settings.janitor_interval_s)


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
    # A key sync rotation re-wraps every synced key in one request (key_vault.py).
    if path == "/v1/me/keyvault/rotate":
        from .key_vault import ROTATE_MAX_BODY_BYTES

        return max(settings.max_json_body_bytes, ROTATE_MAX_BODY_BYTES)
    return settings.max_json_body_bytes


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    state = GatewayState(settings)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        tasks = [
            asyncio.create_task(_janitor_loop(state)),
            asyncio.create_task(_webhook_loop(state)),
            asyncio.create_task(_account_export_loop(state)),
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
    if settings.allow_admin_token and settings.production:
        log.error("KUNO_ALLOW_ADMIN_TOKEN is ignored in production: operators sign in by email")
    elif settings.break_glass_enabled:
        log.warning("break-glass admin token is enabled (KUNO_ALLOW_ADMIN_TOKEN=1); every use is logged as 'break-glass'")
    # Storage key canary (production needs a key management service), the TSA rules, the C2PA log import.
    from . import startup_checks

    app.state.startup_report = startup_checks.run(app, state, settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(BodyLimitMiddleware, limit_for=lambda path: _body_limit(settings, path))
    for module in (
        api_public, api_auth, api_payments, api_miner, api_ca, api_validator, api_admin, api_turbo, api_audits,
        api_standard, api_reports, api_moderation, api_validator_standard, api_key_vault, api_shares,
        api_cybertip,
    ):
        app.include_router(module.router)
    # GET /admin/v1/c2pa/issuances (admin role).
    app.include_router(api_ca.admin_router)

    # Data export, account closure and appeals (STANDARD_MODE.md, MODERATION.md).
    for module in (api_account_lifecycle, api_appeals):
        app.include_router(module.router)

    @app.get("/healthz")
    async def healthz():
        return {"ok": True, "version": __version__}

    # Request ids, structured logs, /metrics and Sentry, each only as far as it is configured.
    observability.install(app, settings)
    return app


def role_command(command: str, email: str, role: str, settings: Settings | None = None) -> tuple[int, str]:
    """`grant-role` / `revoke-role` against the gateway's database, for bootstrapping the first admin.
    Logged in the audit log as operator "cli". Returns (exit code, message)."""
    from sqlalchemy import create_engine

    from . import roles
    from .migrations import upgrade_database

    settings = settings or Settings.from_env()
    engine = create_engine(settings.db_url)
    try:
        upgrade_database(engine)
        with engine.connect() as connection, Session(bind=connection) as s, s.begin():
            try:
                if command == "grant-role":
                    user, _, created = roles.grant(s, email, role, roles.CLI)
                    return 0, f"{'granted' if created else 'already held'}: {user.email} is {role}"
                revoked = roles.revoke(s, email, role, roles.CLI)
                if revoked is None:
                    return 1, f"{email.strip().lower()} does not hold {role}"
                return 0, f"revoked: {email.strip().lower()} is no longer {role}"
            except roles.RoleError as exc:
                return 2, exc.message
    finally:
        engine.dispose()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="kuno-gateway")
    parser.add_argument("--host", default=os.environ.get("KUNO_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("KUNO_PORT", "8080")))
    commands = parser.add_subparsers(dest="command")
    for name, help_text in (("grant-role", "grant an operator role"), ("revoke-role", "revoke an operator role")):
        sub = commands.add_parser(name, help=help_text)
        sub.add_argument("--email", required=True)
        sub.add_argument("--role", required=True, choices=["moderator", "admin"])
    # rotate-storage-key, check-tsa, reapply-deletions, import-c2pa-log (ops_cli.py)
    from . import ops_cli

    ops_cli.register(commands)
    args = parser.parse_args(argv)
    if args.command in ("grant-role", "revoke-role"):
        code, message = role_command(args.command, args.email, args.role)
        print(message, file=sys.stdout if code == 0 else sys.stderr)
        raise SystemExit(code)
    if args.command in ops_cli.COMMANDS:
        raise SystemExit(ops_cli.dispatch(args))

    import uvicorn

    observability.configure_logging(os.environ.get("KUNO_LOG_LEVEL", "INFO"), os.environ.get("KUNO_LOG_FORMAT", "json"))
    uvicorn.run(create_app(), host=args.host, port=args.port, log_config=None)


if __name__ == "__main__":
    main()
