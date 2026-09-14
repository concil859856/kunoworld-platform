"""What create_app checks before a gateway serves anything.

* Storage keys (storage_keys.py): a production gateway refuses to start without a key management service
  (`KUNO_STORAGE_KEK_PROVIDER=aws-kms` or `vault-transit`) unless `KUNO_STORAGE_KEK_ALLOW_LOCAL=1`; every gateway checks
  its KEK still unwraps its canary.
* Timestamps: a production gateway with a C2PA CA refuses to start without `KUNO_C2PA_TSA_URL`, because a manifest
  without a trusted timestamp stops validating when its short-lived certificate expires. `KUNO_C2PA_TSA_PROBE=warn`
  sends one RFC 3161 request at start-up and logs a failure; `require` refuses to start on one.
* The C2PA issuance log: the old JSONL file is imported into the database (idempotent).
"""

from __future__ import annotations

import logging
from typing import Any

from . import c2pa_issuance, tsa
from .storage_keys import is_production, keyring_for
from .tsa import PROBE_MODES, TimestampAuthorityRequired

log = logging.getLogger("kuno.gateway.startup")


def check_timestamp_authority(settings: Any, ca: Any, production: bool) -> None:
    if ca is not None and production and not settings.c2pa_tsa_url:
        raise TimestampAuthorityRequired(
            "A production gateway with a C2PA CA needs KUNO_C2PA_TSA_URL: without an RFC 3161 timestamp every manifest "
            "stops validating when its certificate expires. Use a TSA on the C2PA TSA Trust List (C2PA_CA.md, \"Timestamps\")."
        )


def probe_timestamp_authority(settings: Any, *, client: Any | None = None) -> tsa.ProbeResult | None:
    mode = (getattr(settings, "c2pa_tsa_probe", None) or "off").strip().lower()
    if mode not in PROBE_MODES:
        raise ValueError(f"KUNO_C2PA_TSA_PROBE must be one of {', '.join(PROBE_MODES)}, not {mode!r}")
    if mode == "off" or not settings.c2pa_tsa_url:
        return None
    result = tsa.probe(settings.c2pa_tsa_url, client=client)
    if result.ok:
        log.info("timestamp authority %s answered: %s", settings.c2pa_tsa_url, result.status)
        for warning in result.warnings:
            log.warning("timestamp authority %s: %s", settings.c2pa_tsa_url, warning)
    elif mode == "require":
        raise TimestampAuthorityRequired(f"the timestamp authority failed its start-up probe: {'; '.join(result.problems)}")
    else:
        log.error("timestamp authority %s failed its start-up probe: %s", settings.c2pa_tsa_url, "; ".join(result.problems))
    return result


def run(app: Any, state: Any, settings: Any) -> dict:
    report: dict = {"storage_keys": keyring_for(state).check()}
    ca = getattr(app.state, "c2pa_ca", None)
    check_timestamp_authority(settings, ca, is_production(state))
    report["tsa_probe"] = probe_timestamp_authority(settings)
    if settings.c2pa_issuance_log.exists():
        report["c2pa_import"] = c2pa_issuance.import_jsonl(state, settings.c2pa_issuance_log)
    return report
