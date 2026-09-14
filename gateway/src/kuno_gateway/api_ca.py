"""C2PA certificates for attested enclaves, and the trust anchors to verify them with.

`POST /miner/v1/certificate` issues a short-lived signing certificate for the calling
enclave's attested Ed25519 key, only while the gateway's verification of that enclave's
attestation is fresh, and only within the issuance limits (c2pa_issuance.py). The issuance
is recorded in the database in the same transaction; a certificate not on the record is
never returned. `GET /v1/c2pa/trust` publishes the root (trust anchor) and the issuing
intermediate for the verify page, SDKs and validators. `GET /admin/v1/c2pa/issuances`
lists the issuance log for admins.
"""

from __future__ import annotations

import json
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from kuno_protocol.attestation import AttestationEvidence
from kuno_protocol.c2pa_certs import EnclaveBinding
from kuno_protocol.canonical import b64d
from kuno_protocol.tiers import CONFIDENTIAL, tier_for_tee

from . import c2pa_issuance, roles
from .auth import gw, require_enclave, require_operator
from .ca import MAX_CSR_PEM_BYTES, CAUnavailable, CSRRejected, IssuingCA, check_csr

log = logging.getLogger("kuno.gateway.ca")

router = APIRouter(tags=["c2pa"])
admin_router = APIRouter(prefix="/admin/v1/c2pa", tags=["admin"], dependencies=[Depends(require_operator(roles.ADMIN))])


class CertificateRequest(BaseModel):
    csr_pem: str = Field(max_length=MAX_CSR_PEM_BYTES)


def _error(status: int, code: str, message: str, headers: dict | None = None) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message}, headers=headers)


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
    now = time.time()
    try:
        with state.session() as s, s.begin():
            if state.postgres:
                # One issuance at a time across gateway processes, so the limits can't be raced past.
                s.execute(text("select pg_advisory_xact_lock(hashtext('kuno:c2pa-issuance'))"))
            c2pa_issuance.check_rate(s, state.settings, enclave.id, now)
            issued = ca.issue(signing_public_key, binding)
            ca.record(s, issued, now)
    except c2pa_issuance.RateLimited as exc:
        log.warning("C2PA issuance refused for enclave %s: %s limit of %d per %ds", enclave.id, exc.scope, exc.limit, exc.window_s)
        raise _error(
            429, "rate_limited",
            f"Too many certificates requested ({exc.scope} limit: {exc.limit} per {exc.window_s}s). Retry after {exc.retry_after_s}s.",
            headers={"Retry-After": str(exc.retry_after_s)},
        ) from None
    except CAUnavailable as exc:
        raise _error(503, "ca_unavailable", str(exc)) from None
    except SQLAlchemyError:
        # A certificate that is not on the record is never handed out.
        log.exception("could not record a C2PA issuance")
        raise _error(503, "ca_unavailable", "the issuance log is not writable") from None
    return {
        "certificate_chain_pem": issued.chain_pem,
        "serial": issued.serial_hex,
        "not_before": issued.not_before.timestamp(),
        "not_after": issued.not_after.timestamp(),
        # Without an RFC 3161 timestamp a manifest stops validating when this certificate expires. `tsa_urls` lists every
        # TSA in order of preference, and workers fail over down it; `tsa_url` is its first, for workers that read one.
        "tsa_url": ca.tsa_url,
        "tsa_urls": list(getattr(ca, "tsa_urls", None) or ([ca.tsa_url] if ca.tsa_url else [])),
    }


@router.get("/v1/c2pa/trust")
async def trust(request: Request):
    return _ca(request).trust()


@admin_router.get("/issuances")
async def list_issuances(
    request: Request, enclave_id: str | None = None, since: float | None = None, until: float | None = None,
    before: float | None = None, limit: int = 100,
):
    """The issuance log, newest first, with the limits and how much of the current window is used. Page with
    `before` = the previous page's `next_before`."""
    state = gw(request)
    limit = min(max(limit, 1), 500)
    now = time.time()
    with state.session() as s:
        items = c2pa_issuance.list_issuances(s, enclave_id=enclave_id, since=since, until=until, before=before, limit=limit)
        usage = c2pa_issuance.usage(s, state.settings, now, enclave_id)
    return {
        "issuances": items,
        "next_before": items[-1]["issued_at"] if len(items) == limit else None,
        "limits": usage,
        "ca_configured": getattr(request.app.state, "c2pa_ca", None) is not None,
    }
