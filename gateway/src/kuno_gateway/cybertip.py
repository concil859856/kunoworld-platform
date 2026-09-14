"""CyberTipline reports (MODERATION.md, "CyberTipline reports").

NCMEC's CyberTipline Reporting API, the "ESP reporting web service", as documented at
https://report.cybertip.org/ispws/documentation/ (the same page is at https://exttest.cybertip.org/ispws/documentation/;
"Last updated 2026-08-26" when read on 2026-09-14):

* **Environments:** production `https://report.cybertip.org/ispws`, testing `https://exttest.cybertip.org/ispws`. "A
  username and password must be requested from and supplied by NCMEC." Authentication is HTTP Basic.
* **Calls:** `POST /submit` opens a report with one `<report>` XML document (`text/xml; charset=utf-8`). `POST /upload`
  adds a file (form fields `id`, `file`), and `POST /fileinfo` describes it with a `<fileDetails>` document, once per
  file. `POST /finish` (form field `id`) completes the report. `POST /retract` (form field `id`) cancels a report that
  isn't finished.
* **Unfinished reports:** NCMEC deletes a report that isn't finished 24 hours after it was opened, or 1 hour after its
  last change, whichever is later.
* **Answers:** `<reportResponse>` (`responseCode`, `responseDescription`, `reportId`, `fileId`, `hash`), or
  `<reportDoneResponse>` from `/finish`. Response code 0 is success.

**Not verified.** NCMEC's XSD (`/ispws/xsd`) needs credentials. That leaves unconfirmed: element order and cardinality
beyond the documentation's appendices, full enumerations, allowed `hashType` values, IP allowlisting and rate limits.
Everything that depends on them is in the XML builders, the `validate_*` functions and `HttpCyberTiplineApi`, so a
verified schema changes only those.

**Workflow.** Nothing is sent by itself:

1. A moderator prepares a draft from a moderation item under a child-safety hold.
2. An admin reviews and confirms it.
3. Only then does the gateway submit, in `KUNO_CYBERTIP_ENV`. The default, `disabled`, is a dry run that validates and
   stores the XML.

Every step is written to the audit log. A retried submission resumes from the last step NCMEC acknowledged. Nothing
here logs file contents, and a private video is attached only when a key to it exists.
"""

from __future__ import annotations

import hashlib
import json
import logging
import mimetypes
import re
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Protocol

import httpx
from kuno_protocol.canonical import sha256_hex
from kuno_protocol.crypto import DecryptionError
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import holds, moderation, standard_jobs
from .db import Account, Job, User
from .db_cybertip import CybertipReport, CybertipReportFile
from .db_holds import PreservationHold
from .db_moderation import ModerationItem, OperatorAction, Report, StandardJob
from .vault import vault

if TYPE_CHECKING:
    from .state import GatewayState

log = logging.getLogger("kuno.cybertip")

DISABLED, TEST, PRODUCTION = "disabled", "test", "production"
ENVIRONMENTS = (DISABLED, TEST, PRODUCTION)
BASE_URLS = {TEST: "https://exttest.cybertip.org/ispws", PRODUCTION: "https://report.cybertip.org/ispws"}
XSD_LOCATION = "https://report.cybertip.org/ispws/xsd"
XSI = "http://www.w3.org/2001/XMLSchema-instance"

# Documentation, Appendix B, <incidentType>.
INCIDENT_TYPES = (
    "Child Pornography (possession, manufacture, and distribution)",
    "Child Sex Trafficking",
    "Child Sex Tourism",
    "Child Sexual Molestation",
    "Misleading Domain Name",
    "Misleading Words or Digital Images on the Internet",
    "Online Enticement of Children for Sexual Acts",
    "Unsolicited Obscene Material Sent to a Child",
)
DEFAULT_INCIDENT_TYPE = INCIDENT_TYPES[0]
# Appendix C, <industryClassification>. Set by a moderator, never guessed.
INDUSTRY_CLASSIFICATIONS = ("A1", "A2", "B1", "B2")

# Holds a report can be prepared under. A match hold counts only when its list's category is a child-safety one.
REPORT_HOLD_REASONS = ("report_csam", "report_sexual_minor")
MATCH_HOLD_REASONS = ("upload_match", "output_match")
CHILD_SAFETY_CATEGORIES = ("csam", "sexual_minor")
VIEW_ACTIONS = ("item.view_video", "item.view_upload")

DRAFT, DRY_RUN, SUBMITTING, SUBMITTED, FAILED, CANCELED = "draft", "dry_run", "submitting", "submitted", "failed", "canceled"
STATUSES = (DRAFT, DRY_RUN, SUBMITTING, SUBMITTED, FAILED, CANCELED)
SUBMITTABLE = (DRAFT, DRY_RUN, FAILED)
# A submission that stops without finishing (the process died) can be resumed once its lease ends.
LEASE_S = 900.0
DAY = 86400

# NCMEC response codes (Appendix D) a later attempt may get past, and the ones the workflow handles by name.
RETRYABLE_CODES = frozenset({1000, 1100, 1110, 1111, 1300})
REPORT_DOES_NOT_EXIST, REPORT_ALREADY_RETRACTED, REPORT_ALREADY_FINISHED = 5001, 5101, 5102

_PLACEHOLDER = re.compile(r"\[[^\]]+\]")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$")
_URL = re.compile(r"^https?://[^\s]+$")


class CybertipError(Exception):
    def __init__(self, status: int, code: str, message: str, **extra):
        super().__init__(message)
        self.status, self.code, self.message, self.extra = status, code, message, extra


class ContentUnavailable(Exception):
    """A file a report names can't be read any more (its hold ended, its key is gone, or it fails its digest)."""


# ------------------------------------------------------------------ configuration


def environment(settings) -> str:
    env = (getattr(settings, "cybertip_env", None) or DISABLED).strip().lower()
    if env not in ENVIRONMENTS:
        raise CybertipError(503, "cybertip_misconfigured", f"KUNO_CYBERTIP_ENV must be one of: {', '.join(ENVIRONMENTS)}.")
    return env


def base_url(settings, env: str) -> str | None:
    # An override is honoured only for the test environment, so production always talks to NCMEC's own host.
    if env == TEST and getattr(settings, "cybertip_base_url", None):
        return settings.cybertip_base_url.rstrip("/")
    return BASE_URLS.get(env)


