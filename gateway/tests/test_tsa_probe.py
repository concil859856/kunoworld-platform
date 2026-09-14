"""The RFC 3161 probe: a minimal DER TimeStampReq, a real TSA's reply parsed, and a fake TSA over HTTP."""

from __future__ import annotations

import datetime
import shutil
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

from kuno_gateway import ops_cli, startup_checks, tsa
from kuno_gateway.settings import Settings
from kuno_gateway.tsa import (
    SHA256_OID,
    SIGNED_DATA_OID,
    TST_INFO_OID,
    TimestampAuthorityRequired,
    der_explicit,
    der_generalized_time,
    der_integer,
    der_octets,
    der_oid,
    der_sequence,
    der_set,
    tlv,
)

HERE = Path(__file__).parent
POLICY = "1.2.3.4.5"


def _name(cn: str) -> x509.Name:
    return x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)])


def _certificate(subject: str, key, issuer: str, issuer_key, *, ca: bool, timestamping: bool = False) -> x509.Certificate:
    now = datetime.datetime.now(datetime.timezone.utc)
    builder = (
        x509.CertificateBuilder().subject_name(_name(subject)).issuer_name(_name(issuer)).public_key(key.public_key())
        .serial_number(x509.random_serial_number()).not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=1))
        .add_extension(x509.BasicConstraints(ca=ca, path_length=None), critical=True)
    )
    if timestamping:
        builder = builder.add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.TIME_STAMPING]), critical=True)
    return builder.sign(issuer_key, hashes.SHA256())


@pytest.fixture(scope="module")
def pki():
    root_key = ec.generate_private_key(ec.SECP256R1())
    unit_key = ec.generate_private_key(ec.SECP256R1())
    root = _certificate("Test TSA Root", root_key, "Test TSA Root", root_key, ca=True)
    unit = _certificate("Test TSA Unit", unit_key, "Test TSA Root", root_key, ca=False, timestamping=True)
    other_key = ec.generate_private_key(ec.SECP256R1())
    other = _certificate("Unrelated Root", other_key, "Unrelated Root", other_key, ca=True)
    return SimpleNamespace(root=root, unit=unit, other=other)


def pem(cert: x509.Certificate) -> bytes:
    return cert.public_bytes(serialization.Encoding.PEM)


def token(digest: bytes, nonce: int | None, gen_time: datetime.datetime, certificates: list[x509.Certificate]) -> bytes:
    """A timeStampToken shaped like a real one (ContentInfo / SignedData / TSTInfo). Unsigned: the probe doesn't verify
    CMS signatures."""
    tst = der_sequence(
        der_integer(1), der_oid(POLICY), der_sequence(der_sequence(der_oid(SHA256_OID)), der_octets(digest)), der_integer(4242),
        der_generalized_time(gen_time), der_integer(nonce) if nonce is not None else b"",
    )
    encap = der_sequence(der_oid(TST_INFO_OID), der_explicit(0, der_octets(tst)))
    certs = tlv(0xA0, b"".join(c.public_bytes(serialization.Encoding.DER) for c in certificates)) if certificates else b""
    signed = der_sequence(der_integer(3), der_set(der_sequence(der_oid(SHA256_OID))), encap, certs, der_set())
    return der_sequence(der_oid(SIGNED_DATA_OID), der_explicit(0, signed))


