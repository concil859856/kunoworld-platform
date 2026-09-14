"""Test helpers for the account lifecycle tests: a customer signed in by email link, the export builder, the outbox."""

from __future__ import annotations

import io
import json
import zipfile
from types import SimpleNamespace

from kuno_gateway import account_export, identity, ledger


def signed_in(gw, email: str, credit_usd: float = 50) -> SimpleNamespace:
    """A customer who signed in with an email link: user, account, a web session, and an operator credit."""
    with gw.state.session() as s, s.begin():
        user = identity.redeem_login_token(s, identity.issue_login_token(s, email, 900))
        token, session = identity.open_session(s, user.id, identity.WEB, 3600)
        account = identity.account_for_user(s, user.id)
        if credit_usd:
            ledger.post(
                s, account.id, ledger.to_micros(credit_usd), kind=ledger.ADJUSTMENT, source="admin",
                idempotency_key=f"admin:test-credit:{account.id}",
            )
    return SimpleNamespace(
        email=email, user_id=user.id, account_id=account.id, session_id=session.id,
        headers={"authorization": f"Bearer {token}"},
    )


def build_exports(gw) -> int:
    """Runs the background builder's pass until nothing is left to build."""
    built = 0
    while account_export.run_pending(gw.state):
        built += 1
    return built


def download_export(gw, headers: dict, export_id: str) -> bytes:
    got = gw.client.get(f"/v1/me/exports/{export_id}/download", headers=headers)
    assert got.status_code == 200, got.text
    assert got.headers["content-type"] == "application/zip"
    assert got.headers["content-disposition"].startswith('attachment; filename="kunoworld-export-')
    return got.content


def export_zip(gw, headers: dict, export_id: str) -> zipfile.ZipFile:
    archive = zipfile.ZipFile(io.BytesIO(download_export(gw, headers, export_id)))
    assert archive.testzip() is None
    return archive


def stored(gw, blob_id: str | None) -> bool:
    if blob_id is None:
        return False
    try:
        gw.state.blobs.get(blob_id)
    except KeyError:
        return False
    return True


def outbox(gw, to: str) -> list[dict]:
    directory = gw.settings.outbox_dir
    if not directory.exists():
        return []
    messages = (json.loads(path.read_text()) for path in sorted(directory.iterdir()))
    return [m for m in messages if m["to"] == to]