def reporter(settings) -> dict:
    """The reporting person and entity, from settings. The defaults are placeholders a production submission refuses."""
    return {
        "reporting_entity": settings.cybertip_reporting_entity,
        "first_name": settings.cybertip_reporter_first_name,
        "last_name": settings.cybertip_reporter_last_name,
        "email": settings.cybertip_reporter_email,
        "phone": settings.cybertip_reporter_phone,
        "legal_url": settings.cybertip_legal_url,
    }


def reporter_placeholders(values: dict) -> list[str]:
    missing = [k for k in ("reporting_entity", "first_name", "last_name", "email") if not values.get(k)]
    return missing + [k for k, v in values.items() if isinstance(v, str) and _PLACEHOLDER.search(v)]


def credentials_configured(settings) -> bool:
    return bool(getattr(settings, "cybertip_username", None) and getattr(settings, "cybertip_password", None))


def config_json(settings) -> dict:
    """What the console shows. Never the credentials."""
    env = environment(settings)
    values = reporter(settings)
    return {
        "environment": env,
        "submissions_enabled": env != DISABLED,
        "base_url": base_url(settings, env),
        "credentials_configured": credentials_configured(settings),
        "reporter": values,
        "reporter_placeholders": reporter_placeholders(values),
        "incident_types": list(INCIDENT_TYPES),
        "industry_classifications": list(INDUSTRY_CLASSIFICATIONS),
    }


# ------------------------------------------------------------------ NCMEC's API (adapter)


@dataclass(frozen=True)
class NcmecResponse:
    code: int
    description: str
    report_id: str | None = None
    file_id: str | None = None
    md5: str | None = None
    request_id: str | None = None


class NcmecError(Exception):
    """NCMEC answered with a non-zero response code, or couldn't be reached (`code` None)."""

    def __init__(self, code: int | None, description: str, *, http_status: int | None = None, request_id: str | None = None):
        super().__init__(description)
        self.code, self.description, self.http_status, self.request_id = code, description, http_status, request_id

    @property
    def retryable(self) -> bool:
        return self.code is None or self.code in RETRYABLE_CODES

    @property
    def error_code(self) -> str:
        return "network" if self.code is None else f"ncmec_{self.code}"


def parse_response(http_status: int, body: bytes, request_id: str | None = None) -> NcmecResponse:
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        raise NcmecError(None, f"NCMEC's answer wasn't XML (HTTP {http_status})", http_status=http_status, request_id=request_id) from None

    def text(path: str) -> str | None:
        found = root.find(path)
        return found.text.strip() if found is not None and found.text and found.text.strip() else None

    try:
        code = int(text("responseCode") or "")
    except ValueError:
        raise NcmecError(None, f"NCMEC's answer had no response code (HTTP {http_status})", http_status=http_status,
                         request_id=request_id) from None
    description = text("responseDescription") or ""
    if code != 0:
        raise NcmecError(code, description or "error", http_status=http_status, request_id=request_id)
    if http_status >= 400:
        raise NcmecError(None, f"HTTP {http_status}", http_status=http_status, request_id=request_id)
    return NcmecResponse(
        code=code, description=description, report_id=text("reportId"), file_id=text("fileId") or text("files/fileId"),
        md5=text("hash"), request_id=request_id,
    )


class CyberTiplineApi(Protocol):
    def submit(self, report_xml: bytes) -> NcmecResponse: ...

    def upload(self, report_id: str, file_name: str, data: bytes, mime: str) -> NcmecResponse: ...

    def file_info(self, details_xml: bytes) -> NcmecResponse: ...

    def finish(self, report_id: str) -> NcmecResponse: ...

    def retract(self, report_id: str) -> NcmecResponse: ...


class HttpCyberTiplineApi:
    """The documented HTTPS calls. The form calls are sent as multipart/form-data, as the documentation's curl examples do."""

    XML = {"content-type": "text/xml; charset=utf-8"}

    def __init__(self, base: str, username: str, password: str, timeout_s: float = 60.0, transport: httpx.BaseTransport | None = None):
        self._base = base.rstrip("/")
        self._auth = httpx.BasicAuth(username, password)
        self._timeout = timeout_s
        self._transport = transport

    def _post(self, path: str, **kwargs) -> NcmecResponse:
        try:
            with httpx.Client(auth=self._auth, timeout=self._timeout, transport=self._transport) as client:
                response = client.post(f"{self._base}{path}", **kwargs)
        except httpx.HTTPError as exc:
            raise NcmecError(None, f"NCMEC couldn't be reached ({type(exc).__name__})") from None
        request_id = response.headers.get("request-id")
        if response.status_code == 401:
            raise NcmecError(None, "NCMEC refused the credentials (HTTP 401)", http_status=401, request_id=request_id)
        return parse_response(response.status_code, response.content, request_id)

    def submit(self, report_xml: bytes) -> NcmecResponse:
        return self._post("/submit", content=report_xml, headers=self.XML)

    def upload(self, report_id: str, file_name: str, data: bytes, mime: str) -> NcmecResponse:
        return self._post("/upload", files={"id": (None, report_id), "file": (file_name, data, mime)})

    def file_info(self, details_xml: bytes) -> NcmecResponse:
        return self._post("/fileinfo", content=details_xml, headers=self.XML)

    def finish(self, report_id: str) -> NcmecResponse:
        return self._post("/finish", files={"id": (None, report_id)})

    def retract(self, report_id: str) -> NcmecResponse:
        return self._post("/retract", files={"id": (None, report_id)})


def api_for(settings, env: str) -> CyberTiplineApi:
    return HttpCyberTiplineApi(
        base_url(settings, env), settings.cybertip_username, settings.cybertip_password,
        float(getattr(settings, "cybertip_timeout_s", 60.0)),
    )


# ------------------------------------------------------------------ XML


def iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _el(parent: ET.Element, tag: str, text: str | None = None, **attrs: str) -> ET.Element:
    element = ET.SubElement(parent, tag, attrs)
    if text is not None:
        element.text = str(text)
    return element


def _document(root: ET.Element) -> bytes:
    return b'<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode").encode()


def _root(tag: str) -> ET.Element:
    return ET.Element(tag, {"xmlns:xsi": XSI, "xsi:noNamespaceSchemaLocation": XSD_LOCATION})


