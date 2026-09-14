"""The C2PA issuing CA: certificates only for freshly attested enclaves' own keys, in a C2PA-conformant shape."""

from __future__ import annotations

import base64
import datetime
import json
import threading
import time
from pathlib import Path

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import serialization
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID
from fastapi.testclient import TestClient

from kuno_gateway.app import create_app
from kuno_gateway.ca import MAX_VALIDITY_S, CAConfigError, CAUnavailable, IssuanceLog, IssuingCA
from kuno_gateway.db import Enclave
from kuno_gateway.settings import Settings
from kuno_protocol import c2pa_certs, devkit
from kuno_protocol.attestation import AttestationEvidence, MockTEE, build_evidence, enclave_id_for
from kuno_protocol.c2pa_certs import C2PA_CLAIM_SIGNING_EKU, DOCUMENT_SIGNING_EKU, ENCLAVE_BINDING_OID, EnclaveBinding
from kuno_protocol.canonical import b64d, b64e
from kuno_protocol.crypto import generate_hpke_keypair, generate_signing_key, public_key_bytes, request_signature_message, signing_key_from_bytes

PROFILES = ["ltx-2.5-fast"]


@pytest.fixture
def settings(tmp_path) -> Settings:
    devkit.init(tmp_path / "data")
    return Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})


@pytest.fixture
def client(settings):
    return TestClient(create_app(settings))


class FakeEnclave:
    """A mock-TEE enclave speaking the signed miner protocol."""

    def __init__(self, data_dir: Path):
        quote_key = signing_key_from_bytes(b64d((data_dir / "mock_quote.key").read_text()))
        self.tee = MockTEE(quote_key, devkit.DEV_IMAGE_DIGEST)
        _, self.hpke_public = generate_hpke_keypair()
        self.key = generate_signing_key()
        self.public = public_key_bytes(self.key)
        self.id = enclave_id_for(self.hpke_public, self.public)

    def post(self, client: TestClient, path: str, body: bytes, enclave_id: str | None = None):
        timestamp = str(int(time.time()))
        signature = self.key.sign(request_signature_message("POST", path, timestamp, body))
        headers = {"x-kuno-enclave": enclave_id or self.id, "x-kuno-timestamp": timestamp, "x-kuno-signature": b64e(signature), "content-type": "application/json"}
        return client.post(path, content=body, headers=headers)

    def register(self, client: TestClient) -> AttestationEvidence:
        nonce = client.get("/miner/v1/nonce").json()["nonce"]
        evidence = build_evidence(self.tee, bytes.fromhex(nonce), self.hpke_public, self.public, devkit.DEV_IMAGE_DIGEST, PROFILES)
        body = json.dumps({"evidence": evidence.model_dump(mode="json"), "miner_hotkey": "5Miner", "capacity": 1}).encode()
        response = self.post(client, "/miner/v1/enclaves", body)
        assert response.status_code == 200, response.text
        return evidence

    def csr(self, key=None, common_name: str | None = None) -> str:
        csr = x509.CertificateSigningRequestBuilder().subject_name(c2pa_certs.name(common_name or self.id)).sign(key or self.key, None)
        return csr.public_bytes(serialization.Encoding.PEM).decode()

    def request_certificate(self, client: TestClient, csr_pem: str | None = None):
        return self.post(client, "/miner/v1/certificate", json.dumps({"csr_pem": self.csr() if csr_pem is None else csr_pem}).encode())


def update_enclave(client: TestClient, enclave_id: str, **fields) -> None:
    state = client.app.state.gw
    with state.session() as s, s.begin():
        row = s.get(Enclave, enclave_id)
        for name, value in fields.items():
            setattr(row, name, value)


