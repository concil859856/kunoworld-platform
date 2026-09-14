"""A database restore can't reopen a closed account: `reapply-deletions` closes it again."""

from __future__ import annotations

import pytest
from account_sessions import signed_in
from sqlalchemy import select, update
from test_account_closure import close
from test_standard_moderation_flow import (  # fixtures
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    pytestmark,  # noqa: F401
)

from kuno_gateway import account_closure, tombstones
from kuno_gateway.db import Account, User, UserSession
from kuno_gateway.db_lifecycle import AccountClosure


def restore_as_if_never_closed(gw, email: str) -> tuple[str, str]:
    """What a restore from a backup taken before the closure looks like: the address, sessions and account are back."""
    with gw.state.session() as s, s.begin():
        closure = s.scalars(select(AccountClosure)).one()
        account_id, user_id = closure.account_id, closure.user_id
        s.get(User, user_id).email = email
        s.execute(update(UserSession).where(UserSession.user_id == user_id).values(revoked_at=None))
        s.get(Account, account_id).closed_at = None
        s.delete(closure)
    return account_id, user_id


def test_replaying_tombstones_closes_a_restored_account_again(gw):
    email = "restored-closure@example.com"
    who = signed_in(gw, email)
    close(gw, who)
    account_id, user_id = restore_as_if_never_closed(gw, email)

    dry = tombstones.reapply(gw.state, since=0, dry_run=True, source="db")
    # Outcomes are counted per (kind, outcome).
    assert dry.outcomes[("account_closure", "would_delete")] == 1 and not dry.errors
    with gw.state.session() as s:
        assert s.get(Account, account_id).closed_at is None  # a dry run changes nothing

    report = tombstones.reapply(gw.state, since=0, source="db")
    assert report.outcomes[("account_closure", "deleted")] == 1
    assert not report.unhandled and not report.errors
    with gw.state.session() as s:
        user, account = s.get(User, user_id), s.get(Account, account_id)
        assert user.email == account_closure.placeholder_email(user_id)
        assert account.closed_at is not None
        assert s.scalars(select(UserSession).where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))).first() is None
        assert s.scalars(select(AccountClosure).where(AccountClosure.account_id == account_id)).one()

    # Idempotent: the account is already closed as recorded.
    again = tombstones.reapply(gw.state, since=0, source="db")
    assert again.outcomes[("account_closure", "absent")] == 1


@pytest.mark.parametrize("kind", ["account_closure", "job_content"])
def test_closure_tombstone_kinds_have_replayers(kind):
    assert kind in tombstones._REPLAYERS