def build_report_xml(draft: dict, reporter_values: dict) -> bytes:
    """The `<report>` document (Appendix B), in documented element order."""
    root = _root("report")
    summary = _el(root, "incidentSummary")
    incident = draft["incident"]
    _el(summary, "incidentType", incident["type"])
    _el(summary, "incidentDateTime", incident["date_time"])
    if incident.get("date_time_description"):
        _el(summary, "incidentDateTimeDescription", incident["date_time_description"])

    who = _el(root, "reporter")
    person = _el(who, "reportingPerson")
    _el(person, "firstName", reporter_values.get("first_name") or "")
    _el(person, "lastName", reporter_values.get("last_name") or "")
    if reporter_values.get("phone"):
        _el(person, "phone", reporter_values["phone"])
    _el(person, "email", reporter_values.get("email") or "")
    if reporter_values.get("legal_url"):
        _el(who, "legalURL", reporter_values["legal_url"])

    reported = draft.get("reported") or {}
    if reported.get("esp_identifier") or reported.get("email"):
        user = _el(root, "personOrUserReported")
        if reported.get("email"):
            _el(_el(user, "personOrUserReportedPerson"), "email", reported["email"])
        if reported.get("esp_identifier"):
            _el(user, "espIdentifier", reported["esp_identifier"])
        if reported.get("esp_service"):
            _el(user, "espService", reported["esp_service"])

    info = [f"Reporting entity: {reporter_values.get('reporting_entity') or ''}."]
    info += draft.get("summary") or []
    if draft.get("additional_info"):
        info.append(f"Moderator note: {draft['additional_info']}")
    _el(root, "additionalInfo", "\n".join(info))
    return _document(root)


def build_file_details_xml(
    *, report_id: str, file_id: str, file: dict, viewed_by_esp: bool, md5: str, industry_classification: str | None,
) -> bytes:
    """The `<fileDetails>` document (Appendix C) for one uploaded file."""
    root = _root("fileDetails")
    _el(root, "reportId", report_id)
    _el(root, "fileId", file_id)
    _el(root, "originalFileName", file["file_name"])
    if file.get("uploaded_at"):
        _el(root, "uploadedToEspTimestamp", iso(file["uploaded_at"]))
    _el(root, "fileViewedByEsp", "true" if viewed_by_esp else "false")
    _el(root, "exifViewedByEsp", "false")
    # Standard videos and uploads are never public on KunoWorld.
    _el(root, "publiclyAvailable", "false")
    _el(root, "fileRelevance", "Reported")
    if file.get("generative_ai"):
        _el(_el(root, "fileAnnotations"), "generativeAi")
    if industry_classification:
        _el(root, "industryClassification", industry_classification)
    _el(root, "originalFileHash", md5, hashType="MD5")
    lines = [f"SHA-256: {file['sha256']}."]
    if file.get("match"):
        lines.append(file["match"])
    _el(root, "additionalInfo", " ".join(lines))
    return _document(root)


REPORT_ORDER = ("batchedReport", "incidentSummary", "internetDetails", "lawEnforcement", "reporter", "personOrUserReported",
                "intendedRecipient", "victim", "additionalInfo")
SUMMARY_ORDER = ("incidentType", "platform", "escalateToHighPriority", "reportAnnotations", "incidentDateTime",
                 "incidentDateTimeDescription")
REPORTER_ORDER = ("reportingPerson", "contactPerson", "companyTemplate", "termsOfService", "legalURL")
PERSON_ORDER = ("firstName", "lastName", "phone", "email", "address", "age", "ageAssertionDiscrepancy", "dateOfBirth")
REPORTED_ORDER = ("personOrUserReportedPerson", "vehicleDescription", "espIdentifier", "espService", "compromisedAccount",
                  "screenName", "displayName", "profileUrl", "profileBio", "ipCaptureEvent", "deviceId",
                  "thirdPartyUserReported", "priorCTReports", "groupIdentifier", "accountTemporarilyDisabled",
                  "accountPermanentlyDisabled", "estimatedLocation", "allEmailsReported", "associatedAccount", "additionalInfo")
FILE_DETAILS_ORDER = ("reportId", "fileId", "originalFileName", "uploadedToEspTimestamp", "locationOfFile", "fileViewedByEsp",
                      "exifViewedByEsp", "publiclyAvailable", "fileRelevance", "fileAnnotations", "industryClassification",
                      "originalFileHash", "ipCaptureEvent", "deviceId", "details", "additionalInfo")
FILE_ANNOTATIONS = ("animeDrawingVirtualHentai", "potentialMeme", "viral", "possibleSelfProduction", "physicalHarm",
                    "violenceGore", "bestiality", "liveStreaming", "infant", "generativeAi")


def _order(element: ET.Element, order: tuple[str, ...], where: str, errors: list[str], required: tuple[str, ...] = ()) -> None:
    positions = []
    for child in element:
        if child.tag not in order:
            errors.append(f"{where}: unexpected element <{child.tag}>")
        else:
            positions.append(order.index(child.tag))
    if positions != sorted(positions):
        errors.append(f"{where}: elements are out of the documented order")
    present = {child.tag for child in element}
    errors.extend(f"{where}: <{tag}> is required" for tag in required if tag not in present)


def _text(element: ET.Element | None) -> str:
    return (element.text or "").strip() if element is not None else ""


def _parse(xml: bytes, root_tag: str, errors: list[str]) -> ET.Element | None:
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as exc:
        errors.append(f"not well-formed XML: {exc}")
        return None
    if root.tag != root_tag:
        errors.append(f"the root element must be <{root_tag}>")
        return None
    if root.get(f"{{{XSI}}}noNamespaceSchemaLocation") != XSD_LOCATION:
        errors.append(f"<{root_tag}> must name the schema {XSD_LOCATION}")
    return root


