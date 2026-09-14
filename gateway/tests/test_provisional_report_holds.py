"""A csam or sexual_minor report holds its job the moment it arrives, before any operator acts: dismissal releases
the hold, removal or a ban extends it to the full preservation period, and other reports hold nothing.

Reuses the fixtures of test_standard_moderation_flow.py and the helpers of test_preservation_holds_flow.py.
"""

from __future__ import annotations

import time

from test_preservation_holds_flow import holds, resolve
from test_standard_moderation_flow import (  # fixtures and helpers
    _private_job,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    new_account,
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
)

from kuno_gateway.db import Blob

DAY = 86400


def report(gw, job_id: str, reason: str) -> str:
    sent = gw.client.post("/v1/reports", json={"job_id": job_id, "reason": reason})
    assert sent.status_code == 202, sent.text
    return sent.json()["report_id"]


def test_a_csam_report_holds_its_job_on_arrival_without_hiding_it(gw, media):
    account_id, _ = new_account(gw)
    job_id, _ = _private_job(gw, account_id, media.clip)
    report(gw, job_id, "csam")

    [hold] = holds(gw, "active", job_id=job_id)
    assert hold["reason"] == "report_csam"
    assert 29 * DAY < hold["expires_at"] - time.time() <= 30 * DAY + 60
    with gw.state.session() as s:
        # Held, not removed: the blobs keep their normal expiry until an operator acts.
        assert s.query(Blob).filter(Blob.job_id == job_id).one().expires_at > time.time()


def test_dismissing_the_report_releases_its_provisional_hold(gw, media):
    account_id, _ = new_account(gw)
    job_id, _ = _private_job(gw, account_id, media.clip)
    report_id = report(gw, job_id, "sexual_minor")
    resolve(gw, report_id, "dismiss")
    assert holds(gw, "active", job_id=job_id) == []
    assert [h["job_id"] for h in holds(gw, "released", job_id=job_id)] == [job_id]


def test_removal_extends_the_provisional_hold_to_the_full_preservation_period(gw, media):
    account_id, _ = new_account(gw)
    job_id, _ = _private_job(gw, account_id, media.clip)
    report_id = report(gw, job_id, "csam")
    resolve(gw, report_id, "remove_content")
    [hold] = holds(gw, "active", job_id=job_id)
    assert hold["expires_at"] - time.time() > 364 * DAY


def test_other_reasons_and_unknown_content_hold_nothing(gw, media):
    account_id, _ = new_account(gw)
    job_id, _ = _private_job(gw, account_id, media.clip)
    report(gw, job_id, "harassment")
    unknown = gw.client.post("/v1/reports", json={"content_digest": "a" * 64, "reason": "csam"})
    assert unknown.status_code == 202
    assert holds(gw, "all") == []
