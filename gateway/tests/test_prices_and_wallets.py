"""The TAO price oracle refuses to guess, and coldkeys are linked only by a valid signature."""

from __future__ import annotations

import json
import re
from decimal import Decimal

import pytest
import sr25519
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from scalecodec.utils.ss58 import ss58_encode

from kuno_gateway import prices, wallets
from kuno_gateway.app import create_app
from kuno_gateway.settings import Settings

# ------------------------------------------------------------------ prices


def fake_exchanges(kraken="234.00", coinbase="233.90", coingecko=234.10, fail=()):
    responses = {
        prices.SOURCES["kraken"][0]: {"error": [], "result": {"TAOUSD": {"c": [kraken, "1.0"]}}},
        prices.SOURCES["coinbase"][0]: {"price": coinbase},
        prices.SOURCES["coingecko"][0]: {"bittensor": {"usd": coingecko}},
    }
    calls = []

    def fetch(url):
        calls.append(url)
        name = next(k for k, v in prices.SOURCES.items() if v[0] == url)
        if name in fail:
            raise RuntimeError(f"{name} is down")
        return responses[url]

    return fetch, calls


def test_the_rate_is_the_median_of_the_sources():
    fetch, _ = fake_exchanges()
    rate, source = prices.TaoPriceOracle(fetch=fetch).usd_per_tao()
    assert rate == Decimal("234.00")
    assert "kraken" in source and "coinbase" in source and "coingecko" in source


def test_one_source_down_is_fine_but_two_is_not():
    fetch, _ = fake_exchanges(fail=("coinbase",))
    assert prices.TaoPriceOracle(fetch=fetch).usd_per_tao()[0] == Decimal("234.05")
    fetch, _ = fake_exchanges(fail=("coinbase", "kraken"))
    with pytest.raises(prices.PriceUnavailable, match="1 TAO price source"):
        prices.TaoPriceOracle(fetch=fetch).usd_per_tao()


def test_sources_that_disagree_stop_crediting():
    fetch, _ = fake_exchanges(kraken="234.00", coinbase="250.00", coingecko=234.10)
    with pytest.raises(prices.PriceUnavailable, match="disagree"):
        prices.TaoPriceOracle(max_divergence=0.02, fetch=fetch).usd_per_tao()


def test_the_rate_is_cached_briefly():
    fetch, calls = fake_exchanges()
    oracle = prices.TaoPriceOracle(ttl_s=60, fetch=fetch)
    oracle.usd_per_tao(now=1_000)
    oracle.usd_per_tao(now=1_030)
    assert len(calls) == 3
    oracle.usd_per_tao(now=1_061)
    assert len(calls) == 6


# ------------------------------------------------------------------ wallets


def keypair(seed_byte: int):
    public, secret = sr25519.pair_from_seed(bytes([seed_byte]) * 32)
    return (public, secret), ss58_encode(public, ss58_format=42)


def test_a_signature_over_the_message_or_its_browser_wrapping_verifies():
    pair, address = keypair(7)
    message = "KunoWorld: link this Bittensor coldkey to my account."
    raw = sr25519.sign(pair, message.encode()).hex()
    wrapped = sr25519.sign(pair, b"<Bytes>" + message.encode() + b"</Bytes>").hex()
    assert wallets.verify_signature(address, message, raw)
    assert wallets.verify_signature(address, message, "0x" + wrapped)
    assert not wallets.verify_signature(address, message + "!", raw)
    _, other = keypair(8)
    assert not wallets.verify_signature(other, message, raw)
    with pytest.raises(wallets.InvalidWallet):
        wallets.public_key("not-an-address")


@pytest.fixture
def settings(tmp_path) -> Settings:
    devkit.init(tmp_path / "data")
    return Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})


def sign_in(client: TestClient, settings: Settings, email: str) -> dict:
    client.post("/v1/auth/magic-link", json={"email": email})
    text = json.loads(sorted(settings.outbox_dir.iterdir())[-1].read_text())["text"]
    token = re.search(r"token=([\w-]+)", text).group(1)
    return {"authorization": f"Bearer {client.post('/v1/auth/verify', json={'token': token}).json()['session_token']}"}


def link(client: TestClient, session: dict, pair, address: str):
    challenge = client.post("/v1/me/wallets/challenge", json={"address": address}, headers=session).json()
    signature = sr25519.sign(pair, challenge["message"].encode()).hex()
    return challenge, client.post("/v1/me/wallets/verify", json={"challenge_id": challenge["challenge_id"], "signature": signature}, headers=session)


def test_a_coldkey_is_linked_by_signing_its_challenge(settings):
    client = TestClient(create_app(settings))
    ada = sign_in(client, settings, "ada@example.com")
    pair, address = keypair(1)

    challenge, linked = link(client, ada, pair, address)
    assert f"Coldkey: {address}" in challenge["message"]
    assert linked.status_code == 201 and linked.json()["address"] == address
    assert [w["address"] for w in client.get("/v1/me/wallets", headers=ada).json()] == [address]

    # The same challenge can't be replayed.
    replay = client.post(
        "/v1/me/wallets/verify",
        json={"challenge_id": challenge["challenge_id"], "signature": sr25519.sign(pair, challenge["message"].encode()).hex()},
        headers=ada,
    )
    assert replay.status_code == 422


def test_a_wrong_signature_or_someone_elses_challenge_links_nothing(settings):
    client = TestClient(create_app(settings))
    ada, grace = sign_in(client, settings, "ada@example.com"), sign_in(client, settings, "grace@example.com")
    pair, address = keypair(2)
    other_pair, _ = keypair(3)

    challenge = client.post("/v1/me/wallets/challenge", json={"address": address}, headers=ada).json()
    forged = sr25519.sign(other_pair, challenge["message"].encode()).hex()
    assert client.post("/v1/me/wallets/verify", json={"challenge_id": challenge["challenge_id"], "signature": forged}, headers=ada).status_code == 422
    stolen = sr25519.sign(pair, challenge["message"].encode()).hex()
    assert client.post("/v1/me/wallets/verify", json={"challenge_id": challenge["challenge_id"], "signature": stolen}, headers=grace).status_code == 422
    assert client.get("/v1/me/wallets", headers=ada).json() == []


def test_a_coldkey_belongs_to_one_account_and_can_be_unlinked(settings):
    client = TestClient(create_app(settings))
    ada, grace = sign_in(client, settings, "ada@example.com"), sign_in(client, settings, "grace@example.com")
    pair, address = keypair(4)
    assert link(client, ada, pair, address)[1].status_code == 201
    taken = link(client, grace, pair, address)[1]
    assert taken.status_code == 409 and taken.json()["detail"]["code"] == "wallet_linked_elsewhere"

    assert client.delete(f"/v1/me/wallets/{address}", headers=grace).status_code == 404
    assert client.delete(f"/v1/me/wallets/{address}", headers=ada).status_code == 204
    assert link(client, grace, pair, address)[1].status_code == 201


def test_the_payment_config_says_what_is_switched_on(settings):
    settings.tao_treasury_address = keypair(9)[1]
    settings.alpha_netuids = [51]
    config = TestClient(create_app(settings)).get("/v1/payments/config").json()
    assert config["card"]["enabled"] is False and config["usdt"]["enabled"] is False
    assert config["tao"]["enabled"] is True and config["tao"]["treasury_address"] == settings.tao_treasury_address
    assert config["alpha"] == {"enabled": True, "netuids": [51], "haircut": 0.10, "max_usd_per_deposit": 500.0, "credit_bonus": 0.05}