def validate_report_xml(xml: bytes, *, production: bool, now: float | None = None) -> list[str]:
    """Checks a `<report>` against the documented structure (not NCMEC's XSD, which needs credentials)."""
    errors: list[str] = []
    root = _parse(xml, "report", errors)
    if root is None:
        return errors
    _order(root, REPORT_ORDER, "report", errors, required=("incidentSummary", "reporter"))
    summary = root.find("incidentSummary")
    if summary is not None:
        _order(summary, SUMMARY_ORDER, "incidentSummary", errors, required=("incidentType", "incidentDateTime"))
        if _text(summary.find("incidentType")) not in INCIDENT_TYPES:
            errors.append("incidentSummary: <incidentType> is not a documented incident type")
        stamp = _text(summary.find("incidentDateTime"))
        if not _TIMESTAMP.match(stamp):
            errors.append("incidentSummary: <incidentDateTime> must be ISO 8601 with a time zone")
        else:
            when = datetime.fromisoformat(stamp.replace("Z", "+00:00")).timestamp()
            if when > (time.time() if now is None else now):
                errors.append("incidentSummary: <incidentDateTime> must be in the past")
    who = root.find("reporter")
    if who is not None:
        _order(who, REPORTER_ORDER, "reporter", errors, required=("reportingPerson",))
        person = who.find("reportingPerson")
        if person is not None:
            _order(person, PERSON_ORDER, "reportingPerson", errors, required=("email",))
            for tag in ("firstName", "lastName"):
                if not _text(person.find(tag)):
                    errors.append(f"reportingPerson: <{tag}> is empty")
            email = _text(person.find("email"))
            # A placeholder passes outside production (dry runs, NCMEC's test environment); production refuses it below.
            if not _EMAIL.match(email) and (production or not _PLACEHOLDER.fullmatch(email)):
                errors.append("reportingPerson: <email> is not an email address")
        legal = who.find("legalURL")
        if legal is not None and (not _URL.match(_text(legal)) or len(_text(legal)) > 2083):
            errors.append("reporter: <legalURL> must be a URL of at most 2083 characters")
        if production and any(_PLACEHOLDER.search(t) for t in who.itertext()):
            errors.append("reporter: placeholders like [POINT OF CONTACT] must be replaced before a production submission")
    user = root.find("personOrUserReported")
    if user is not None:
        _order(user, REPORTED_ORDER, "personOrUserReported", errors)
        if len(_text(user.find("espIdentifier"))) > 255:
            errors.append("personOrUserReported: <espIdentifier> is longer than 255 characters")
    if production and _PLACEHOLDER.search(_text(root.find("additionalInfo")).split("\n", 1)[0]):
        errors.append("additionalInfo: the reporting entity is still a placeholder")
    return errors


def validate_file_details_xml(xml: bytes) -> list[str]:
    errors: list[str] = []
    root = _parse(xml, "fileDetails", errors)
    if root is None:
        return errors
    _order(root, FILE_DETAILS_ORDER, "fileDetails", errors, required=("reportId", "fileId"))
    for tag in ("reportId", "fileId"):
        if root.find(tag) is not None and not _text(root.find(tag)):
            errors.append(f"fileDetails: <{tag}> is empty")
    for tag in ("fileViewedByEsp", "exifViewedByEsp", "publiclyAvailable"):
        if root.find(tag) is not None and _text(root.find(tag)) not in ("true", "false"):
            errors.append(f"fileDetails: <{tag}> must be true or false")
    if _text(root.find("exifViewedByEsp")) == "true" and _text(root.find("fileViewedByEsp")) != "true":
        errors.append("fileDetails: <fileViewedByEsp> must be true when <exifViewedByEsp> is true")
    if root.find("fileRelevance") is not None and _text(root.find("fileRelevance")) not in ("Reported", "Supplemental Reported"):
        errors.append("fileDetails: <fileRelevance> must be Reported or Supplemental Reported")
    classification = root.find("industryClassification")
    if classification is not None and _text(classification) not in INDUSTRY_CLASSIFICATIONS:
        errors.append("fileDetails: <industryClassification> must be A1, A2, B1 or B2")
    annotations = root.find("fileAnnotations")
    if annotations is not None:
        errors.extend(f"fileAnnotations: unexpected <{a.tag}>" for a in annotations if a.tag not in FILE_ANNOTATIONS)
    if len(_text(root.find("originalFileName"))) > 2056:
        errors.append("fileDetails: <originalFileName> is longer than 2056 characters")
    for digest in root.findall("originalFileHash"):
        if not digest.get("hashType") or len(digest.get("hashType", "")) > 64 or not _text(digest):
            errors.append("fileDetails: <originalFileHash> needs a hashType and a value")
    return errors


# ------------------------------------------------------------------ eligibility and drafts


def _detail(item: ModerationItem | None) -> dict:
    return json.loads(item.detail) if item is not None and item.detail else {}


def match_item_for_hold(s: Session, hold: PreservationHold) -> ModerationItem | None:
    """The upload_match or output_match item a system hold was placed with."""
    query = select(ModerationItem).where(ModerationItem.kind == ("upload_match" if hold.upload_id else "output_match"))
    query = query.where(ModerationItem.job_id == hold.job_id) if hold.job_id else query.where(ModerationItem.account_id == hold.account_id)
    return next((item for item in s.scalars(query).all() if _detail(item).get("hold_id") == hold.id), None)


def child_safety_hold(s: Session, item: ModerationItem, now: float) -> PreservationHold | None:
    """The newest active hold that lets a CyberTipline report be prepared for this item, or None.

    A `report_csam` or `report_sexual_minor` hold, or an `upload_match` / `output_match` hold whose list category is
    `csam` or `sexual_minor`. A legal-request or operator hold is not enough on its own.
    """
    detail = _detail(item)
    if item.job_id:
        candidates = holds.active_holds(s, now, job_id=item.job_id)
    elif detail.get("upload_id"):
        candidates = holds.active_holds(s, now, upload_id=detail["upload_id"])
    else:
        candidates = []
    for hold in reversed(candidates):
        if hold.reason in REPORT_HOLD_REASONS:
            return hold
        if hold.reason in MATCH_HOLD_REASONS:
            source = item if detail.get("hold_id") == hold.id else match_item_for_hold(s, hold)
            if _detail(source).get("category") in CHILD_SAFETY_CATEGORIES:
                return hold
    return None


def _match_sentence(detail: dict) -> str | None:
    if not detail.get("list"):
        return None
    category = f" (category {detail['category']})" if detail.get("category") else ""
    if detail.get("match_kind") == "perceptual":
        where = f", at about {detail['frame_time_s']:.0f} s into the video" if detail.get("frame_time_s") is not None else ""
        return (f"Identified by a PDQ perceptual hash match at Hamming distance {detail.get('distance')} (threshold "
                f"{detail.get('threshold')}) against the hash list '{detail['list']}'{category}{where}.")
    return f"Identified by an exact SHA-256 match against the hash list '{detail['list']}'{category}."


def _file_name(prefix: str, ident: str, mime: str) -> str:
    return f"{prefix}-{ident}{mimetypes.guess_extension(mime) or '.bin'}"


