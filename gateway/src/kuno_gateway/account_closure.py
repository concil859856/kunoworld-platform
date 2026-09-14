"""Closing an account (STANDARD_MODE.md, "Closing an account").

The owner closes their own account from a web session that signed in within the last 10 minutes
(`REAUTH_WINDOW_S`), typing the account's email address to confirm. One transaction does the following, in this order,
so a failure in another module stops the closure before anything irreversible happens:

1. the key vault's wrapped keys are purged and share links ended (when those modules are installed);
2. every web session and API key is revoked, linked wallets are unlinked, pending sign-in links are deleted, operator
   roles are revoked, and open appeals are withdrawn;
3. every job goes through the owner's deletion path (`standard_jobs.delete_for_owner`): queued and running jobs are
   canceled and refunded, then content is deleted, except what a preservation hold keeps (hidden, and deleted when the
   hold ends); unused uploads and data exports are deleted; each deletion gets a tombstone when that module is
   installed;
4. the webhook secret is deleted and pending deliveries stop;
5. the address is replaced with a placeholder that can never receive mail, a salted hash of the address is kept, the
   account is marked closed (`accounts.closed_at`), the closure is recorded with the unused balance, and it is
   written to the audit log.

What stays, marked [RETENTION OF RECORDS AFTER CLOSURE] for counsel: billing and ledger entries, payments, job
metadata and receipts, reports, strikes, restrictions and the audit log. The unused balance is recorded, not refunded:
[BALANCE ON CLOSURE POLICY]. Signing in again with the same address creates a new, empty account.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from html import escape
from typing import TYPE_CHECKING

from kuno_protocol.schemas import JobState
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from . import account_export, appeals, holds, identity, ledger, lifecycle_hooks, moderation, roles, standard_jobs
from .db import Account, ApiKey, Blob, Job, LoginToken, User, UserSession, WalletChallenge, WalletLink, WebhookDelivery
from .db_lifecycle import AccountClosure, AccountExport
from .db_moderation import StandardUpload
from .db_roles import OperatorRole
from .mailer import Message

if TYPE_CHECKING:
    from .state import GatewayState

REAUTH_WINDOW_S = 10 * 60
CLOSED_EMAIL_DOMAIN = "closed.invalid"
CLOSED_ACCOUNT_NAME = "Closed account"
BALANCE_POLICY = "[BALANCE ON CLOSURE POLICY]"
RETENTION_POLICY = "[RETENTION OF RECORDS AFTER CLOSURE]"
DELETES = (
    "videos, prompts, inputs and thumbnails",
    "unused uploads and data exports",
    "wrapped Private keys (key sync) and share links",
    "sign-in sessions and API keys",
    "linked wallets and the webhook secret",
    "operator roles",
)
RECORDS_KEPT = (
    "ledger entries and the balance",
    "payments",
    "job records and receipts",
    "reports",
    "strikes and restrictions",
    "the operator audit log",
)


class AlreadyClosed(Exception):
    pass


# ------------------------------------------------------------------ re-authentication and the address


def reauth_expires_at(session: UserSession) -> float:
    """A session opened by a sign-in link can close its account until this time."""
    return session.created_at + REAUTH_WINDOW_S


def reauth_fresh(session: UserSession, now: float) -> bool:
    return now < reauth_expires_at(session)


def placeholder_email(user_id: str) -> str:
    """Unique, derived from the user id rather than the address, and in a reserved domain that can't receive mail."""
    return f"closed-{user_id}@{CLOSED_EMAIL_DOMAIN}"


def hash_email(email: str, salt: bytes | None = None) -> str:
    """A salted hash of an address: enough to tell whether a given address closed this account, not to recover it."""
    salt = os.urandom(16) if salt is None else salt
    digest = hashlib.sha256(b"kuno/closed-account-email\x00" + salt + email.strip().lower().encode()).hexdigest()
    return f"sha256:{salt.hex()}:{digest}"


