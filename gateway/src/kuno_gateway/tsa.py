"""RFC 3161 timestamp authority probe.

C2PA readers judge a manifest's certificate at the time of its RFC 3161 timestamp; without one, a manifest stops
validating when its short-lived certificate expires (subnet/PROVENANCE.md). This module checks that a TSA answers:

* `timestamp_request(digest, nonce)` builds a minimal DER `TimeStampReq` (RFC 3161 §2.4.1): version 1, a SHA-256
  message imprint, a nonce and `certReq` TRUE (C2PA §10.3.2.5 says certReq "shall be asserted").
* `parse_response(der)` reads the `TimeStampResp`: `PKIStatusInfo` and, if present, the token's `TSTInfo`
  (policy, imprint, serial, genTime, nonce) and the certificates the token carries.
* `verify_token_signature(token)` checks the token's CMS signature (RFC 5652 §5.4 and §5.6) with the certificate the
  token carries: the signed `messageDigest` is the digest of the TSTInfo, the signed `contentType` is id-ct-TSTInfo,
  the signature verifies over the DER signed attributes under the signer certificate's key (RSA PKCS#1 v1.5 or PSS,
  ECDSA, Ed25519), and an ESS signing-certificate attribute (RFC 5816, RFC 2634), when present, names that certificate.
* `probe(url)` sends a request over HTTP (`application/timestamp-query`, RFC 3161 §3.4) and checks the status is
  granted, the imprint and nonce that come back are the ones sent, the signature verifies, and the clock is sane. With
  a trust list (for example the C2PA TSA Trust List PEM) it also says whether the token's chain reaches one of its
  anchors.

No CMS library does this for us: `cryptography` (in the lock) can build and decrypt PKCS#7 but not verify it, and
asn1crypto isn't a dependency. So the SignerInfo is read with the DER reader below, and `cryptography` checks the
digest and signature. What it still leaves to the reader that validates a manifest: certificate validity periods,
revocation, and trust unless a trust list is given.

`configured_urls(settings)` is the gateway's ordered TSA list (KUNO_C2PA_TSA_URLS). `kuno-gateway check-tsa` probes
each; `KUNO_C2PA_TSA_PROBE=warn|require` probes them at start-up.
"""

from __future__ import annotations

import datetime
import hashlib
import secrets
from dataclasses import dataclass, field
from typing import Any

import httpx

SHA256_OID = "2.16.840.1.101.3.4.2.1"
SIGNED_DATA_OID = "1.2.840.113549.1.7.2"
TST_INFO_OID = "1.2.840.113549.1.9.16.1.4"
TIME_STAMPING_EKU_OID = "1.3.6.1.5.5.7.3.8"
QUERY_TYPE = "application/timestamp-query"
REPLY_TYPE = "application/timestamp-reply"

STATUS_NAMES = {
    0: "granted", 1: "grantedWithMods", 2: "rejection", 3: "waiting", 4: "revocationWarning", 5: "revocationNotification",
}
FAILURE_BITS = {
    0: "badAlg", 2: "badRequest", 5: "badDataFormat", 14: "timeNotAvailable", 15: "unacceptedPolicy",
    16: "unacceptedExtension", 17: "addInfoNotAvailable", 25: "systemFailure",
}

# Universal tags
INTEGER, BIT_STRING, OCTET_STRING, NULL, OID, UTF8_STRING, GENERALIZED_TIME = 0x02, 0x03, 0x04, 0x05, 0x06, 0x0C, 0x18
BOOLEAN, SEQUENCE, SET = 0x01, 0x30, 0x31


class DerError(ValueError):
    pass


def configured_urls(settings: Any) -> list[str]:
    """The timestamp authorities a gateway hands to workers, in order of preference: `c2pa_tsa_urls`
    (KUNO_C2PA_TSA_URLS, or KUNO_C2PA_TSA_URL alone), with `c2pa_tsa_url` first when it names one the list lacks."""
    urls = [url for url in (getattr(settings, "c2pa_tsa_urls", None) or []) if url]
    first = getattr(settings, "c2pa_tsa_url", None)
    if first and first not in urls:
        urls.insert(0, first)
    return list(dict.fromkeys(urls))


