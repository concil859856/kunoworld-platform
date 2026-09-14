"""Closing an account and admitting a job can't interleave (account_closure.lock_account). A job asked for while the
account closes is refused; a job admitted just before is canceled and refunded by the closure. On SQLite, with real
threads holding the lock; the Postgres form of the lock is checked on its own.

Reuses the fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import threading
import time
import uuid
from types import SimpleNamespace

import pytest
from account_sessions import signed_in
from sqlalchemy import select
import test_standard_moderation_flow as flow
from test_standard_moderation_flow import (  # helpers
    ENCLAVE,
    TEXT,
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
)

from fastapi import HTTPException
from kuno_protocol.schemas import JobState

from kuno_gateway import account_closure, api_public, api_standard, ledger, lifecycle_hooks
from kuno_gateway.db import Account, Enclave, Job

# The flow's fixtures, bound here so pytest finds them in this module.
gw, media = flow.gw, flow.media

CREDIT = ledger.to_micros(50)


def admit(gw, account_id: str, job_id: str) -> None:
    """What POST /v1/standard/videos does in its transaction, with the account as authenticated before closure."""
    with gw.state.session() as s, s.begin():
        account = s.get(Account, account_id)
        api_public.admit_job(
            s, gw.state, account, job_id=job_id, profile=gw.state.profiles[TEXT.profile_id], params=TEXT,
            enclave=s.get(Enclave, ENCLAVE), enc="enc", ciphertext="ciphertext", input_blob_ids=[], webhook_url=None,
            privacy="standard", now=time.time(),
        )


def close(gw, user_id: str) -> account_closure.ClosureResult:
    with gw.state.session() as s, s.begin():
        return account_closure.close(gw.state, s, user_id, time.time())


def in_thread(fn) -> tuple[threading.Thread, dict]:
    outcome: dict = {}

    def run():
        try:
            outcome["value"] = fn()
        except BaseException as exc:  # checked by the test
            outcome["error"] = exc

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    return thread, outcome


def pause(module, name: str):
    """Replaces module.name with a version that signals `reached` and waits for `release`. Returns both events."""
    reached, release = threading.Event(), threading.Event()
    real = getattr(module, name)

    def paused(*args, **kwargs):
        reached.set()
        assert release.wait(10)
        return real(*args, **kwargs)

    return paused, reached, release


def account_jobs(gw, account_id: str) -> list[Job]:
    with gw.state.session() as s:
        return list(s.scalars(select(Job).where(Job.account_id == account_id)).all())


def test_a_job_asked_for_while_the_account_closes_is_refused(gw, monkeypatch):
    alice = signed_in(gw, "alice@example.com")
    # key_vault_purge is the closure's first step after it took the account's lock.
    paused, locked, release = pause(lifecycle_hooks, "key_vault_purge")
    monkeypatch.setattr(lifecycle_hooks, "key_vault_purge", paused)
    closing, closed = in_thread(lambda: close(gw, alice.user_id))
    assert locked.wait(10)

    asking, asked = in_thread(lambda: admit(gw, alice.account_id, str(uuid.uuid4())))
    time.sleep(0.5)
    assert asking.is_alive(), asked  # waiting for the closure's lock
    release.set()
    closing.join(10)
    asking.join(10)

    assert "error" not in closed and closed["value"].detail["jobs"] == 0
    refused = asked.get("error")
    assert isinstance(refused, HTTPException) and refused.status_code == 403 and refused.detail["code"] == "account_closed"
    assert account_jobs(gw, alice.account_id) == []
    with gw.state.session() as s:
        assert s.get(Account, alice.account_id).balance_micros == CREDIT


def test_a_job_admitted_just_before_the_closure_is_canceled_and_refunded_by_it(gw, monkeypatch):
    alice = signed_in(gw, "alice@example.com")
    # paid_share runs inside admit_job after it took the account's lock and charged for the job.
    paused, admitting_locked, release = pause(ledger, "paid_share")
    monkeypatch.setattr(ledger, "paid_share", paused)
    job_id = str(uuid.uuid4())
    admitting, admitted = in_thread(lambda: admit(gw, alice.account_id, job_id))
    assert admitting_locked.wait(10)

    closing, closed = in_thread(lambda: close(gw, alice.user_id))
    time.sleep(0.5)
    assert closing.is_alive(), closed  # waiting for the admission's lock
    release.set()
    admitting.join(10)
    closing.join(10)

    assert admitted == {"value": None}
    assert (closed["value"].detail["jobs"], closed["value"].detail["jobs_canceled"]) == (1, 1)
    [job] = account_jobs(gw, alice.account_id)
    assert (job.id, job.status) == (job_id, JobState.CANCELED.value)
    with gw.state.session() as s:
        assert s.get(Account, alice.account_id).balance_micros == CREDIT


def test_a_request_that_authenticated_before_the_closure_committed_is_refused_at_admission(gw, monkeypatch):
    alice = signed_in(gw, "alice@example.com")
    key = gw.client.post("/v1/me/keys", json={"name": "server"}, headers=alice.headers).json()["key"]
    real = api_standard.check_content_policy

    def close_meanwhile(*args, **kwargs):
        # After authentication and the standing checks, before the job's transaction.
        real(*args, **kwargs)
        close(gw, alice.user_id)

    monkeypatch.setattr(api_standard, "check_content_policy", close_meanwhile)
    answer = gw.client.post(
        "/v1/standard/videos", json={"params": TEXT.model_dump(mode="json"), "prompt": "a gull over a harbour"},
        headers={"authorization": f"Bearer {key}"},
    )
    assert answer.status_code == 403 and answer.json()["detail"]["code"] == "account_closed", answer.text
    assert account_jobs(gw, alice.account_id) == []
    with gw.state.session() as s:
        assert s.get(Account, alice.account_id).balance_micros == CREDIT


def test_the_lock_is_select_for_update_on_postgres_and_the_write_lock_on_sqlite():
    calls: list = []

    class Session:
        def get(self, model, ident, **options):
            calls.append(("get", model, ident, options))
            return "the account"

        def execute(self, statement):
            calls.append(("execute", str(statement)))

    assert account_closure.lock_account(SimpleNamespace(postgres=True), Session(), "a1") == "the account"
    assert calls == [("get", Account, "a1", {"with_for_update": True, "populate_existing": True})]
    calls.clear()
    assert account_closure.lock_account(SimpleNamespace(postgres=False), Session(), "a1") == "the account"
    assert calls[0][0] == "execute" and calls[0][1].startswith("UPDATE accounts SET closed_at=accounts.closed_at WHERE accounts.id")
    assert calls[1] == ("get", Account, "a1", {"populate_existing": True})


@pytest.mark.parametrize("closed_at", [None, 1.0])
def test_admission_reads_closed_at_inside_its_own_transaction(gw, closed_at):
    """The check reads the row the lock returns, not the object authentication loaded earlier."""
    alice = signed_in(gw, "alice@example.com")
    with gw.state.session() as s:
        stale = s.get(Account, alice.account_id)  # closed_at None, as authenticated
    with gw.state.session() as s, s.begin():
        s.get(Account, alice.account_id).closed_at = closed_at
    job_id = str(uuid.uuid4())
    if closed_at is None:
        with gw.state.session() as s, s.begin():
            api_public.admit_job(
                s, gw.state, stale, job_id=job_id, profile=gw.state.profiles[TEXT.profile_id], params=TEXT,
                enclave=s.get(Enclave, ENCLAVE), enc="e", ciphertext="c", input_blob_ids=[], webhook_url=None, privacy="standard",
                now=time.time(),
            )
        assert [j.id for j in account_jobs(gw, alice.account_id)] == [job_id]
    else:
        with pytest.raises(HTTPException) as refused:
            admit(gw, alice.account_id, job_id)
        assert refused.value.status_code == 403 and account_jobs(gw, alice.account_id) == []