def _files_for(state: GatewayState, s: Session, item: ModerationItem, job: Job | None, report: Report | None, now: float) -> list[dict]:
    """What the gateway can attach: where each file is kept and its digests. Nothing is decrypted here."""
    detail = _detail(item)
    if item.kind == "upload_match":
        hold = holds.item_upload_hold(s, item, detail, now)
        if hold is None or not detail.get("sha256"):
            return []
        mime = detail.get("mime") or "application/octet-stream"
        return [{"source": "held_upload", "hold_id": hold.id, "upload_id": hold.upload_id, "job_id": None,
                 "sha256": detail["sha256"], "size": detail.get("size"), "mime": mime,
                 "file_name": _file_name("upload", hold.upload_id, mime), "uploaded_at": item.created_at,
                 "generative_ai": False, "match": _match_sentence(detail)}]
    if job is None:
        return []
    if job.privacy == standard_jobs.STANDARD:
        blocked = holds.output_hold(s, job.id, now)
        if blocked is not None:
            source = item if _detail(item).get("hold_id") == blocked.id else match_item_for_hold(s, blocked)
            match = _detail(source)
            return [{"source": "held_output", "hold_id": blocked.id, "job_id": job.id, "upload_id": None,
                     "sha256": match.get("sha256") or job.content_digest, "size": match.get("size"), "mime": "video/mp4",
                     "file_name": _file_name("video", job.id, "video/mp4"),
                     "uploaded_at": source.created_at if source is not None else job.finished_at,
                     "generative_ai": True, "match": _match_sentence(match)}]
        row = s.get(StandardJob, job.id)
        if row is not None and row.video_blob_id and row.video_sha256:
            return [{"source": "standard_video", "hold_id": None, "job_id": job.id, "upload_id": None, "sha256": row.video_sha256,
                     "size": row.video_bytes, "mime": "video/mp4", "file_name": _file_name("video", job.id, "video/mp4"),
                     "uploaded_at": job.finished_at, "generative_ai": True, "match": None}]
        return []
    # Private: only with a key a csam/sexual_minor report supplied, or one a hold kept. Never without it.
    has_key = bool(report is not None and report.output_key) or any(h.output_key for h in holds.active_holds(s, now, job_id=job.id))
    if has_key and job.output_blob_id and job.content_digest:
        return [{"source": "private_video", "hold_id": None, "job_id": job.id, "upload_id": None, "sha256": job.content_digest,
                 "size": None, "mime": "video/mp4", "file_name": _file_name("video", job.id, "video/mp4"),
                 "uploaded_at": job.finished_at, "generative_ai": True, "match": None}]
    return []


def prepare(
    state: GatewayState, s: Session, *, item_id: str, by: str, now: float, incident_type: str | None = None,
    industry_classification: str | None = None, additional_info: str | None = None,
) -> CybertipReport:
    """A moderator's draft, from the item's metadata. Nothing is sent and no content is opened."""
    item = s.get(ModerationItem, item_id)
    if item is None:
        raise CybertipError(404, "not_found", "No such moderation item.")
    hold = child_safety_hold(s, item, now)
    if hold is None:
        raise CybertipError(409, "not_under_child_safety_hold",
                            "A CyberTipline report can be prepared only for an item under an active child-safety hold.")
    existing = s.scalars(
        select(CybertipReport).where(CybertipReport.item_id == item_id, CybertipReport.status != CANCELED)
    ).first()
    if existing is not None:
        raise CybertipError(409, "report_exists", "This item already has a CyberTipline report.", report_id=existing.id)
    incident_type = incident_type or DEFAULT_INCIDENT_TYPE
    if incident_type not in INCIDENT_TYPES:
        raise CybertipError(422, "invalid_incident_type", "Choose one of NCMEC's incident types.")
    if industry_classification is not None and industry_classification not in INDUSTRY_CLASSIFICATIONS:
        raise CybertipError(422, "invalid_classification", "Industry classification must be A1, A2, B1 or B2.")

    detail = _detail(item)
    job = s.get(Job, item.job_id) if item.job_id else None
    report = s.get(Report, item.report_id) if item.report_id else None
    account_id = item.account_id or (job.account_id if job else None) or hold.account_id
    account = s.get(Account, account_id) if account_id else None
    user = s.get(User, account.owner_user_id) if account is not None and account.owner_user_id else None
    files = _files_for(state, s, item, job, report, now)

    summary: list[str] = []
    if item.kind == "upload_match":
        when, when_text = item.created_at, "When the file was uploaded to the service and refused."
        summary.append("The user uploaded this file as an input for video generation. It was refused on upload and "
                       "never used in a video or shared.")
    elif item.kind == "output_match":
        when, when_text = item.created_at, "When the service generated the video and refused to deliver it."
        summary.append("The service's AI video model generated this video at the user's request. It was refused before "
                       "delivery and never shared.")
    elif job is not None:
        when, when_text = job.finished_at or job.created_at, "When the service generated the reported video."
    else:
        when, when_text = item.created_at, "When the report was received."
    sentence = _match_sentence(detail)
    if sentence:
        summary.append(sentence)
    if report is not None:
        summary.append(f"A {report.reason} report about this content was received at {iso(report.created_at)}.")
    if job is not None and job.privacy != standard_jobs.STANDARD and not files:
        summary.append("The content is end-to-end encrypted and no key to it was supplied, so it is not attached.")
    draft = {
        "incident": {"type": incident_type, "date_time": iso(when), "date_time_description": when_text},
        "reported": {
            "esp_identifier": account_id, "email": user.email if user is not None else None,
            "esp_service": ("KunoWorld video generation, Standard mode" if job is None or job.privacy == standard_jobs.STANDARD
                            else "KunoWorld video generation, Private mode"),
        },
        "summary": summary,
        "additional_info": additional_info or None,
        "industry_classification": industry_classification,
        "context": {
            "item_id": item.id, "item_kind": item.kind, "hold_id": hold.id, "hold_reason": hold.reason,
            "report_id": item.report_id, "report_reason": report.reason if report is not None else None,
            "job_id": item.job_id, "upload_id": detail.get("upload_id") if item.job_id is None else None,
            "privacy": job.privacy if job is not None else "standard", "content_digest": job.content_digest if job else detail.get("sha256"),
        },
    }
    row = CybertipReport(
        id=moderation.new_id(), status=DRAFT, item_id=item.id, hold_id=hold.id, job_id=item.job_id,
        upload_id=draft["context"]["upload_id"], account_id=account_id, incident_type=incident_type,
        draft=json.dumps(draft, separators=(",", ":")), attempts=0, created_by=by, created_at=now, updated_at=now,
    )
    s.add(row)
    for position, f in enumerate(files):
        s.add(CybertipReportFile(
            id=moderation.new_id(), report_id=row.id, position=position, source=f["source"], hold_id=f["hold_id"],
            job_id=f["job_id"], upload_id=f["upload_id"], sha256=f["sha256"], size=f["size"], mime=f["mime"],
            file_name=f["file_name"],
        ))
    s.flush()
    moderation.log_action(
        s, by, "cybertip.prepare", "cybertip_report", row.id, None,
        {"item_id": item.id, "hold_id": hold.id, "files": len(files), "incident_type": incident_type}, now,
    )
    return row