def email_matches(stored: str, email: str) -> bool:
    try:
        scheme, salt_hex, _ = stored.split(":", 2)
        salt = bytes.fromhex(salt_hex)
    except ValueError:
        return False
    return scheme == "sha256" and hmac.compare_digest(hash_email(email, salt), stored)


def closures_for_email(s: Session, email: str) -> list[AccountClosure]:
    """Closed accounts that used this address (for a legal request about retained records). Scans every closure."""
    rows = s.scalars(select(AccountClosure).order_by(AccountClosure.closed_at)).all()
    return [c for c in rows if email_matches(c.email_hash, email)]


def closure_for_account(s: Session, account_id: str) -> AccountClosure | None:
    return s.scalars(select(AccountClosure).where(AccountClosure.account_id == account_id)).first()


# ------------------------------------------------------------------ closing


@dataclass
class ClosureResult:
    closure: AccountClosure
    # The address before closure, for the confirmation email. It isn't stored anywhere.
    email: str
    detail: dict


def close(state: GatewayState, s: Session, user_id: str, now: float) -> ClosureResult:
    """Closes the user's account inside the caller's transaction. See the module docstring for the order."""
    user = s.get(User, user_id, with_for_update=state.postgres)
    found = identity.account_for_user(s, user_id) if user is not None else None
    if user is None or found is None:
        raise LookupError(user_id)
    if found.closed_at is not None or closure_for_account(s, found.id) is not None:
        raise AlreadyClosed()
    account = s.get(Account, found.id, with_for_update=state.postgres)
    by = appeals.owner_actor(user.id)
    email = user.email
    detail: dict = {}

    # 1. Other modules' per-account data first: if one fails, nothing irreversible has happened yet.
    vault_installed, purged = lifecycle_hooks.key_vault_purge(s, account.id)
    detail["key_vault_purged"] = purged if vault_installed else "not_installed"
    shares_installed, ended = lifecycle_hooks.shares_revoke(s, account.id)
    detail["share_links_revoked"] = ended if shares_installed else "not_installed"

    # 2. Credentials and standing.
    detail["sessions_revoked"] = s.execute(
        update(UserSession).where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None)).values(revoked_at=now)
    ).rowcount or 0
    detail["api_keys_revoked"] = s.execute(
        update(ApiKey).where(ApiKey.account_id == account.id, ApiKey.revoked_at.is_(None)).values(revoked_at=now)
    ).rowcount or 0
    links = s.scalars(select(WalletLink).where(WalletLink.account_id == account.id)).all()
    for link in links:
        s.delete(link)
    detail["wallets_unlinked"] = len(links)
    s.execute(delete(WalletChallenge).where(WalletChallenge.account_id == account.id))
    s.execute(delete(LoginToken).where(LoginToken.email == email))
    held_roles = roles.active_roles(s, user.id)
    if held_roles:
        s.execute(
            update(OperatorRole).where(OperatorRole.user_id == user.id, OperatorRole.revoked_at.is_(None)).values(revoked_at=now)
        )
        for role in held_roles:
            moderation.log_action(s, by, "role.revoke", "user", user.id, "account closed", {"role": role, "account_closure": True}, now)
    detail["roles_revoked"] = held_roles
    detail["appeals_withdrawn"] = appeals.withdraw_open(s, account.id, by, now)

    # 3. Content, through the owner's deletion path: cancels and refunds unfinished jobs, and respects holds.
    jobs = s.scalars(select(Job).where(Job.account_id == account.id).order_by(Job.created_at)).all()
    canceled = kept = 0
    for job in jobs:
        if not JobState(job.status).terminal:
            canceled += 1
        standard_jobs.delete_for_owner(state, s, job, now)
        if holds.job_held(s, job.id, now):
            kept += 1
        else:
            lifecycle_hooks.tombstone(s, "job_content", job.id, account.id, now)
    detail.update(jobs=len(jobs), jobs_canceled=canceled, jobs_kept_under_hold=kept)
    unused = 0
    for upload in s.scalars(
        select(StandardUpload).where(StandardUpload.account_id == account.id, StandardUpload.job_id.is_(None))
    ).all():
        if holds.upload_held(s, upload.id, now):
            continue
        if upload.blob_id:
            standard_jobs.discard_blobs(state, [upload.blob_id])
        s.delete(upload)
        unused += 1
    for blob in s.scalars(
        select(Blob).where(Blob.owner_kind == "account", Blob.owner_id == account.id, Blob.job_id.is_(None))
    ).all():
        standard_jobs.discard_blobs(state, [blob.id])
        s.delete(blob)
        unused += 1
    detail["unused_uploads_deleted"] = unused
    exports = s.scalars(
        select(AccountExport).where(AccountExport.account_id == account.id, AccountExport.deleted_at.is_(None))
    ).all()
    for export in exports:
        account_export.delete_copy(state, s, export, account_export.DELETED, now)
    detail["exports_deleted"] = len(exports)

    # 4. Webhooks: the secret goes, and nothing more is delivered (including the cancellations above).
    account.webhook_secret = None
    detail["webhook_deliveries_stopped"] = s.execute(
        update(WebhookDelivery)
        .where(WebhookDelivery.account_id == account.id, WebhookDelivery.status == "pending")
        .values(status="failed", last_error="account closed", locked_until=None)
    ).rowcount or 0

    # 5. The address, the marker and the record.
    user.email = placeholder_email(user.id)
    account.name = CLOSED_ACCOUNT_NAME
    account.closed_at = now
    closure = AccountClosure(
        id=uuid.uuid4().hex, account_id=account.id, user_id=user.id, closed_at=now, email_hash=hash_email(email),
        balance_micros=account.balance_micros, detail=json.dumps(detail, separators=(",", ":")),
    )
    s.add(closure)
    s.flush()
    moderation.log_action(
        s, by, "account.close", "account", account.id, "closed by its owner",
        {**detail, "closure_id": closure.id, "balance_usd": ledger.to_usd(account.balance_micros),
         "balance_policy": BALANCE_POLICY, "retention": RETENTION_POLICY},
        now,
    )
    lifecycle_hooks.tombstone(s, "account_closure", account.id, account.id, now)
    return ClosureResult(closure=closure, email=email, detail=detail)


