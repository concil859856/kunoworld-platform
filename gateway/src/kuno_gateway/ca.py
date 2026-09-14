"""Attestation-gated issuing CA for C2PA signing certificates.

The subnet owner keeps the root offline (`kuno-devkit c2pa-root`) and gives the gateway
one issuing intermediate (`kuno-devkit c2pa-intermediate`): `KUNO_C2PA_CA_KEY` is its
private key, `KUNO_C2PA_CA_CHAIN` the intermediate then the root certificate, in PEM.

The gateway issues a leaf only for an enclave whose attestation it has verified and which
is still fresh (see api_ca.py), and only for that enclave's attested Ed25519 signing key.
Leaves are short-lived, so dropping an enclave (revoked, stale) takes its certificate out
of use within one validity period without CRLs or OCSP. Every issuance is recorded in the
database (`c2pa_issuances`, c2pa_issuance.py) before the certificate is returned; the old
JSONL log is only read, to import it.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import logging
import os
import secrets
import threading
from dataclasses import dataclass
from pathlib import Path

from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.x509.oid import NameOID

from kuno_protocol.c2pa_certs import ENCLAVE_BINDING_OID, LEAF_EKUS, EnclaveBinding, certificate_pem, name, signature_hash

try:
    import fcntl
except ImportError:  # pragma: no cover - the gateway runs on Linux
    fcntl = None

log = logging.getLogger("kuno.gateway.ca")

DEFAULT_VALIDITY_S = 86400
# Short validity is the revocation mechanism, so it stays well under the policy's 90-day AL2 cap.
MAX_VALIDITY_S = 7 * 86400
# Tolerates clock skew between gateway, enclave and verifiers.
BACKDATE_S = 300
MAX_CSR_PEM_BYTES = 8192


class CAConfigError(Exception):
    """The configured CA key or chain is unusable. Raised at start-up."""


class CAUnavailable(Exception):
    """The CA cannot issue right now (expired intermediate, log not writable)."""


class CSRRejected(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code, self.message = code, message


def _spki(public_key) -> bytes:
    return public_key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)


def _common_names(subject: x509.Name) -> list[str]:
    return [str(a.value) for a in subject.get_attributes_for_oid(NameOID.COMMON_NAME)]


def check_csr(csr_pem: str, enclave_id: str, signing_public_key: bytes) -> ed25519.Ed25519PublicKey:
    """The CSR's key, provided the request proves possession of the attested key for this enclave."""
    if len(csr_pem.encode()) > MAX_CSR_PEM_BYTES:
        raise CSRRejected("invalid_csr", "The CSR is too large.")
    try:
        csr = x509.load_pem_x509_csr(csr_pem.encode())
        signature_ok = csr.is_signature_valid
        public_key = csr.public_key()
    except (ValueError, TypeError):
        raise CSRRejected("invalid_csr", "The CSR is not a PEM PKCS#10 request.") from None
    if not signature_ok:
        raise CSRRejected("invalid_csr", "The CSR signature does not verify.")
    if not isinstance(public_key, ed25519.Ed25519PublicKey) or public_key.public_bytes_raw() != signing_public_key:
        raise CSRRejected("key_mismatch", "The CSR is not for this enclave's attested signing key.")
    if _common_names(csr.subject) != [enclave_id]:
        raise CSRRejected("invalid_csr", "The CSR subject common name must be exactly the enclave id.")
    return public_key


class IssuanceLog:
    """Append-only JSONL, one line per certificate, serialized across processes with flock."""

    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()

    def append(self, record: dict) -> None:
        line = json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock, open(self.path, "a", encoding="utf-8") as handle:
            if fcntl is not None:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
            try:
                handle.write(line)
                handle.flush()
                os.fsync(handle.fileno())
            finally:
                if fcntl is not None:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    def records(self) -> list[dict]:
        if not self.path.exists():
            return []
        return [json.loads(line) for line in self.path.read_text(encoding="utf-8").splitlines() if line.strip()]