# ------------------------------------------------------------------ reading


def _files(s: Session, report_id: str) -> list[CybertipReportFile]:
    return list(s.scalars(select(CybertipReportFile).where(CybertipReportFile.report_id == report_id)
                          .order_by(CybertipReportFile.position)).all())


def viewed_by_esp(s: Session, report: CybertipReport) -> bool:
    """Whether an operator opened this content through the console (the audit log's content views)."""
    item_ids = {report.item_id}
    if report.job_id:
        item_ids.update(s.scalars(select(ModerationItem.id).where(ModerationItem.job_id == report.job_id)).all())
    return s.scalars(
        select(OperatorAction.id).where(OperatorAction.target_id.in_(sorted(item_ids)), OperatorAction.action.in_(VIEW_ACTIONS)).limit(1)
    ).first() is not None


def report_json(s: Session, report: CybertipReport, settings, *, include_xml: bool = True) -> dict:
    draft = json.loads(report.draft)
    return {
        "report_id": report.id,
        "status": report.status,
        "item_id": report.item_id,
        "hold_id": report.hold_id,
        "job_id": report.job_id,
        "upload_id": report.upload_id,
        "account_id": report.account_id,
        "incident_type": report.incident_type,
        "draft": {k: v for k, v in draft.items() if not k.startswith("_")},
        "reporter": reporter(settings),
        "files": [
            {"file_id": f.id, "position": f.position, "source": f.source, "sha256": f.sha256, "md5": f.md5, "size": f.size,
             "mime": f.mime, "file_name": f.file_name, "ncmec_file_id": f.ncmec_file_id, "uploaded_at": f.uploaded_at,
             "details_sent_at": f.details_sent_at}
            for f in _files(s, report.id)
        ],
        "viewed_by_esp": viewed_by_esp(s, report),
        "report_xml": report.report_xml if include_xml else None,
        "validated_at": report.validated_at,
        "environment": report.environment,
        "ncmec_report_id": report.ncmec_report_id,
        "attempts": report.attempts,
        "last_error_code": report.last_error_code,
        "last_error": report.last_error,
        "created_by": report.created_by,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "confirmed_by": report.confirmed_by,
        "confirmed_at": report.confirmed_at,
        "submitted_at": report.submitted_at,
        "canceled_by": report.canceled_by,
        "canceled_at": report.canceled_at,
        "cancel_note": report.cancel_note,
    }


def item_json(s: Session, item_id: str, settings, now: float) -> dict:
    item = s.get(ModerationItem, item_id)
    if item is None:
        raise CybertipError(404, "not_found", "No such moderation item.")
    hold = child_safety_hold(s, item, now)
    reports = s.scalars(select(CybertipReport).where(CybertipReport.item_id == item_id).order_by(CybertipReport.created_at.desc())).all()
    return {
        "item_id": item_id,
        "eligible": hold is not None,
        "reason": None if hold is not None else "not_under_child_safety_hold",
        "hold_id": hold.id if hold is not None else None,
        "hold_reason": hold.reason if hold is not None else None,
        "reports": [report_json(s, r, settings, include_xml=False) for r in reports],
    }


# ------------------------------------------------------------------ rendering and validation


def _file_facts(state: GatewayState, s: Session, report: CybertipReport, now: float) -> list[dict]:
    """Rebuilds the draft-time file facts (upload time, AI-generated, match sentence) from the item, without content."""
    item = s.get(ModerationItem, report.item_id)
    job = s.get(Job, report.job_id) if report.job_id else None
    rep = s.get(Report, item.report_id) if item is not None and item.report_id else None
    return _files_for(state, s, item, job, rep, now) if item is not None else []


def render(state: GatewayState, s: Session, report: CybertipReport, now: float, *, production: bool) -> tuple[bytes, list[str]]:
    """The report XML and every problem that would stop a submission: schema checks, sample file details, and files or
    holds that are no longer there. Nothing is decrypted."""
    draft = json.loads(report.draft)
    values = reporter(state.settings)
    xml = build_report_xml(draft, values)
    errors = validate_report_xml(xml, production=production, now=now)
    item = s.get(ModerationItem, report.item_id)
    if item is None or child_safety_hold(s, item, now) is None:
        errors.append("the item is no longer under an active child-safety hold")
    facts = {f["sha256"]: f for f in _file_facts(state, s, report, now)}
    for f in _files(s, report.id):
        if f.sha256 not in facts and f.ncmec_file_id is None:
            errors.append(f"file {f.file_name} is no longer stored under a hold or key")
        sample = build_file_details_xml(
            report_id="0", file_id="0", file={**facts.get(f.sha256, {}), "file_name": f.file_name, "sha256": f.sha256},
            viewed_by_esp=False, md5="0" * 32, industry_classification=draft.get("industry_classification"),
        )
        errors.extend(validate_file_details_xml(sample))
    return xml, errors


def dry_run(state: GatewayState, report_id: str, by: str, now: float | None = None) -> dict:
    now = time.time() if now is None else now
    with state.session() as s, s.begin():
        report = _locked(state, s, report_id)
        if report.status in (SUBMITTED, CANCELED):
            raise CybertipError(409, f"already_{report.status}", f"This report is already {report.status}.")
        xml, errors = render(state, s, report, now, production=environment(state.settings) == PRODUCTION)
        if not errors:
            report.report_xml, report.validated_at, report.updated_at = xml.decode(), now, now
        moderation.log_action(s, by, "cybertip.dry_run", "cybertip_report", report.id, None,
                              {"valid": not errors, "errors": len(errors)}, now)
        out = report_json(s, report, state.settings)
    if errors:
        raise CybertipError(422, "invalid_report", f"The report doesn't pass validation: {'; '.join(errors)}.", errors=errors,
                            report_xml=xml.decode())
    return out