def closure_json(result: ClosureResult) -> dict:
    """What the customer is told. Nothing about holds."""
    closure = result.closure
    return {
        "closed": True,
        "account_id": closure.account_id,
        "closed_at": closure.closed_at,
        "jobs": result.detail.get("jobs", 0),
        "jobs_canceled": result.detail.get("jobs_canceled", 0),
        "balance_usd": ledger.to_usd(closure.balance_micros),
        "balance_policy": BALANCE_POLICY,
        "records_kept": list(RECORDS_KEPT),
        "retention_policy": RETENTION_POLICY,
    }


# ------------------------------------------------------------------ email


def reauth_message(to: str, link: str, valid_minutes: int) -> Message:
    text = (
        "Confirm it's you\n\n"
        "Someone signed in to your KunoWorld account asked to close it. Before an account can be closed, we check it's "
        "you with a fresh sign-in link.\n\n"
        f"Open this link on the device where you're closing the account. It works once and expires in {valid_minutes} "
        f"minutes:\n\n{link}\n\n"
        "If you didn't ask for this, don't open the link. Nothing changes unless the link is used and the closure is "
        "confirmed."
    )
    html = (
        "<p><strong>Confirm it's you</strong></p>"
        "<p>Someone signed in to your KunoWorld account asked to close it. Before an account can be closed, we check "
        "it's you with a fresh sign-in link.</p>"
        f"<p>Open this link on the device where you're closing the account. It works once and expires in {valid_minutes} "
        "minutes:</p>"
        f'<p><a href="{escape(link, quote=True)}">Confirm it\'s you</a></p>'
        "<p>If you didn't ask for this, don't open the link. Nothing changes unless the link is used and the closure is "
        "confirmed.</p>"
    )
    return Message(to=to, subject="Confirm it's you to close your KunoWorld account", text=text, html=html)


