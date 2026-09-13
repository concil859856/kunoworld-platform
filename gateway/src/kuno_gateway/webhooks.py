"""Webhook delivery.

When a job created with a webhook_url reaches a terminal state, a delivery is queued in the same
transaction. A background loop posts it, signed with the account's webhook secret, and retries with
growing delays until it lands or gives up. Destinations are checked when the job is created and
again before every attempt, so a webhook can't be aimed at the gateway's own network.
"""

from __future__ import annotations

import hashlib
import hmac
import ipaddress
import json
import logging
import secrets
import socket
import time
import uuid
from typing import TYPE_CHECKING
from urllib.parse import urlsplit

import httpx
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .db import Account, Job, WebhookDelivery

if TYPE_CHECKING:
    from .state import GatewayState

log = logging.getLogger("kuno.webhooks")

EVENTS = {"succeeded": "job.succeeded", "failed": "job.failed", "canceled": "job.canceled"}
# Delay before attempt n+1 after attempt n fails: about a day in total.
RETRY_DELAYS_S = (30, 120, 600, 1800, 3600, 3 * 3600, 6 * 3600, 12 * 3600)
SIGNATURE_HEADER = "kunoworld-signature"
CLAIM_S = 60
TIMEOUT_S = 10.0


class InvalidWebhookUrl(ValueError):
    pass


def check_url(url: str, allow_private: bool = False, resolve=socket.getaddrinfo) -> None:
    """Refuses destinations a webhook must not reach: plain http, credentials, and non-public addresses."""
    parts = urlsplit(url)
    if len(url) > 2000 or parts.scheme not in ("https", "http") or not parts.hostname:
        raise InvalidWebhookUrl("Use an https URL for the webhook.")
    if parts.scheme == "http" and not allow_private:
        raise InvalidWebhookUrl("Webhook URLs must use https.")
    if parts.username or parts.password:
        raise InvalidWebhookUrl("Webhook URLs can't carry credentials.")
    if allow_private:
        return
    try:
        infos = resolve(parts.hostname, parts.port or 443, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError):
        raise InvalidWebhookUrl("The webhook host doesn't resolve.") from None
    for info in infos:
        address = ipaddress.ip_address(info[4][0].split("%", 1)[0])
        if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped is not None:
            address = address.ipv4_mapped
        if not address.is_global:
            raise InvalidWebhookUrl("Webhook URLs must point at a public address.")


def ensure_secret(account: Account) -> str:
    if not account.webhook_secret:
        account.webhook_secret = "whsec_" + secrets.token_urlsafe(32)
    return account.webhook_secret


def sign(secret: str, timestamp: str, body: bytes) -> str:
    """HMAC-SHA256 over "timestamp.body", so a captured delivery can't be replayed later as new."""
    return hmac.new(secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()


def enqueue(s: Session, job: Job, job_json: dict, now: float | None = None) -> None:
    event = EVENTS.get(job.status)
    if not job.webhook_url or event is None:
        return
    if s.scalars(select(WebhookDelivery.id).where(WebhookDelivery.job_id == job.id, WebhookDelivery.event == event)).first():
        return
    now = time.time() if now is None else now
    delivery_id = uuid.uuid4().hex
    payload = {"delivery_id": delivery_id, "event": event, "created_at": now, "data": job_json}
    s.add(
        WebhookDelivery(
            id=delivery_id, account_id=job.account_id, job_id=job.id, url=job.webhook_url, event=event,
            payload=json.dumps(payload, separators=(",", ":")), status="pending", attempts=0,
            next_attempt_at=now, created_at=now,
        )
    )


def deliver_due(state: GatewayState, client: httpx.Client | None = None, limit: int = 20) -> int:
    """Posts every delivery that is due, once. Returns how many landed."""
    now = time.time()
    with state.session() as s, s.begin():
        query = (
            select(WebhookDelivery)
            .where(
                WebhookDelivery.status == "pending",
                WebhookDelivery.next_attempt_at <= now,
                or_(WebhookDelivery.locked_until.is_(None), WebhookDelivery.locked_until < now),
            )
            .order_by(WebhookDelivery.next_attempt_at)
            .limit(limit)
        )
        if state.postgres:
            query = query.with_for_update(skip_locked=True)
        work = []
        for delivery in s.scalars(query).all():
            delivery.locked_until = now + CLAIM_S
            account = s.get(Account, delivery.account_id)
            if account is None:
                delivery.status = "failed"
                delivery.last_error = "account no longer exists"
                continue
            work.append((delivery.id, delivery.url, delivery.event, delivery.payload, ensure_secret(account)))
    if not work:
        return 0

    owned = client is None
    client = client or httpx.Client(timeout=TIMEOUT_S, follow_redirects=False, trust_env=False)
    delivered = 0
    try:
        for delivery_id, url, event, payload, secret in work:
            body = payload.encode()
            timestamp = str(int(time.time()))
            code, error, permanent = None, None, False
            try:
                check_url(url, state.settings.allow_private_webhooks)
                response = client.post(
                    url,
                    content=body,
                    headers={
                        "content-type": "application/json",
                        "user-agent": "KunoWorld-Webhooks/1",
                        "kunoworld-event": event,
                        "kunoworld-delivery": delivery_id,
                        SIGNATURE_HEADER: f"t={timestamp},v1={sign(secret, timestamp, body)}",
                    },
                )
                code = response.status_code
                if not 200 <= code < 300:
                    error = f"HTTP {code}"
            except InvalidWebhookUrl as exc:
                error, permanent = str(exc), True
            except httpx.HTTPError as exc:
                error = type(exc).__name__
            delivered += _record(state, delivery_id, code, error, permanent)
    finally:
        if owned:
            client.close()
    return delivered


def _record(state: GatewayState, delivery_id: str, code: int | None, error: str | None, permanent: bool) -> int:
    now = time.time()
    with state.session() as s, s.begin():
        delivery = s.get(WebhookDelivery, delivery_id)
        if delivery is None:
            return 0
        delivery.attempts += 1
        delivery.last_status_code = code
        delivery.last_error = error[:500] if error else None
        delivery.locked_until = None
        if error is None:
            delivery.status, delivery.delivered_at = "delivered", now
            return 1
        if permanent or delivery.attempts >= state.settings.webhook_max_attempts:
            delivery.status = "failed"
            log.info("webhook delivery %s gave up after %d attempts", delivery_id, delivery.attempts)
        else:
            delivery.next_attempt_at = now + RETRY_DELAYS_S[min(delivery.attempts - 1, len(RETRY_DELAYS_S) - 1)]
    return 0