# ------------------------------------------------------------------ submitting


def _locked(state: GatewayState, s: Session, report_id: str) -> CybertipReport:
    report = s.get(CybertipReport, report_id, with_for_update=state.postgres)
    if report is None:
        raise CybertipError(404, "not_found", "No such CyberTipline report.")
    return report


def _load(state: GatewayState, s: Session, f: CybertipReportFile, now: float) -> bytes:
    try:
        if f.source == "held_upload":
            hold = s.get(PreservationHold, f.hold_id) if f.hold_id else None
            if hold is None or hold.blob_id is None or not holds.upload_held(s, hold.upload_id, now):
                raise ContentUnavailable("no active hold keeps the upload")
            data = holds.open_blocked_upload(state, hold, f.sha256)
        elif f.source == "held_output":
            hold = holds.output_hold(s, f.job_id, now)
            if hold is None:
                raise ContentUnavailable("no active hold keeps the video")
            data = holds.open_blocked_output(state, hold, f.sha256)
        elif f.source == "standard_video":
            row = s.get(StandardJob, f.job_id)
            if row is None or row.video_blob_id is None:
                raise ContentUnavailable("the stored video is gone")
            data = standard_jobs.load_video(state, row)
        elif f.source == "private_video":
            job = s.get(Job, f.job_id)
            key = _private_key(state, s, job, now) if job is not None else None
            if key is None:
                raise ContentUnavailable("no key to this private video is held")
            data = standard_jobs.open_private_output(state, job, key)
        else:
            raise ContentUnavailable("unknown file source")
    except KeyError:
        raise ContentUnavailable("the stored content is gone") from None
    except DecryptionError:
        raise ContentUnavailable("the stored content failed its integrity check") from None
    if sha256_hex(data) != f.sha256:
        raise ContentUnavailable("the stored content does not match its digest")
    return data


def _private_key(state: GatewayState, s: Session, job: Job, now: float) -> bytes | None:
    held = holds.held_output_key(state, s, job.id, now)
    if held is not None:
        return held
    report = s.scalars(
        select(Report).where(Report.job_id == job.id, Report.status == "open", Report.output_key.is_not(None),
                             Report.reason.in_(("csam", "sexual_minor")))
    ).first()
    return vault(state).open_secret(standard_jobs.report_key_label(report.id), report.output_key) if report else None


def _fail(state: GatewayState, report_id: str, by: str, code: str, message: str, *, forget_ncmec: bool = False) -> None:
    now = time.time()
    with state.session() as s, s.begin():
        report = _locked(state, s, report_id)
        report.status, report.lease_until, report.updated_at = FAILED, None, now
        report.last_error_code, report.last_error = code, message[:500]
        detail: dict = {"error_code": code, "attempt": report.attempts}
        if forget_ncmec:
            # NCMEC no longer has the report (an unfinished report is deleted after a day): start again next time.
            detail["forgot_ncmec_report_id"] = report.ncmec_report_id
            report.ncmec_report_id = None
            for f in _files(s, report.id):
                f.ncmec_file_id = f.uploaded_at = f.details_sent_at = f.details_xml = f.md5 = None
        moderation.log_action(s, by, "cybertip.submit_failed", "cybertip_report", report.id, message[:500], detail, now)


def confirm_and_submit(state: GatewayState, report_id: str, by: str, note: str, api: CyberTiplineApi | None = None) -> dict:
    """An admin's confirmation. Disabled: a dry run recorded as confirmed. Test or production: submits, or resumes a
    submission that stopped part-way, step by step, recording each step NCMEC acknowledged before the next."""
    now = time.time()
    env = environment(state.settings)
    with state.session() as s, s.begin():
        report = _locked(state, s, report_id)
        if report.status in (SUBMITTED, CANCELED):
            raise CybertipError(409, f"already_{report.status}", f"This report is already {report.status}.")
        if report.status == SUBMITTING and (report.lease_until or 0) > now:
            raise CybertipError(409, "submission_in_progress", "This report is being submitted right now.")
        xml, errors = render(state, s, report, now, production=env == PRODUCTION)
        if errors:
            raise CybertipError(422, "invalid_report", f"The report doesn't pass validation: {'; '.join(errors)}.", errors=errors)
        report.report_xml, report.validated_at, report.updated_at = xml.decode(), now, now
        report.confirmed_by, report.confirmed_at, report.confirm_note = by, now, note
        if env == DISABLED:
            report.status = DRY_RUN
            moderation.log_action(s, by, "cybertip.submit", "cybertip_report", report.id, note,
                                  {"environment": env, "dry_run": True, "sent": False}, now)
            return report_json(s, report, state.settings)
        if not credentials_configured(state.settings):
            raise CybertipError(503, "cybertip_not_configured", "CyberTipline credentials are not configured on this gateway.")
        if report.ncmec_report_id and report.environment != env:
            # The earlier report belongs to the other environment; NCMEC deletes it unfinished. Start again here.
            report.ncmec_report_id = None
            for f in _files(s, report.id):
                f.ncmec_file_id = f.uploaded_at = f.details_sent_at = f.details_xml = f.md5 = None
        report.status, report.environment, report.lease_until = SUBMITTING, env, now + LEASE_S
        report.attempts = (report.attempts or 0) + 1
        report.last_error_code = report.last_error = None
        moderation.log_action(s, by, "cybertip.submit", "cybertip_report", report.id, note,
                              {"environment": env, "attempt": report.attempts, "resume": bool(report.ncmec_report_id)}, now)
        ncmec_report_id = report.ncmec_report_id
        industry = json.loads(report.draft).get("industry_classification")

    api = api or api_for(state.settings, env)
    try:
        if ncmec_report_id is None:
            opened = api.submit(xml)
            if not opened.report_id:
                raise NcmecError(None, "NCMEC's answer to /submit had no report id")
            ncmec_report_id = opened.report_id
            with state.session() as s, s.begin():
                _locked(state, s, report_id).ncmec_report_id = ncmec_report_id
                moderation.log_action(s, by, "cybertip.ncmec_report_opened", "cybertip_report", report_id, None,
                                      {"ncmec_report_id": ncmec_report_id, "environment": env})
        with state.session() as s:
            report = s.get(CybertipReport, report_id)
            file_ids = [f.id for f in _files(s, report_id)]
            viewed = viewed_by_esp(s, report)
        for file_id in file_ids:
            _send_file(state, api, report_id, file_id, ncmec_report_id, by, viewed, industry)
        try:
            api.finish(ncmec_report_id)
        except NcmecError as exc:
            if exc.code != REPORT_ALREADY_FINISHED:
                raise
    except NcmecError as exc:
        log.error("CyberTipline submission of %s failed: %s", report_id, exc.error_code)
        _fail(state, report_id, by, exc.error_code, exc.description, forget_ncmec=exc.code == REPORT_DOES_NOT_EXIST)
        raise CybertipError(502, "ncmec_error", f"NCMEC didn't accept the report: {exc.description}", ncmec_code=exc.code,
                            retryable=exc.retryable) from None
    except ContentUnavailable as exc:
        _fail(state, report_id, by, "content_unavailable", str(exc))
        raise CybertipError(409, "content_unavailable", f"A file can't be attached: {exc}.") from None
    except BaseException:
        _fail(state, report_id, by, "internal_error", "the submission stopped unexpectedly")
        raise

    now = time.time()
    with state.session() as s, s.begin():
        report = _locked(state, s, report_id)
        report.status, report.submitted_at, report.lease_until, report.updated_at = SUBMITTED, now, None, now
        extended = _preserve(state, s, report, by, now)
        moderation.log_action(s, by, "cybertip.submitted", "cybertip_report", report.id, None,
                              {"ncmec_report_id": ncmec_report_id, "environment": env, "holds_extended": extended}, now)
        return report_json(s, report, state.settings)