def closed_message(to: str, closure: AccountClosure) -> Message:
    when = datetime.fromtimestamp(closure.closed_at, tz=timezone.utc).strftime("%d %B %Y, %H:%M UTC")
    balance = f"${ledger.to_usd(closure.balance_micros):,.2f}"
    lines = [
        f"Your KunoWorld account was closed on {when}.",
        "Your videos and uploads were deleted, your sign-in sessions and API keys stopped working, and linked wallets "
        "were unlinked. (Content under a legal preservation hold is kept until the hold ends, as the Privacy Policy "
        "explains.)",
        f"Billing and payment records, receipts, reports, strikes and the audit log are kept: {RETENTION_POLICY}.",
        f"Your unused balance of {balance}: {BALANCE_POLICY}.",
        "Signing in again with this address creates a new, empty account. If you didn't close your account, write to "
        "security@kunoworld.com.",
    ]
    return Message(
        to=to,
        subject="Your KunoWorld account is closed",
        text="Your KunoWorld account is closed\n\n" + "\n\n".join(lines) + "\n",
        html="<p><strong>Your KunoWorld account is closed</strong></p>" + "".join(f"<p>{escape(line)}</p>" for line in lines),
    )


def replay_account_closure(state: GatewayState, s: Session, entry, now: float, dry_run: bool) -> str:
    """Re-closes an account that a database restore brought back: revokes its sessions, API keys, roles and wallet
    links, ends key sync and share links, and replaces the address again. Its content is deleted again by its own
    tombstones (`job_content`, `blob`, ...). Idempotent: an account already closed as recorded is left alone."""
    from . import tombstones

    account = s.get(Account, entry.ref)
    if account is None:
        return tombstones.ABSENT
    user = s.get(User, account.owner_user_id) if account.owner_user_id else None
    live_sessions = user is not None and s.scalars(
        select(UserSession.id).where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None)).limit(1)
    ).first() is not None
    live_keys = s.scalars(select(ApiKey.id).where(ApiKey.account_id == account.id, ApiKey.revoked_at.is_(None)).limit(1)).first() is not None
    address_back = user is not None and user.email != placeholder_email(user.id)
    if account.closed_at is not None and not (live_sessions or live_keys or address_back):
        return tombstones.ABSENT
    if dry_run:
        return tombstones.WOULD_DELETE
    lifecycle_hooks.key_vault_purge(s, account.id)
    lifecycle_hooks.shares_revoke(s, account.id)
    s.execute(update(ApiKey).where(ApiKey.account_id == account.id, ApiKey.revoked_at.is_(None)).values(revoked_at=now))
    for link in s.scalars(select(WalletLink).where(WalletLink.account_id == account.id)).all():
        s.delete(link)
    s.execute(delete(WalletChallenge).where(WalletChallenge.account_id == account.id))
    if user is not None:
        s.execute(update(UserSession).where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None)).values(revoked_at=now))
        s.execute(update(OperatorRole).where(OperatorRole.user_id == user.id, OperatorRole.revoked_at.is_(None)).values(revoked_at=now))
        s.execute(delete(LoginToken).where(LoginToken.email == user.email))
        if closure_for_account(s, account.id) is None:
            s.add(AccountClosure(
                id=uuid.uuid4().hex, account_id=account.id, user_id=user.id, closed_at=entry.created_at,
                email_hash=hash_email(user.email), balance_micros=account.balance_micros,
                detail=json.dumps({"reapplied_after_restore": True}, separators=(",", ":")),
            ))
        user.email = placeholder_email(user.id)
    account.webhook_secret = None
    account.name = CLOSED_ACCOUNT_NAME
    account.closed_at = account.closed_at or entry.created_at
    return tombstones.DELETED
