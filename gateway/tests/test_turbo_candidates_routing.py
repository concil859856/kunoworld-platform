"""Turbo candidate enclaves serve only validator benchmarks: no customer routes, no online-capacity count."""

from __future__ import annotations

import json
import time

from kuno_protocol import devkit
from kuno_protocol.turbo import is_candidate_profile_list

from kuno_gateway.db import Enclave
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState

CANDIDATE_PROFILES = ["turbo:ltx-2.5-fast"]


def enclave(enclave_id: str, profiles: list[str]) -> Enclave:
    now = time.time()
    return Enclave(
        id=enclave_id, miner_hotkey="5Hotkey", tee="mock", image_digest="sha256:img", hpke_public_key="k", signing_public_key="s",
        profiles=json.dumps(profiles), hardware="{}", evidence="{}", capacity=1, inflight=0, status="active",
        verified_at=now, last_seen=now,
    )


def test_candidates_are_left_out_of_capacity_and_customer_routes(tmp_path):
    devkit.init(tmp_path / "data")
    state = GatewayState(Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")}))
    assert is_candidate_profile_list(CANDIDATE_PROFILES)
    with state.session() as s, s.begin():
        s.add(enclave("serving", ["ltx-2.5-fast"]))
        s.add(enclave("candidate", CANDIDATE_PROFILES))

    with state.session() as s:
        assert [e.id for e in state.fresh_enclaves(s)] == ["serving"]
        assert [e.id for e in state.fresh_enclaves(s, "ltx-2.5-fast")] == ["serving"]
        assert state.capacity_counts(s) == {"ltx-2.5-fast": 1}