@dataclass(frozen=True)
class IssuedCertificate:
    certificate: x509.Certificate
    chain_pem: str
    binding: EnclaveBinding

    @property
    def serial_hex(self) -> str:
        return format(self.certificate.serial_number, "x")

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.certificate.public_bytes(serialization.Encoding.DER)).hexdigest()

    @property
    def not_before(self) -> datetime.datetime:
        return self.certificate.not_valid_before_utc

    @property
    def not_after(self) -> datetime.datetime:
        return self.certificate.not_valid_after_utc


class IssuingCA:
    def __init__(
        self,
        key,
        intermediate: x509.Certificate,
        root: x509.Certificate,
        log_path: Path,
        validity_s: int = DEFAULT_VALIDITY_S,
        tsa_url: str | None = None,
    ):
        self.key, self.intermediate, self.root = key, intermediate, root
        self.validity_s = validity_s
        self.tsa_url = tsa_url
        self.log = IssuanceLog(log_path)
        self._validate()

    # ------------------------------------------------------------ loading

    @classmethod
    def from_settings(cls, settings) -> IssuingCA | None:
        """None when no CA is configured; CAConfigError when it is configured wrongly."""
        key_path, chain_path = settings.c2pa_ca_key, settings.c2pa_ca_chain
        if key_path is None and chain_path is None:
            return None
        if key_path is None or chain_path is None:
            raise CAConfigError("set both KUNO_C2PA_CA_KEY and KUNO_C2PA_CA_CHAIN, or neither")
        if not settings.enclave_ttl_s <= settings.c2pa_cert_validity_s <= MAX_VALIDITY_S:
            raise CAConfigError(
                f"KUNO_C2PA_CERT_VALIDITY_S must be between the enclave attestation TTL ({settings.enclave_ttl_s}s) "
                f"and {MAX_VALIDITY_S}s, not {settings.c2pa_cert_validity_s}"
            )
        try:
            key_pem, chain = Path(key_path).read_bytes(), Path(chain_path).read_bytes()
        except OSError as exc:
            raise CAConfigError(f"cannot read the C2PA CA files: {exc.strerror}") from None
        try:
            key = serialization.load_pem_private_key(key_pem, password=None)
        except TypeError:
            raise CAConfigError("KUNO_C2PA_CA_KEY is encrypted; the gateway needs an unencrypted PKCS#8 key") from None
        except ValueError:
            raise CAConfigError("KUNO_C2PA_CA_KEY is not a PEM private key") from None
        try:
            certs = x509.load_pem_x509_certificates(chain)
        except ValueError:
            raise CAConfigError("KUNO_C2PA_CA_CHAIN is not a PEM certificate chain") from None
        if len(certs) != 2:
            raise CAConfigError("KUNO_C2PA_CA_CHAIN must hold exactly the intermediate then the root certificate")
        return cls(key, certs[0], certs[1], settings.c2pa_issuance_log, settings.c2pa_cert_validity_s, settings.c2pa_tsa_url)

    def _validate(self) -> None:
        try:
            signature_hash(self.key)
        except ValueError as exc:
            raise CAConfigError(str(exc)) from None
        if _spki(self.key.public_key()) != _spki(self.intermediate.public_key()):
            raise CAConfigError("KUNO_C2PA_CA_KEY does not match the intermediate certificate (first in the chain)")
        for label, cert in (("intermediate", self.intermediate), ("root", self.root)):
            try:
                constraints = cert.extensions.get_extension_for_class(x509.BasicConstraints).value
                usage = cert.extensions.get_extension_for_class(x509.KeyUsage).value
            except x509.ExtensionNotFound:
                raise CAConfigError(f"the {label} certificate lacks basicConstraints or keyUsage") from None
            if not constraints.ca or not usage.key_cert_sign:
                raise CAConfigError(f"the {label} certificate is not a certificate authority")
        if self.root.subject != self.root.issuer:
            raise CAConfigError("the last certificate in KUNO_C2PA_CA_CHAIN must be the self-signed root")
        try:
            self.root.verify_directly_issued_by(self.root)
            self.intermediate.verify_directly_issued_by(self.root)
        except (ValueError, TypeError, InvalidSignature):
            raise CAConfigError("the intermediate is not signed by the root in KUNO_C2PA_CA_CHAIN") from None

    # ------------------------------------------------------------ issuing

    def issue(self, signing_public_key: bytes, binding: EnclaveBinding, now: datetime.datetime | None = None) -> IssuedCertificate:
        now = now or datetime.datetime.now(datetime.timezone.utc)
        if not self.intermediate.not_valid_before_utc <= now < self.intermediate.not_valid_after_utc:
            raise CAUnavailable("the issuing intermediate is outside its validity period")
        public_key = ed25519.Ed25519PublicKey.from_public_bytes(signing_public_key)
        not_before = max(now - datetime.timedelta(seconds=BACKDATE_S), self.intermediate.not_valid_before_utc)
        not_after = min(now + datetime.timedelta(seconds=self.validity_s), self.intermediate.not_valid_after_utc)
        try:
            issuer_ski = self.intermediate.extensions.get_extension_for_class(x509.SubjectKeyIdentifier).value
            aki = x509.AuthorityKeyIdentifier.from_issuer_subject_key_identifier(issuer_ski)
        except x509.ExtensionNotFound:
            aki = x509.AuthorityKeyIdentifier.from_issuer_public_key(self.key.public_key())
        serial = 0
        while serial == 0:
            serial = secrets.randbits(128)
        leaf = (
            x509.CertificateBuilder()
            .subject_name(name(binding.enclave_id))
            .issuer_name(self.intermediate.subject)
            .public_key(public_key)
            .serial_number(serial)
            .not_valid_before(not_before)
            .not_valid_after(not_after)
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
            # digitalSignature is what C2PA requires; nonRepudiation is in the C2PA Certificate Policy's leaf profile.
            .add_extension(x509.KeyUsage(True, True, False, False, False, False, False, False, False), critical=True)
            .add_extension(x509.ExtendedKeyUsage(list(LEAF_EKUS)), critical=False)
            .add_extension(x509.SubjectKeyIdentifier.from_public_key(public_key), critical=False)
            .add_extension(aki, critical=False)
            .add_extension(binding.extension(), critical=False)
            .sign(self.key, signature_hash(self.key))
        )
        # The root is the verifier's trust anchor, so the chain carries only leaf and intermediate.
        return IssuedCertificate(leaf, certificate_pem(leaf) + certificate_pem(self.intermediate), binding)

    def issuance_fields(self, issued: IssuedCertificate, issued_at: float) -> dict:
        return {
            "serial": issued.serial_hex,
            "cert_sha256": issued.sha256,
            "enclave_id": issued.binding.enclave_id,
            "evidence_digest": issued.binding.evidence_digest,
            "image_digest": issued.binding.image_digest,
            "profiles": issued.binding.profiles,
            "not_before": issued.not_before.timestamp(),
            "not_after": issued.not_after.timestamp(),
            "issued_at": issued_at,
            "issuer_sha256": hashlib.sha256(self.intermediate.public_bytes(serialization.Encoding.DER)).hexdigest(),
        }

    def record(self, s, issued: IssuedCertificate, issued_at: float) -> None:
        """Adds the issuance to the database log (c2pa_issuance.py) in the caller's transaction; the caller returns
        the certificate only once that commits. `self.log` (the old JSONL file) is only read, for the import."""
        from . import c2pa_issuance

        c2pa_issuance.record(s, self.issuance_fields(issued, issued_at))

    # ------------------------------------------------------------ publishing

    def trust(self) -> dict:
        def describe(cert: x509.Certificate) -> dict:
            return {
                "subject": cert.subject.rfc4514_string(),
                "sha256": hashlib.sha256(cert.public_bytes(serialization.Encoding.DER)).hexdigest(),
                "not_before": cert.not_valid_before_utc.timestamp(),
                "not_after": cert.not_valid_after_utc.timestamp(),
            }

        return {
            "trust_anchors_pem": certificate_pem(self.root),
            "intermediates_pem": certificate_pem(self.intermediate),
            "root": describe(self.root),
            "intermediate": describe(self.intermediate),
            "leaf_ekus": [oid.dotted_string for oid in LEAF_EKUS],
            "enclave_binding_oid": ENCLAVE_BINDING_OID.dotted_string,
            "leaf_validity_s": self.validity_s,
        }