# ------------------------------------------------------------------ DER encoding


def _length(n: int) -> bytes:
    if n < 0x80:
        return bytes([n])
    body = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return bytes([0x80 | len(body)]) + body


def tlv(tag: int, content: bytes) -> bytes:
    return bytes([tag]) + _length(len(content)) + content


def der_integer(value: int) -> bytes:
    if value < 0:
        raise ValueError("only non-negative integers are needed here")
    body = value.to_bytes(max(1, (value.bit_length() + 8) // 8), "big")  # a leading zero keeps the sign bit clear
    while len(body) > 1 and body[0] == 0 and body[1] < 0x80:
        body = body[1:]
    return tlv(INTEGER, body)


def der_oid(dotted: str) -> bytes:
    parts = [int(p) for p in dotted.split(".")]
    if len(parts) < 2:
        raise ValueError("an OID needs at least two arcs")
    out = bytearray([40 * parts[0] + parts[1]])
    for arc in parts[2:]:
        chunk = [arc & 0x7F]
        arc >>= 7
        while arc:
            chunk.append(0x80 | (arc & 0x7F))
            arc >>= 7
        out.extend(reversed(chunk))
    return tlv(OID, bytes(out))


def der_sequence(*items: bytes) -> bytes:
    return tlv(SEQUENCE, b"".join(items))


def der_set(*items: bytes) -> bytes:
    return tlv(SET, b"".join(sorted(items)))


def der_octets(data: bytes) -> bytes:
    return tlv(OCTET_STRING, data)


def der_boolean(value: bool) -> bytes:
    return tlv(BOOLEAN, b"\xff" if value else b"\x00")


def der_generalized_time(when: datetime.datetime) -> bytes:
    return tlv(GENERALIZED_TIME, when.astimezone(datetime.timezone.utc).strftime("%Y%m%d%H%M%SZ").encode())


def der_explicit(number: int, content: bytes) -> bytes:
    return tlv(0xA0 | number, content)


def timestamp_request(digest: bytes, nonce: int | None = None, *, cert_req: bool = True, policy: str | None = None) -> bytes:
    """A DER TimeStampReq for a SHA-256 digest.

    The AlgorithmIdentifier omits parameters, which RFC 5754 §2 says implementations MUST generate for SHA-2 (and
    MUST accept either way)."""
    if len(digest) != 32:
        raise ValueError("a SHA-256 message imprint is 32 bytes")
    imprint = der_sequence(der_sequence(der_oid(SHA256_OID)), der_octets(digest))
    items = [der_integer(1), imprint]
    if policy:
        items.append(der_oid(policy))
    if nonce is not None:
        items.append(der_integer(nonce))
    if cert_req:
        items.append(der_boolean(True))
    return der_sequence(*items)


# ------------------------------------------------------------------ DER decoding


@dataclass(frozen=True)
class Tlv:
    tag: int
    value: bytes
    raw: bytes

    def children(self) -> list[Tlv]:
        return read_all(self.value)


def read_tlv(buf: bytes, pos: int = 0) -> tuple[Tlv, int]:
    if pos + 2 > len(buf):
        raise DerError("truncated DER")
    tag = buf[pos]
    if tag & 0x1F == 0x1F:
        raise DerError("high tag numbers are not used here")
    first = buf[pos + 1]
    offset = pos + 2
    if first < 0x80:
        length = first
    else:
        count = first & 0x7F
        if count == 0 or count > 4 or offset + count > len(buf):
            raise DerError("unsupported DER length")
        length = int.from_bytes(buf[offset : offset + count], "big")
        offset += count
    end = offset + length
    if end > len(buf):
        raise DerError("DER value runs past the end")
    return Tlv(tag, bytes(buf[offset:end]), bytes(buf[pos:end])), end


def read_all(buf: bytes) -> list[Tlv]:
    items, pos = [], 0
    while pos < len(buf):
        item, pos = read_tlv(buf, pos)
        items.append(item)
    return items


def read_one(buf: bytes, tag: int | None = None) -> Tlv:
    item, end = read_tlv(buf)
    if end != len(buf):
        raise DerError("trailing bytes after DER value")
    if tag is not None and item.tag != tag:
        raise DerError(f"expected tag 0x{tag:02x}, got 0x{item.tag:02x}")
    return item


def decode_integer(item: Tlv) -> int:
    if item.tag != INTEGER or not item.value:
        raise DerError("expected an INTEGER")
    return int.from_bytes(item.value, "big", signed=True)


def decode_oid(item: Tlv) -> str:
    if item.tag != OID or not item.value:
        raise DerError("expected an OBJECT IDENTIFIER")
    first = item.value[0]
    arcs = [min(first // 40, 2), first - 40 * min(first // 40, 2)]
    value = 0
    for byte in item.value[1:]:
        value = (value << 7) | (byte & 0x7F)
        if not byte & 0x80:
            arcs.append(value)
            value = 0
    return ".".join(str(a) for a in arcs)


def decode_generalized_time(item: Tlv) -> datetime.datetime:
    if item.tag != GENERALIZED_TIME:
        raise DerError("expected a GeneralizedTime")
    text = item.value.decode("ascii")
    if not text.endswith("Z"):
        raise DerError("GeneralizedTime must be UTC")
    text = text[:-1]
    main, _, fraction = text.partition(".")
    when = datetime.datetime.strptime(main, "%Y%m%d%H%M%S").replace(tzinfo=datetime.timezone.utc)
    if fraction:
        when += datetime.timedelta(seconds=float(f"0.{fraction}"))
    return when


# ------------------------------------------------------------------ requests and responses


@dataclass
class TimestampRequestInfo:
    version: int
    hash_oid: str
    digest: bytes
    policy: str | None
    nonce: int | None
    cert_req: bool


def parse_request(der: bytes) -> TimestampRequestInfo:
    """Reads a TimeStampReq (used by tests and the fake TSA)."""
    fields = read_one(der, SEQUENCE).children()
    if len(fields) < 2:
        raise DerError("a TimeStampReq has at least a version and a message imprint")
    version = decode_integer(fields[0])
    algorithm, digest = fields[1].children()
    hash_oid = decode_oid(algorithm.children()[0])
    if digest.tag != OCTET_STRING:
        raise DerError("hashedMessage must be an OCTET STRING")
    policy = nonce = None
    cert_req = False
    for item in fields[2:]:
        if item.tag == OID:
            policy = decode_oid(item)
        elif item.tag == INTEGER:
            nonce = decode_integer(item)
        elif item.tag == BOOLEAN:
            cert_req = item.value != b"\x00"
    return TimestampRequestInfo(version, hash_oid, digest.value, policy, nonce, cert_req)


@dataclass
class TimestampResponse:
    status: int
    status_strings: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)
    token: bytes | None = None
    policy: str | None = None
    hash_oid: str | None = None
    digest: bytes | None = None
    serial: int | None = None
    gen_time: datetime.datetime | None = None
    nonce: int | None = None
    certificates: list[bytes] = field(default_factory=list)

    @property
    def status_name(self) -> str:
        return STATUS_NAMES.get(self.status, f"unknown({self.status})")

    @property
    def granted(self) -> bool:
        return self.status in (0, 1)


def _failure_names(bits: Tlv) -> list[str]:
    if bits.tag != BIT_STRING or not bits.value:
        return []
    data = bits.value[1:]
    names = []
    for index in range(len(data) * 8):
        if data[index // 8] & (0x80 >> (index % 8)):
            names.append(FAILURE_BITS.get(index, f"bit{index}"))
    return names


def parse_response(der: bytes) -> TimestampResponse:
    fields = read_one(der, SEQUENCE).children()
    if not fields or fields[0].tag != SEQUENCE:
        raise DerError("a TimeStampResp starts with PKIStatusInfo")
    info = fields[0].children()
    response = TimestampResponse(status=decode_integer(info[0]))
    for item in info[1:]:
        if item.tag == SEQUENCE:
            response.status_strings = [s.value.decode("utf-8", "replace") for s in item.children() if s.tag == UTF8_STRING]
        elif item.tag == BIT_STRING:
            response.failures = _failure_names(item)
    if len(fields) > 1:
        response.token = fields[1].raw
        _read_token(fields[1], response)
    return response


def _read_token(content_info: Tlv, response: TimestampResponse) -> None:
    parts = content_info.children()
    if len(parts) != 2 or decode_oid(parts[0]) != SIGNED_DATA_OID or parts[1].tag != 0xA0:
        raise DerError("the timeStampToken is not a CMS SignedData ContentInfo")
    signed = read_one(parts[1].value, SEQUENCE).children()
    if len(signed) < 4:
        raise DerError("SignedData is incomplete")
    encap = signed[2].children()
    if decode_oid(encap[0]) != TST_INFO_OID or len(encap) < 2 or encap[1].tag != 0xA0:
        raise DerError("the token does not carry TSTInfo")
    tst = read_one(read_one(encap[1].value, OCTET_STRING).value, SEQUENCE).children()
    response.policy = decode_oid(tst[1])
    algorithm, digest = tst[2].children()
    response.hash_oid, response.digest = decode_oid(algorithm.children()[0]), digest.value
    response.serial = decode_integer(tst[3])
    response.gen_time = decode_generalized_time(tst[4])
    for item in tst[5:]:
        if item.tag == INTEGER:
            response.nonce = decode_integer(item)
    for item in signed[3:]:
        if item.tag == 0xA0:  # certificates [0] IMPLICIT SET OF CertificateChoices
            response.certificates = [c.raw for c in item.children() if c.tag == SEQUENCE]


# ------------------------------------------------------------------ the token's signature

CONTENT_TYPE_ATTR_OID = "1.2.840.113549.1.9.3"
MESSAGE_DIGEST_ATTR_OID = "1.2.840.113549.1.9.4"
SIGNING_CERTIFICATE_OID = "1.2.840.113549.1.9.16.2.12"
SIGNING_CERTIFICATE_V2_OID = "1.2.840.113549.1.9.16.2.47"
SHA1_OID = "1.3.14.3.2.26"
SHA224_OID = "2.16.840.1.101.3.4.2.4"
SHA384_OID = "2.16.840.1.101.3.4.2.2"
SHA512_OID = "2.16.840.1.101.3.4.2.3"
RSA_ENCRYPTION_OID = "1.2.840.113549.1.1.1"
RSASSA_PSS_OID = "1.2.840.113549.1.1.10"
MGF1_OID = "1.2.840.113549.1.1.8"
EC_PUBLIC_KEY_OID = "1.2.840.10045.2.1"
ED25519_OID = "1.3.101.112"
# Signature algorithms that name their hash.
RSA_WITH_HASH = {
    "1.2.840.113549.1.1.5": SHA1_OID, "1.2.840.113549.1.1.14": SHA224_OID, "1.2.840.113549.1.1.11": SHA256_OID,
    "1.2.840.113549.1.1.12": SHA384_OID, "1.2.840.113549.1.1.13": SHA512_OID,
}
ECDSA_WITH_HASH = {
    "1.2.840.10045.4.1": SHA1_OID, "1.2.840.10045.4.3.1": SHA224_OID, "1.2.840.10045.4.3.2": SHA256_OID,
    "1.2.840.10045.4.3.3": SHA384_OID, "1.2.840.10045.4.3.4": SHA512_OID,
}


class _Unsupported(Exception):
    pass


@dataclass
class SignatureCheck:
    # True: verified. False: it doesn't (see problems). None: not checked (see warnings).
    valid: bool | None = None
    signer: str | None = None
    problems: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _hash(oid: str):
    from cryptography.hazmat.primitives import hashes

    known = {SHA1_OID: hashes.SHA1, SHA224_OID: hashes.SHA224, SHA256_OID: hashes.SHA256, SHA384_OID: hashes.SHA384, SHA512_OID: hashes.SHA512}
    if oid not in known:
        raise _Unsupported(f"digest algorithm {oid}")
    return known[oid]()


def _digest(oid: str, data: bytes) -> bytes:
    from cryptography.hazmat.primitives import hashes

    hasher = hashes.Hash(_hash(oid))
    hasher.update(data)
    return hasher.finalize()


def _attributes(signed_attrs: Tlv) -> dict[str, Tlv]:
    """SignedAttributes: OID -> the attribute's first value."""
    out: dict[str, Tlv] = {}
    for attribute in signed_attrs.children():
        oid, values = attribute.children()[:2]
        members = values.children()
        if members:
            out.setdefault(decode_oid(oid), members[0])
    return out


def _find_signer(sid: Tlv, certificates: list):
    from cryptography import x509

    if sid.tag == SEQUENCE:  # IssuerAndSerialNumber
        issuer, serial = sid.children()[:2]
        number = decode_integer(serial)
        for cert in certificates:
            if cert.serial_number == number and cert.issuer.public_bytes() == issuer.raw:
                return cert
        by_serial = [cert for cert in certificates if cert.serial_number == number]
        return by_serial[0] if len(by_serial) == 1 else None
    if sid.tag == 0x80:  # [0] IMPLICIT SubjectKeyIdentifier
        for cert in certificates:
            try:
                if cert.extensions.get_extension_for_class(x509.SubjectKeyIdentifier).value.digest == sid.value:
                    return cert
            except x509.ExtensionNotFound:
                continue
    return None


def _pss_parameters(params: Tlv | None) -> tuple[str, str, int]:
    """RSASSA-PSS-params (RFC 4055 §3.1): hash, MGF1 hash, salt length, with their defaults."""
    hash_oid, mgf_hash_oid, salt = SHA1_OID, SHA1_OID, 20
    if params is not None and params.tag == SEQUENCE:
        for item in params.children():
            if item.tag == 0xA0:
                hash_oid = decode_oid(read_one(item.value, SEQUENCE).children()[0])
            elif item.tag == 0xA1:
                mgf = read_one(item.value, SEQUENCE).children()
                if decode_oid(mgf[0]) != MGF1_OID:
                    raise _Unsupported("RSASSA-PSS with a mask generation function other than MGF1")
                mgf_hash_oid = decode_oid(mgf[1].children()[0])
            elif item.tag == 0xA2:
                salt = decode_integer(read_one(item.value, INTEGER))
    return hash_oid, mgf_hash_oid, salt


def _verify_with(key, algorithm: Tlv, digest_oid: str, signature: bytes, data: bytes) -> None:
    """Raises InvalidSignature, or _Unsupported for an algorithm this doesn't check."""
    from cryptography.hazmat.primitives.asymmetric import ec, ed25519, padding, rsa

    parts = algorithm.children()
    oid = decode_oid(parts[0])
    if isinstance(key, rsa.RSAPublicKey):
        if oid == RSASSA_PSS_OID:
            hash_oid, mgf_hash_oid, salt = _pss_parameters(parts[1] if len(parts) > 1 else None)
            key.verify(signature, data, padding.PSS(mgf=padding.MGF1(_hash(mgf_hash_oid)), salt_length=salt), _hash(hash_oid))
            return
        if oid not in RSA_WITH_HASH and oid != RSA_ENCRYPTION_OID:
            raise _Unsupported(f"signature algorithm {oid} with an RSA key")
        key.verify(signature, data, padding.PKCS1v15(), _hash(RSA_WITH_HASH.get(oid, digest_oid)))
    elif isinstance(key, ec.EllipticCurvePublicKey):
        if oid not in ECDSA_WITH_HASH and oid != EC_PUBLIC_KEY_OID:
            raise _Unsupported(f"signature algorithm {oid} with an EC key")
        key.verify(signature, data, ec.ECDSA(_hash(ECDSA_WITH_HASH.get(oid, digest_oid))))
    elif isinstance(key, ed25519.Ed25519PublicKey) and oid == ED25519_OID:
        key.verify(signature, data)
    else:
        raise _Unsupported(f"signature algorithm {oid} with a {type(key).__name__}")


def _check_signing_certificate(attributes: dict[str, Tlv], signer, check: SignatureCheck) -> None:
    """ESS signingCertificateV2 (RFC 5816) or signingCertificate (RFC 2634): the first ESSCertID must be the signer's."""
    from cryptography.hazmat.primitives import serialization

    der = signer.public_bytes(serialization.Encoding.DER)
    if SIGNING_CERTIFICATE_V2_OID in attributes:
        first = attributes[SIGNING_CERTIFICATE_V2_OID].children()[0].children()[0].children()
        hash_oid = SHA256_OID
        if first[0].tag == SEQUENCE:  # hashAlgorithm, when it isn't the default SHA-256
            hash_oid, first = decode_oid(first[0].children()[0]), first[1:]
        expected = first[0].value
    elif SIGNING_CERTIFICATE_OID in attributes:
        hash_oid, expected = SHA1_OID, attributes[SIGNING_CERTIFICATE_OID].children()[0].children()[0].children()[0].value
    else:
        return
    if _digest(hash_oid, der) != expected:
        check.problems.append("the token's signing-certificate attribute names a different certificate than its signer")


def verify_token_signature(token: bytes) -> SignatureCheck:
    """Checks a timeStampToken's CMS signature with the certificates it carries (see the module docstring). Trust in
    the signer certificate is separate. Never raises for a malformed or unsupported token: see `valid`, `problems` and
    `warnings`."""
    from cryptography import x509
    from cryptography.exceptions import InvalidSignature

    check = SignatureCheck()
    try:
        parts = read_one(token, SEQUENCE).children()
        if len(parts) != 2 or decode_oid(parts[0]) != SIGNED_DATA_OID or parts[1].tag != 0xA0:
            raise DerError("the timeStampToken is not a CMS SignedData ContentInfo")
        signed = read_one(parts[1].value, SEQUENCE).children()
        encap = signed[2].children()
        if decode_oid(encap[0]) != TST_INFO_OID or len(encap) < 2 or encap[1].tag != 0xA0:
            raise DerError("the token does not carry TSTInfo")
        content = read_one(encap[1].value, OCTET_STRING).value
        certificates = []
        for item in signed[3:]:
            if item.tag == 0xA0:
                certificates = [x509.load_der_x509_certificate(c.raw) for c in item.children() if c.tag == SEQUENCE]
        signer_sets = [item for item in signed[3:] if item.tag == SET]
        infos = signer_sets[-1].children() if signer_sets else []
        if not infos:
            check.valid = False
            check.problems.append("the token carries no SignerInfo")
            return check
        if len(infos) > 1:
            check.warnings.append("the token has several SignerInfos; only the first was checked")
        fields = infos[0].children()
        sid, digest_algorithm, rest = fields[1], fields[2], fields[3:]
        signed_attrs = rest.pop(0) if rest and rest[0].tag == 0xA0 else None
        algorithm, signature = rest[0], rest[1]
        if signature.tag != OCTET_STRING:
            raise DerError("the SignerInfo's signature is not an OCTET STRING")
        digest_oid = decode_oid(digest_algorithm.children()[0])
        signer = _find_signer(sid, certificates)
        if signer is None:
            if certificates:
                check.valid = False
                check.problems.append("no certificate in the token matches its SignerInfo")
            else:
                check.warnings.append("signature not checked: the token carries no certificate")
            return check
        check.signer = signer.subject.rfc4514_string()
        if signed_attrs is None:
            data = content
        else:
            attributes = _attributes(signed_attrs)
            content_type = attributes.get(CONTENT_TYPE_ATTR_OID)
            if content_type is None or content_type.tag != OID or decode_oid(content_type) != TST_INFO_OID:
                check.problems.append("the token's signed contentType is not id-ct-TSTInfo")
            message_digest = attributes.get(MESSAGE_DIGEST_ATTR_OID)
            if message_digest is None or message_digest.tag != OCTET_STRING or message_digest.value != _digest(digest_oid, content):
                check.problems.append("the token's signed messageDigest is not the digest of its TSTInfo")
            _check_signing_certificate(attributes, signer, check)
            # The signature covers the attributes DER-encoded as a SET, not with their [0] IMPLICIT tag (RFC 5652 §5.4).
            data = bytes([SET]) + signed_attrs.raw[1:]
        try:
            _verify_with(signer.public_key(), algorithm, digest_oid, signature.value, data)
            verified: bool | None = True
        except InvalidSignature:
            check.problems.append("the token's signature does not verify under its signer certificate")
            verified = False
    except _Unsupported as exc:
        check.warnings.append(f"signature not checked: unsupported {exc}")
        verified = None
    except (DerError, IndexError, ValueError, TypeError) as exc:
        check.valid = False
        check.problems.append(f"the token's signature could not be read: {exc}")
        return check
    check.valid = False if check.problems else verified
    return check


# ------------------------------------------------------------------ probing


@dataclass
class ProbeResult:
    url: str
    ok: bool = False
    http_status: int | None = None
    content_type: str | None = None
    status: str | None = None
    policy: str | None = None
    gen_time: datetime.datetime | None = None
    clock_skew_s: float | None = None
    # verify_token_signature's verdict: True, False, or None when it couldn't be checked.
    signature_valid: bool | None = None
    tsa_certificate: str | None = None
    chain_root: str | None = None
    trusted: bool | None = None
    problems: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def lines(self) -> list[str]:
        out = [f"TSA {self.url}: {'OK' if self.ok else 'FAILED'}"]
        for label, value in (
            ("HTTP status", self.http_status), ("content type", self.content_type), ("PKIStatus", self.status),
            ("policy", self.policy), ("genTime", self.gen_time.isoformat() if self.gen_time else None),
            ("clock skew (s)", None if self.clock_skew_s is None else f"{self.clock_skew_s:.1f}"),
            ("CMS signature", None if self.signature_valid is None else ("valid" if self.signature_valid else "INVALID")),
            ("TSA certificate", self.tsa_certificate), ("chain ends at", self.chain_root),
            ("chains to the trust list", None if self.trusted is None else ("yes" if self.trusted else "no")),
        ):
            if value is not None:
                out.append(f"  {label}: {value}")
        out.extend(f"  problem: {p}" for p in self.problems)
        out.extend(f"  warning: {w}" for w in self.warnings)
        return out


def _certificates_summary(result: ProbeResult, certificates: list[bytes], anchors_pem: bytes | None) -> None:
    from cryptography import x509
    from cryptography.x509.oid import ExtendedKeyUsageOID

    certs = []
    for der in certificates:
        try:
            certs.append(x509.load_der_x509_certificate(der))
        except ValueError:
            result.warnings.append("the token carries a certificate that does not parse")
    if not certs:
        result.warnings.append("the token carries no certificate although certReq was set")
        return

    def eku(cert) -> list:
        try:
            return list(cert.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value)
        except x509.ExtensionNotFound:
            return []

    signer = next((c for c in certs if ExtendedKeyUsageOID.TIME_STAMPING in eku(c)), None)
    if signer is None:
        result.warnings.append("no certificate in the token has the id-kp-timeStamping EKU")
        signer = certs[0]
    result.tsa_certificate = signer.subject.rfc4514_string()
    by_subject = {c.subject: c for c in certs}
    top, seen = signer, set()
    while top.issuer in by_subject and top.issuer != top.subject and top.issuer not in seen:
        seen.add(top.issuer)
        top = by_subject[top.issuer]
    result.chain_root = top.issuer.rfc4514_string()
    if anchors_pem is None:
        return
    try:
        anchors = x509.load_pem_x509_certificates(anchors_pem)
    except ValueError:
        result.problems.append("the trust list is not a PEM certificate bundle")
        return
    anchor_ders = {a.public_bytes(serialization_der()) for a in anchors}
    trusted = False
    for cert in [top, *certs]:
        if cert.public_bytes(serialization_der()) in anchor_ders:
            trusted = True
            break
        for anchor in anchors:
            if cert.issuer != anchor.subject:
                continue
            try:
                cert.verify_directly_issued_by(anchor)
            except Exception:  # wrong key type, bad signature: not this anchor
                continue
            trusted = True
            break
        if trusted:
            break
    result.trusted = trusted
    if not trusted:
        result.problems.append("the token's certificate chain does not reach an anchor in the trust list")


def serialization_der():
    from cryptography.hazmat.primitives import serialization

    return serialization.Encoding.DER


def probe(
    url: str, *, timeout: float = 10.0, client: httpx.Client | None = None, trust_anchors_pem: bytes | None = None,
    max_skew_s: float = 300.0, now: datetime.datetime | None = None,
) -> ProbeResult:
    """Sends one timestamp request for a random digest. Never raises for TSA or network failures: see `ok`/`problems`."""
    result = ProbeResult(url=url)
    digest = hashlib.sha256(b"kuno tsa probe " + secrets.token_bytes(16)).digest()
    nonce = secrets.randbits(63) | 1
    body = timestamp_request(digest, nonce)
    own = client is None
    http = client or httpx.Client(timeout=timeout, follow_redirects=False)
    try:
        reply = http.post(url, content=body, headers={"Content-Type": QUERY_TYPE, "Accept": REPLY_TYPE})
    except httpx.HTTPError as exc:
        result.problems.append(f"request failed: {type(exc).__name__}")
        return result
    finally:
        if own:
            http.close()
    result.http_status = reply.status_code
    result.content_type = reply.headers.get("content-type")
    if reply.status_code != 200:
        result.problems.append(f"HTTP {reply.status_code}")
        return result
    if (result.content_type or "").split(";")[0].strip().lower() != REPLY_TYPE:
        result.warnings.append(f"content type is not {REPLY_TYPE}")
    try:
        parsed = parse_response(reply.content)
    except (DerError, IndexError, ValueError) as exc:
        result.problems.append(f"the reply is not a TimeStampResp: {exc}")
        return result
    result.status = parsed.status_name
    if not parsed.granted:
        detail = "; ".join(parsed.status_strings + parsed.failures)
        result.problems.append(f"status {parsed.status_name}" + (f" ({detail})" if detail else ""))
        return result
    if parsed.token is None:
        result.problems.append("granted, but the reply carries no timeStampToken")
        return result
    result.policy, result.gen_time = parsed.policy, parsed.gen_time
    if parsed.hash_oid != SHA256_OID or parsed.digest != digest:
        result.problems.append("the token's message imprint is not the digest that was sent")
    if parsed.nonce != nonce:
        result.problems.append("the token's nonce is not the nonce that was sent")
    signature = verify_token_signature(parsed.token)
    result.signature_valid = signature.valid
    result.problems.extend(signature.problems)
    result.warnings.extend(signature.warnings)
    current = now or datetime.datetime.now(datetime.timezone.utc)
    if parsed.gen_time is not None:
        result.clock_skew_s = (parsed.gen_time - current).total_seconds()
        if abs(result.clock_skew_s) > max_skew_s:
            result.warnings.append(f"genTime is {result.clock_skew_s:.0f}s away from this host's clock")
    _certificates_summary(result, parsed.certificates, trust_anchors_pem)
    result.ok = not result.problems
    return result


class TimestampAuthorityRequired(RuntimeError):
    """A production gateway with a C2PA CA but no timestamp authority, or a TSA that fails a required probe."""


PROBE_MODES = ("off", "warn", "require")
