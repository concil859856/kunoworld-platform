"""C2PA certificates for attested enclaves, and the trust anchors to verify them with.

`POST /miner/v1/certificate` issues a short-lived signing certificate for the calling
enclave's attested Ed25519 key, only while the gateway's verification of that enclave's
attestation is fresh. `GET /v1/c2pa/trust` publishes the root (trust anchor) and the
issuing intermediate for the verify page, SDKs and validators.
"""

from __future__ import annotations

import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError

from kuno_protocol.attestation import AttestationEvidence
from kuno_protocol.c2pa_certs import EnclaveBinding
from kuno_protocol.canonical import b64d
from kuno_protocol.tiers import CONFIDENTIAL, tier_for_tee

from .auth import gw, require_enclave
from .ca import MAX_CSR_PEM_BYTES, CAUnavailable, CSRRejected, IssuingCA, check_csr

router = APIRouter(tags=["c2pa"])


class CertificateRequest(BaseModel):
    csr_pem: str = Field(max_length=MAX_CSR_PEM_BYTES)


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


def _ca(request: Request) -> IssuingCA:
    ca = getattr(request.app.state, "c2pa_ca", None)
    if ca is None:
        raise _error(503, "ca_unavailable", "This gateway does not issue C2PA certificates.")
    return ca


def _attested_binding(state, enclave) -> EnclaveBinding:
    not_attested = _error(403, "enclave_not_attested", "Attest the enclave again before requesting a certificate.")
    if enclave.status != "active" or not state.is_fresh(enclave):
        raise not_attested
    try:
        evidence = AttestationEvidence.model_validate_json(enclave.evidence)
        profiles = json.loads(enclave.profiles)
    except (ValidationError, ValueError):
        raise not_attested from None
    # The row is written from verified evidence; refuse anything that no longer lines up with it.
    if evidence.enclave_id != enclave.id or evidence.signing_public_key != enclave.signing_public_key:
        raise not_attested
    if tier_for_tee(evidence.tee) != CONFIDENTIAL:
        # The certificate asserts an attested enclave signed the video; an open-tier worker attests nothing.
        raise _error(403, "tier_not_eligible", "Open-tier enclaves are not issued C2PA certificates; run with KUNO_PROVENANCE=off.")
    return EnclaveBinding(enclave_id=enclave.id, evidence_digest=evidence.digest(), image_digest=enclave.image_digest, profiles=profiles)


@router.post("/miner/v1/certificate")
async def issue_certificate(request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, raw = auth
    ca = _ca(request)
    try:
        body = CertificateRequest.model_validate_json(raw)
    except ValidationError as exc:
        raise _error(422, "invalid_body", str(exc.errors()[:3])) from None
    binding = _attested_binding(state, enclave)
    signing_public_key = b64d(enclave.signing_public_key)
    try:
        check_csr(body.csr_pem, enclave.id, signing_public_key)
    except CSRRejected as exc:
        raise _error(422, exc.code, exc.message) from None
    try:
        issued = ca.issue(signing_public_key, binding)
        ca.record(issued, time.time())
    except CAUnavailable as exc:
        raise _error(503, "ca_unavailable", str(exc)) from None
    return {
        "certificate_chain_pem": issued.chain_pem,
        "serial": issued.serial_hex,
        "not_before": issued.not_before.timestamp(),
        "not_after": issued.not_after.timestamp(),
        # Without an RFC 3161 timestamp a manifest stops validating when this certificate expires.
        "tsa_url": ca.tsa_url,
    }


@router.get("/v1/c2pa/trust")
async def trust(request: Request):
    return _ca(request).trust()