def response(status: int, token_der: bytes = b"", *, fail_bit: int | None = None, text: str | None = None) -> bytes:
    info = [der_integer(status)]
    if text:
        info.append(der_sequence(tlv(0x0C, text.encode())))
    if fail_bit is not None:
        data = bytearray(fail_bit // 8 + 1)
        data[fail_bit // 8] |= 0x80 >> (fail_bit % 8)
        info.append(tlv(0x03, bytes([7 - fail_bit % 8]) + bytes(data)))
    return der_sequence(der_sequence(*info), token_der)


@pytest.fixture
def fake_tsa(pki):
    """A TSA on localhost. The path picks the behaviour: /granted, /skewed, /rejection, /wrong-nonce, /no-token,
    /garbage, /http-500, /no-certificates."""
    seen: list[tuple[str, str, tsa.TimestampRequestInfo]] = []

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # keep test output quiet
            pass

        def do_POST(self):
            body = self.rfile.read(int(self.headers["content-length"]))
            info = tsa.parse_request(body)
            seen.append((self.path, self.headers.get("content-type"), info))
            now = datetime.datetime.now(datetime.timezone.utc)
            mode = self.path.strip("/")
            if mode == "http-500":
                self.send_response(500)
                self.end_headers()
                return
            payload = {
                "granted": lambda: response(0, token(info.digest, info.nonce, now, [pki.unit, pki.root])),
                "no-certificates": lambda: response(0, token(info.digest, info.nonce, now, [])),
                "skewed": lambda: response(0, token(info.digest, info.nonce, now - datetime.timedelta(hours=1), [pki.unit, pki.root])),
                "rejection": lambda: response(2, fail_bit=0, text="unsupported hash algorithm"),
                "wrong-nonce": lambda: response(0, token(info.digest, (info.nonce or 0) + 1, now, [pki.unit])),
                "no-token": lambda: response(0),
                "garbage": lambda: b"this is not DER",
            }[mode]()
            self.send_response(200)
            self.send_header("content-type", tsa.REPLY_TYPE)
            self.send_header("content-length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield SimpleNamespace(url=f"http://127.0.0.1:{server.server_address[1]}", seen=seen)
    finally:
        server.shutdown()
        server.server_close()


# ------------------------------------------------------------------ the request


def test_the_request_is_a_minimal_der_timestamp_request_with_cert_req():
    digest = bytes(range(32))
    request = tsa.timestamp_request(digest, nonce=0x0102)
    # SEQUENCE { INTEGER 1, SEQUENCE { SEQUENCE { OID sha256 } (no parameters), OCTET STRING digest }, INTEGER nonce, TRUE }
    expected = (
        bytes.fromhex("303b" "020101" "302f" "300b0609608648016503040201" "0420") + digest + bytes.fromhex("02020102" "0101ff")
    )
    assert request == expected
    parsed = tsa.parse_request(tsa.timestamp_request(digest, nonce=2**63 - 1))
    assert (parsed.version, parsed.hash_oid, parsed.digest, parsed.nonce, parsed.cert_req) == (1, SHA256_OID, digest, 2**63 - 1, True)
    # A nonce whose top bit is set gets a leading zero, so it stays positive.
    assert tsa.der_integer(0x80) == bytes.fromhex("02020080")
    with pytest.raises(ValueError):
        tsa.timestamp_request(b"short")


@pytest.mark.skipif(shutil.which("openssl") is None, reason="needs openssl")
def test_openssl_reads_the_request(tmp_path):
    path = tmp_path / "q.tsq"
    path.write_bytes(tsa.timestamp_request(bytes(32), nonce=12345))
    text = subprocess.run(["openssl", "ts", "-query", "-in", str(path), "-text"], capture_output=True, text=True, check=True).stdout
    assert "Hash Algorithm: sha256" in text and "Certificate required: yes" in text and "Nonce: 0x3039" in text


def test_a_real_tsa_reply_parses():
    """A query and FreeTSA's granted reply to it, captured 2026-09-14."""
    query = tsa.parse_request((HERE / "tsa_freetsa_query.der").read_bytes())
    reply = tsa.parse_response((HERE / "tsa_freetsa_reply.der").read_bytes())
    assert reply.granted and reply.status_name == "granted"
    assert reply.hash_oid == SHA256_OID and reply.digest == query.digest and reply.nonce == query.nonce
    assert reply.gen_time == datetime.datetime(2026, 9, 14, 11, 5, 40, tzinfo=datetime.timezone.utc)
    assert reply.policy == "1.2.3.4.1" and len(reply.certificates) == 2
    subjects = [x509.load_der_x509_certificate(c).subject.rfc4514_string() for c in reply.certificates]
    assert any("www.freetsa.org" in s for s in subjects)


# ------------------------------------------------------------------ probing a fake TSA


def test_a_granted_reply_passes_and_is_described(fake_tsa, pki):
    result = tsa.probe(f"{fake_tsa.url}/granted")
    assert result.ok, result.problems
    assert (result.http_status, result.status, result.policy) == (200, "granted", POLICY)
    assert result.tsa_certificate == "CN=Test TSA Unit" and result.chain_root == "CN=Test TSA Root"
    assert abs(result.clock_skew_s) < 5 and not result.warnings and result.trusted is None
    [(path, content_type, request)] = fake_tsa.seen
    assert content_type == tsa.QUERY_TYPE and request.cert_req and request.nonce and len(request.digest) == 32
    assert any(line.startswith("TSA ") and line.endswith("OK") for line in result.lines())


def test_a_trust_list_says_whether_the_chain_reaches_an_anchor(fake_tsa, pki):
    assert tsa.probe(f"{fake_tsa.url}/granted", trust_anchors_pem=pem(pki.root)).trusted is True
    untrusted = tsa.probe(f"{fake_tsa.url}/granted", trust_anchors_pem=pem(pki.other))
    assert untrusted.trusted is False and not untrusted.ok
    assert any("trust list" in p for p in untrusted.problems)


@pytest.mark.parametrize(
    ("mode", "problem"),
    [
        ("rejection", "status rejection (unsupported hash algorithm; badAlg)"),
        ("wrong-nonce", "the token's nonce is not the nonce that was sent"),
        ("no-token", "granted, but the reply carries no timeStampToken"),
        ("http-500", "HTTP 500"),
    ],
)
def test_a_failing_tsa_is_reported(fake_tsa, mode, problem):
    result = tsa.probe(f"{fake_tsa.url}/{mode}")
    assert not result.ok and problem in result.problems


def test_garbage_and_an_unreachable_tsa_fail_without_raising(fake_tsa):
    garbage = tsa.probe(f"{fake_tsa.url}/garbage")
    assert not garbage.ok and garbage.problems[0].startswith("the reply is not a TimeStampResp")
    unreachable = tsa.probe("http://127.0.0.1:9/tsr", timeout=2)
    assert not unreachable.ok and unreachable.problems[0].startswith("request failed")


def test_clock_skew_and_missing_certificates_are_warnings(fake_tsa):
    skewed = tsa.probe(f"{fake_tsa.url}/skewed")
    assert skewed.ok and skewed.clock_skew_s < -3000 and any("genTime" in w for w in skewed.warnings)
    bare = tsa.probe(f"{fake_tsa.url}/no-certificates")
    assert bare.ok and any("no certificate" in w for w in bare.warnings)


# ------------------------------------------------------------------ check-tsa and the start-up probe


def test_check_tsa_exits_by_outcome(fake_tsa, tmp_path, pki):
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path)})
    lines: list[str] = []

    def args(url=None, trust_list=None):
        return SimpleNamespace(url=url, timeout=5.0, trust_list=trust_list)

    assert ops_cli.check_tsa(args(f"{fake_tsa.url}/granted"), settings, out=lines.append) == 0
    assert lines[0].endswith(": OK")
    assert ops_cli.check_tsa(args(f"{fake_tsa.url}/rejection"), settings, out=lines.append) == 1
    assert ops_cli.check_tsa(args(), settings, out=lines.append) == 2  # no URL anywhere
    anchors = tmp_path / "tsa-trust-list.pem"
    anchors.write_bytes(pem(pki.root))
    settings.c2pa_tsa_url = f"{fake_tsa.url}/granted"
    lines.clear()
    assert ops_cli.check_tsa(args(trust_list=str(anchors)), settings, out=lines.append) == 0
    assert "  chains to the trust list: yes" in lines


def test_the_start_up_probe_modes(fake_tsa, tmp_path):
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path), "KUNO_C2PA_TSA_URL": f"{fake_tsa.url}/rejection"})
    assert settings.c2pa_tsa_probe == "off" and startup_checks.probe_timestamp_authority(settings) is None
    settings.c2pa_tsa_probe = "warn"
    assert startup_checks.probe_timestamp_authority(settings).ok is False
    settings.c2pa_tsa_probe = "require"
    with pytest.raises(TimestampAuthorityRequired, match="failed its start-up probe"):
        startup_checks.probe_timestamp_authority(settings)
    settings.c2pa_tsa_url = f"{fake_tsa.url}/granted"
    assert startup_checks.probe_timestamp_authority(settings).ok
    settings.c2pa_tsa_probe = "sometimes"
    with pytest.raises(ValueError):
        startup_checks.probe_timestamp_authority(settings)
    assert Settings.from_env({"KUNO_DATA_DIR": str(tmp_path), "KUNO_C2PA_TSA_PROBE": "Require"}).c2pa_tsa_probe == "require"