def _send_file(
    state: GatewayState, api: CyberTiplineApi, report_id: str, file_id: str, ncmec_report_id: str, by: str, viewed: bool,
    industry: str | None,
) -> None:
    now = time.time()
    with state.session() as s:
        f = s.get(CybertipReportFile, file_id)
        report = s.get(CybertipReport, report_id)
        facts = {x["sha256"]: x for x in _file_facts(state, s, report, now)}.get(f.sha256, {})
        data = _load(state, s, f, now) if f.ncmec_file_id is None else None
    if f.ncmec_file_id is None:
        md5 = hashlib.md5(data, usedforsecurity=False).hexdigest()
        uploaded = api.upload(ncmec_report_id, f.file_name, data, f.mime)
        del data
        if not uploaded.file_id:
            raise NcmecError(None, "NCMEC's answer to /upload had no file id")
        if uploaded.md5 and uploaded.md5.lower() != md5:
            raise NcmecError(None, "NCMEC received a file whose MD5 differs from the one sent")
        with state.session() as s, s.begin():
            row = s.get(CybertipReportFile, file_id)
            row.ncmec_file_id, row.md5, row.uploaded_at = uploaded.file_id, md5, time.time()
            moderation.log_action(s, by, "cybertip.file_uploaded", "cybertip_report", report_id, None,
                                  {"sha256": row.sha256, "md5": md5, "ncmec_file_id": uploaded.file_id})
            f = row
    if f.details_sent_at is None:
        details = build_file_details_xml(
            report_id=ncmec_report_id, file_id=f.ncmec_file_id,
            file={**facts, "file_name": f.file_name, "sha256": f.sha256}, viewed_by_esp=viewed, md5=f.md5,
            industry_classification=industry,
        )
        problems = validate_file_details_xml(details)
        if problems:
            raise NcmecError(None, f"file details failed validation: {problems[0]}")
        api.file_info(details)
        with state.session() as s, s.begin():
            row = s.get(CybertipReportFile, file_id)
            row.details_xml, row.details_sent_at = details.decode(), time.time()
            moderation.log_action(s, by, "cybertip.file_details_sent", "cybertip_report", report_id, None,
                                  {"ncmec_file_id": row.ncmec_file_id, "viewed_by_esp": viewed})


def _preserve(state: GatewayState, s: Session, report: CybertipReport, by: str, now: float) -> list[str]:
    """A submitted report's holds last at least the full preservation period from now (18 U.S.C. 2258A(h))."""
    full = now + state.settings.preservation_days * DAY
    extended = []
    hold_ids = {report.hold_id} | {f.hold_id for f in _files(s, report.id) if f.hold_id}
    for hold_id in sorted(h for h in hold_ids if h):
        hold = s.get(PreservationHold, hold_id)
        if hold is None or hold.released_at is not None or hold.expires_at <= now or hold.expires_at >= full:
            continue
        hold.expires_at = full
        moderation.log_action(s, by, "hold.extend", "hold", hold.id, "CyberTipline report submitted",
                              {"expires_at": full, "cybertip_report_id": report.id, "ncmec_report_id": report.ncmec_report_id}, now)
        extended.append(hold.id)
    return extended


def cancel(state: GatewayState, report_id: str, by: str, note: str, api: CyberTiplineApi | None = None) -> dict:
    """Cancels a report that wasn't submitted. A report NCMEC opened but never finished is retracted there too."""
    now = time.time()
    with state.session() as s, s.begin():
        report = _locked(state, s, report_id)
        if report.status in (SUBMITTED, CANCELED):
            raise CybertipError(409, f"already_{report.status}", f"This report is already {report.status}.")
        if report.status == SUBMITTING and (report.lease_until or 0) > now:
            raise CybertipError(409, "submission_in_progress", "This report is being submitted right now.")
        ncmec_report_id, env = report.ncmec_report_id, report.environment
        report.status, report.canceled_by, report.canceled_at, report.cancel_note, report.updated_at = CANCELED, by, now, note, now
        moderation.log_action(s, by, "cybertip.cancel", "cybertip_report", report.id, note, {"ncmec_report_id": ncmec_report_id}, now)
    if ncmec_report_id and env in (TEST, PRODUCTION):
        outcome: dict = {"ncmec_report_id": ncmec_report_id, "environment": env}
        try:
            (api or api_for(state.settings, env)).retract(ncmec_report_id)
            outcome["retracted"] = True
        except NcmecError as exc:
            outcome["retracted"] = exc.code in (REPORT_ALREADY_RETRACTED, REPORT_DOES_NOT_EXIST)
            outcome["error_code"] = exc.error_code
        with state.session() as s, s.begin():
            moderation.log_action(s, by, "cybertip.retract", "cybertip_report", report_id, None, outcome)
    with state.session() as s:
        return report_json(s, s.get(CybertipReport, report_id), state.settings)