def issuance_log(settings: Settings) -> list[dict]:
    """The issuance log, which lives in the gateway's database (c2pa_issuance.py), oldest first."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from kuno_gateway import c2pa_issuance

    engine = create_engine(settings.db_url)
    try:
        with Session(engine) as s:
            return c2pa_issuance.records(s)
    finally:
        engine.dispose()


def tamper_signature(csr_pem: str) -> str:
    der = bytearray(x509.load_pem_x509_csr(csr_pem.encode()).public_bytes(serialization.Encoding.DER))
    der[-1] ^= 0x01  # last byte of the Ed25519 signature
    body = base64.encodebytes(bytes(der)).decode()
    return f"-----BEGIN CERTIFICATE REQUEST-----\n{body}-----END CERTIFICATE REQUEST-----\n"


# ------------------------------------------------------------------ issuing


def test_a_freshly_attested_enclave_gets_a_c2pa_leaf_for_its_attested_key(settings, client):
    enclave = FakeEnclave(settings.data_dir)
    evidence = enclave.register(client)
    before = datetime.datetime.now(datetime.timezone.utc)
    response = enclave.request_certificate(client)
    assert response.status_code == 200, response.text
    body = response.json()
    leaf, intermediate = x509.load_pem_x509_certificates(body["certificate_chain_pem"].encode())
    trust = client.get("/v1/c2pa/trust").json()
    root = x509.load_pem_x509_certificate(trust["trust_anchors_pem"].encode())
    assert x509.load_pem_x509_certificate(trust["intermediates_pem"].encode()) == intermediate

    # Identity and chain
    assert leaf.subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value == enclave.id
    assert leaf.subject.get_attributes_for_oid(NameOID.ORGANIZATION_NAME)[0].value == "KunoWorld"
    assert leaf.public_key().public_bytes_raw() == enclave.public
    assert leaf.issuer == intermediate.subject != leaf.subject  # never a self-signed end entity
    leaf.verify_directly_issued_by(intermediate)
    intermediate.verify_directly_issued_by(root)
    assert leaf.version == x509.Version.v3

    # The C2PA certificate profile
    extensions = leaf.extensions
    constraints = extensions.get_extension_for_class(x509.BasicConstraints)
    assert constraints.critical and not constraints.value.ca
    usage = extensions.get_extension_for_class(x509.KeyUsage)
    assert usage.critical and usage.value.digital_signature and not usage.value.key_cert_sign
    eku = extensions.get_extension_for_class(x509.ExtendedKeyUsage)
    assert not eku.critical
    assert C2PA_CLAIM_SIGNING_EKU in eku.value and DOCUMENT_SIGNING_EKU in eku.value
    assert ExtendedKeyUsageOID.ANY_EXTENDED_KEY_USAGE not in eku.value
    ski = extensions.get_extension_for_class(x509.SubjectKeyIdentifier).value
    assert ski == x509.SubjectKeyIdentifier.from_public_key(leaf.public_key())
    aki = extensions.get_extension_for_class(x509.AuthorityKeyIdentifier).value
    assert aki.key_identifier == intermediate.extensions.get_extension_for_class(x509.SubjectKeyIdentifier).value.digest
    assert 0 < leaf.serial_number < 2**128
    assert c2pa_certs.is_leaf_profile(leaf)

    # Short validity, backdated a little for clock skew
    lifetime = leaf.not_valid_after_utc - leaf.not_valid_before_utc
    assert lifetime == datetime.timedelta(seconds=settings.c2pa_cert_validity_s + 300)
    assert abs((leaf.not_valid_after_utc - before).total_seconds() - settings.c2pa_cert_validity_s) < 30
    assert body["not_after"] == leaf.not_valid_after_utc.timestamp()

    # The binding extension ties the certificate to the verified attestation
    binding_ext = extensions.get_extension_for_oid(ENCLAVE_BINDING_OID)
    assert not binding_ext.critical
    binding = EnclaveBinding.from_certificate(leaf)
    assert binding == EnclaveBinding(enclave.id, evidence.digest(), devkit.DEV_IMAGE_DIGEST, PROFILES)

    # And the issuance is on the record
    [record] = issuance_log(settings)
    assert record["serial"] == body["serial"] == format(leaf.serial_number, "x")
    assert record["cert_sha256"] == __import__("hashlib").sha256(leaf.public_bytes(serialization.Encoding.DER)).hexdigest()
    assert record["enclave_id"] == enclave.id and record["evidence_digest"] == evidence.digest()
    assert record["not_before"] == leaf.not_valid_before_utc.timestamp() and record["not_after"] == body["not_after"]
    assert record["issued_at"] >= before.timestamp() - 1


def test_every_issuance_gets_a_fresh_random_serial_and_a_log_line(settings, client):
    enclave = FakeEnclave(settings.data_dir)
    enclave.register(client)
    serials = {enclave.request_certificate(client).json()["serial"] for _ in range(3)}
    assert len(serials) == 3
    assert [r["serial"] for r in issuance_log(settings)] == sorted(serials, key=[r["serial"] for r in issuance_log(settings)].index)


def test_the_certificate_answer_lists_the_timestamp_authorities_in_order(settings):
    enclave = FakeEnclave(settings.data_dir)
    plain = TestClient(create_app(settings))
    enclave.register(plain)
    body = enclave.request_certificate(plain).json()
    assert (body["tsa_url"], body["tsa_urls"]) == (None, [])

    settings.c2pa_tsa_url, settings.c2pa_tsa_urls = "http://tsa-a.example", ["http://tsa-a.example", "http://tsa-b.example/tsr"]
    client = TestClient(create_app(settings))
    enclave.register(client)
    body = enclave.request_certificate(client).json()
    # Workers fail over down tsa_urls; tsa_url, its first, is for workers that read one.
    assert (body["tsa_url"], body["tsa_urls"]) == ("http://tsa-a.example", ["http://tsa-a.example", "http://tsa-b.example/tsr"])


def test_validity_is_configurable(settings):
    settings.c2pa_cert_validity_s = 3600
    client = TestClient(create_app(settings))
    enclave = FakeEnclave(settings.data_dir)
    enclave.register(client)
    leaf = x509.load_pem_x509_certificates(enclave.request_certificate(client).json()["certificate_chain_pem"].encode())[0]
    assert leaf.not_valid_after_utc - leaf.not_valid_before_utc == datetime.timedelta(seconds=3600 + 300)


# ------------------------------------------------------------------ refusing


@pytest.mark.parametrize(
    "fields",
    [
        {"verified_at": 0.0},  # attestation older than the TTL
        {"last_seen": 0.0},  # silent past the heartbeat
        {"status": "stale"},  # retired or failed a challenge
    ],
    ids=["attestation-expired", "heartbeat-missed", "stale"],
)
def test_an_enclave_that_is_not_freshly_attested_is_refused(settings, client, fields):
    enclave = FakeEnclave(settings.data_dir)
    enclave.register(client)
    update_enclave(client, enclave.id, **fields)
    response = enclave.request_certificate(client)
    assert response.status_code == 403 and response.json()["detail"]["code"] == "enclave_not_attested"
    assert issuance_log(settings) == []


def test_a_revoked_or_unknown_enclave_is_refused(settings, client):
    revoked = FakeEnclave(settings.data_dir)
    revoked.register(client)
    update_enclave(client, revoked.id, status="revoked")
    assert revoked.request_certificate(client).status_code == 403
    stranger = FakeEnclave(settings.data_dir)  # never registered
    response = stranger.request_certificate(client)
    assert response.status_code == 401 and response.json()["detail"]["code"] == "unknown_enclave"
    assert issuance_log(settings) == []


def test_a_csr_that_does_not_prove_the_attested_key_for_this_enclave_is_refused(settings, client):
    enclave = FakeEnclave(settings.data_dir)
    enclave.register(client)
    other_key = generate_signing_key()
    cases = {
        "key_mismatch": enclave.csr(key=other_key),  # validly signed, but for another key
        "invalid_csr": enclave.csr(common_name="f" * 32),  # someone else's enclave id
    }
    for code, csr in cases.items():
        response = enclave.request_certificate(client, csr)
        assert response.status_code == 422 and response.json()["detail"]["code"] == code, code
    for bad in (tamper_signature(enclave.csr()), "not a csr", ""):
        response = enclave.request_certificate(client, bad)
        assert response.status_code == 422 and response.json()["detail"]["code"] in ("invalid_csr", "invalid_body")
    assert enclave.request_certificate(client, tamper_signature(enclave.csr())).json()["detail"]["code"] == "invalid_csr"
    assert issuance_log(settings) == []


def test_another_enclaves_signature_cannot_ask_for_a_certificate(settings, client):
    victim, attacker = FakeEnclave(settings.data_dir), FakeEnclave(settings.data_dir)
    victim.register(client)
    response = attacker.post(client, "/miner/v1/certificate", json.dumps({"csr_pem": attacker.csr(common_name=victim.id)}).encode(), victim.id)
    assert response.status_code == 401


def test_without_a_ca_the_gateway_says_so(settings):
    settings.c2pa_ca_key = settings.c2pa_ca_chain = None
    client = TestClient(create_app(settings))
    enclave = FakeEnclave(settings.data_dir)
    enclave.register(client)
    response = enclave.request_certificate(client)
    assert response.status_code == 503 and response.json()["detail"]["code"] == "ca_unavailable"
    assert client.get("/v1/c2pa/trust").status_code == 503


# ------------------------------------------------------------------ trust anchors


def test_the_trust_endpoint_publishes_the_root_and_the_intermediate(settings, client):
    trust = client.get("/v1/c2pa/trust").json()
    root = x509.load_pem_x509_certificate(trust["trust_anchors_pem"].encode())
    intermediate = x509.load_pem_x509_certificate(trust["intermediates_pem"].encode())
    assert root.subject == root.issuer and root.extensions.get_extension_for_class(x509.BasicConstraints).value.ca
    assert (settings.data_dir / "c2pa_root.pem").read_text() == trust["trust_anchors_pem"]
    intermediate.verify_directly_issued_by(root)
    constraints = intermediate.extensions.get_extension_for_class(x509.BasicConstraints).value
    assert constraints.ca and constraints.path_length == 0
    assert trust["enclave_binding_oid"] == ENCLAVE_BINDING_OID.dotted_string
    assert set(trust["leaf_ekus"]) == {C2PA_CLAIM_SIGNING_EKU.dotted_string, DOCUMENT_SIGNING_EKU.dotted_string}
    assert "PRIVATE KEY" not in json.dumps(trust)


# ------------------------------------------------------------------ configuration


def test_a_misconfigured_ca_stops_start_up(settings, tmp_path):
    other_key, _ = c2pa_certs.generate_root("unrelated")
    wrong_key = tmp_path / "wrong.key"
    wrong_key.write_bytes(c2pa_certs.private_key_pem(other_key))
    only_intermediate = tmp_path / "short-chain.pem"
    only_intermediate.write_text(settings.c2pa_ca_chain.read_text().split("-----END CERTIFICATE-----")[0] + "-----END CERTIFICATE-----\n")
    for change, match in [
        ({"c2pa_ca_key": wrong_key}, "does not match"),
        ({"c2pa_ca_chain": only_intermediate}, "exactly the intermediate then the root"),
        ({"c2pa_ca_chain": None}, "both"),
        ({"c2pa_cert_validity_s": MAX_VALIDITY_S + 1}, "KUNO_C2PA_CERT_VALIDITY_S"),
        ({"c2pa_cert_validity_s": settings.enclave_ttl_s - 1}, "KUNO_C2PA_CERT_VALIDITY_S"),
        ({"c2pa_ca_key": tmp_path / "missing.key"}, "cannot read"),
    ]:
        broken = Settings.from_env({"KUNO_DATA_DIR": str(settings.data_dir)})
        for name, value in change.items():
            setattr(broken, name, value)
        with pytest.raises(CAConfigError, match=match):
            IssuingCA.from_settings(broken)


def test_settings_read_the_ca_from_the_environment(settings, tmp_path):
    env = Settings.from_env({
        "KUNO_DATA_DIR": str(tmp_path / "elsewhere"), "KUNO_C2PA_CA_KEY": "/k.pem", "KUNO_C2PA_CA_CHAIN": "/c.pem",
        "KUNO_C2PA_CERT_VALIDITY_S": "7200", "KUNO_C2PA_TSA_URL": "http://tsa.example", "KUNO_C2PA_ISSUANCE_LOG": "/log.jsonl",
    })
    assert (env.c2pa_ca_key, env.c2pa_ca_chain, env.c2pa_cert_validity_s) == (Path("/k.pem"), Path("/c.pem"), 7200)
    assert (env.c2pa_tsa_url, env.c2pa_issuance_log) == ("http://tsa.example", Path("/log.jsonl"))
    assert settings.c2pa_issuance_log == settings.data_dir / "c2pa" / "issuance.jsonl"


def test_a_leaf_never_outlives_its_intermediate_and_an_expired_intermediate_issues_nothing(tmp_path):
    root_key, root = c2pa_certs.generate_root("root")
    key, intermediate = c2pa_certs.generate_intermediate(root_key, root, "issuing", days=1)
    ca = IssuingCA(key, intermediate, root, tmp_path / "log.jsonl", validity_s=MAX_VALIDITY_S)
    binding = EnclaveBinding("e" * 32, "ab" * 32, devkit.DEV_IMAGE_DIGEST, PROFILES)
    issued = ca.issue(public_key_bytes(generate_signing_key()), binding)
    assert issued.not_after == intermediate.not_valid_after_utc
    with pytest.raises(CAUnavailable):
        ca.issue(public_key_bytes(generate_signing_key()), binding, now=intermediate.not_valid_after_utc + datetime.timedelta(seconds=1))


@pytest.mark.parametrize("algorithm", ["p384", "p521", "ed25519"])
def test_every_supported_ca_algorithm_issues_ed25519_leaves(tmp_path, algorithm):
    root_key, root = c2pa_certs.generate_root("root", algorithm)
    key, intermediate = c2pa_certs.generate_intermediate(root_key, root, "issuing", algorithm)
    ca = IssuingCA(key, intermediate, root, tmp_path / "log.jsonl")
    issued = ca.issue(public_key_bytes(generate_signing_key()), EnclaveBinding("e" * 32, "cd" * 32, "sha256:x", []))
    issued.certificate.verify_directly_issued_by(intermediate)


def test_the_issuance_log_is_append_only_across_concurrent_writers(tmp_path):
    path = tmp_path / "c2pa" / "issuance.jsonl"
    writers = [IssuanceLog(path) for _ in range(4)]  # separate handles, as separate processes would have

    def write(log: IssuanceLog, n: int) -> None:
        for i in range(50):
            log.append({"writer": n, "i": i, "pad": "x" * 512})

    threads = [threading.Thread(target=write, args=(log, n)) for n, log in enumerate(writers)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    records = IssuanceLog(path).records()
    assert len(records) == 200 and {(r["writer"], r["i"]) for r in records} == {(n, i) for n in range(4) for i in range(50)}
