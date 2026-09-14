"""NSFW is banned in both modes. The gateway can read a Standard prompt, so it refuses a violation before sealing,
charging or storing anything, and records one `content_policy` strike; strikes feed the usual restrictions.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

from test_standard_moderation_flow import (  # fixtures and helpers
    TEXT,
    balance,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    new_account,
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
)

from kuno_gateway.db import Blob, Job
from kuno_gateway.db_moderation import StandardJob, Strike

MESSAGE = "This prompt isn't allowed. Sexual and NSFW content is not permitted."
PROMPT = "n.u.d.e woman walking on a beach"


def post(gw, headers, prompt: str, path: str = "/v1/standard/videos"):
    return gw.client.post(path, json={"params": TEXT.model_dump(mode="json"), "prompt": prompt}, headers=headers)


def test_an_nsfw_standard_prompt_is_refused_with_a_strike_and_nothing_is_charged_or_stored(gw, caplog):
    account_id, key = new_account(gw)
    before = balance(gw, account_id)
    refused = post(gw, key, PROMPT)
    assert refused.status_code == 422
    assert refused.json()["detail"] == {"code": "content_policy", "message": MESSAGE}
    assert balance(gw, account_id) == before
    with gw.state.session() as s:
        assert s.query(Job).count() == 0 and s.query(StandardJob).count() == 0 and s.query(Blob).count() == 0
        [strike] = s.query(Strike).filter(Strike.account_id == account_id).all()
    assert (strike.reason, strike.job_id) == ("content_policy", None)
    assert gw.client.get("/v1/account/eligibility", headers=key).json()["strikes_24h"] == 1
    # The prompt never reaches the logs.
    assert all("beach" not in record.getMessage() for record in caplog.records)

    # An ordinary prompt is fine.
    assert post(gw, key, "a quiet beach at dawn").status_code == 201


def test_strikes_from_refused_prompts_restrict_the_account(gw):
    account_id, key = new_account(gw)
    codes = [post(gw, key, prompt).json()["detail"]["code"] for prompt in ("jailbait", "hentai girl", "porn scene")]
    assert codes == ["content_policy"] * 3
    # Three strikes in 24 hours: restricted for an hour (KUNO_STRIKE_RULES), in either mode.
    restricted = post(gw, key, "a quiet beach at dawn")
    assert restricted.status_code == 403 and restricted.json()["detail"]["code"] == "account_restricted"


def test_the_web_session_routes_apply_the_same_policy(gw):
    from kuno_gateway import identity, ledger

    with gw.state.session() as s, s.begin():
        user = identity.redeem_login_token(s, identity.issue_login_token(s, "ada@example.com", 900))
        token, _ = identity.open_session(s, user.id, identity.WEB, 3600)
        account_id = identity.account_for_user(s, user.id).id
        ledger.post(s, account_id, ledger.to_micros(10), kind=ledger.ADJUSTMENT, source="admin", idempotency_key=f"t:{account_id}")
    session = {"authorization": f"Bearer {token}"}
    for path in ("/v1/standard/videos", "/v1/me/standard/videos"):
        refused = post(gw, session, "nsfw", path)
        assert refused.status_code == 422 and refused.json()["detail"]["code"] == "content_policy", path
    with gw.state.session() as s:
        assert s.query(Strike).filter(Strike.account_id == account_id, Strike.reason == "content_policy").count() == 2
