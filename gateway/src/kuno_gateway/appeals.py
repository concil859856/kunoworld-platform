"""Appeals (MODERATION.md, "Appeals"): a customer asks for a strike, a restriction, a removal or a report's resolution
to be looked at again.

* One open appeal per subject, a statement of at most 2000 characters, and at most `APPEALS_PER_DAY` a day per account.
* Each appeal adds a moderation queue item of kind `appeal` (priority `APPEAL_PRIORITY`). It is resolved only through
  the appeal: `uphold` changes nothing; `overturn` voids a strike (voided strikes don't count), lifts a restriction,
  or reverses a report resolution's account action (the restriction or ban it placed, or its removal).
* A removal is restored only if its content is still stored, which only a preservation hold makes possible. Otherwise
  the content is gone, and the decision says so plainly.
* The customer is emailed the decision and sees it on the account page. Every step is in the audit log, where the
  customer appears as `owner:<user id>`, never by email.

Appeal items carry no job id, so they never open a new way to content: operators review appeals from metadata.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from html import escape
from typing import TYPE_CHECKING

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from . import moderation
from .db import NEVER_EXPIRES, Blob, Job, User
from .db_lifecycle import AccountClosure, Appeal
from .db_moderation import AccountRestriction, ModerationItem, Report, StandardJob, Strike
from .mailer import Message
from .standard_jobs import STANDARD

if TYPE_CHECKING:
    from .state import GatewayState

log = logging.getLogger("kuno.appeals")

SUBJECT_KINDS = ("strike", "restriction", "removal", "report_resolution")
DECISIONS = ("uphold", "overturn")
OPEN, UPHELD, OVERTURNED, WITHDRAWN = "open", "upheld", "overturned", "withdrawn"
# Below child-safety reports (100), blocked uploads (90) and account reviews (70); above ordinary reports (20).
APPEAL_PRIORITY = 50
MAX_STATEMENT = 2000
APPEALS_PER_DAY = 5
DAY = 86400
ACCOUNT_ACTIONS = ("restrict_account", "ban_account")
APPEALABLE_RESOLUTIONS = (*ACCOUNT_ACTIONS, "remove_content")
SYSTEM = "system"


class AppealError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def owner_actor(user_id: str) -> str:
    """How the audit log names a customer acting on their own account: by user id, never by email."""
    return f"owner:{user_id}"


def open_key(account_id: str, kind: str, subject_id: str) -> str:
    return f"{account_id}:{kind}:{subject_id}"


# ------------------------------------------------------------------ subjects


def restriction_active(restriction: AccountRestriction, now: float) -> bool:
    return restriction.lifted_at is None and (restriction.until is None or restriction.until > now)


def removed_job_ids(s: Session, account_id: str) -> set[str]:
    """Jobs of this account whose content moderation removed (by a report, a queue item, or a Standard row's reason)."""
    ids = set(
        s.scalars(
            select(Report.job_id).where(
                Report.account_id == account_id, Report.resolution == "remove_content", Report.job_id.is_not(None)
            )
        ).all()
    )
    ids |= set(
        s.scalars(
            select(ModerationItem.job_id).where(
                ModerationItem.account_id == account_id,
                ModerationItem.resolution == "remove_content",
                ModerationItem.job_id.is_not(None),
            )
        ).all()
    )
    ids |= set(
        s.scalars(select(StandardJob.job_id).where(StandardJob.account_id == account_id, StandardJob.delete_reason == "removed")).all()
    )
    return ids


def removal(s: Session, account_id: str, job_id: str) -> dict | None:
    """When and by what decision moderation removed a job's content, or None if it never did."""
    job = s.get(Job, job_id)
    if job is None or job.account_id != account_id:
        return None
    report = s.scalars(
        select(Report).where(Report.job_id == job_id, Report.resolution == "remove_content").order_by(Report.resolved_at.desc())
    ).first()
    if report is not None:
        return {"job": job, "removed_at": report.resolved_at, "removed_by": report.resolved_by, "report_id": report.id, "item_id": None}
    item = s.scalars(
        select(ModerationItem)
        .where(ModerationItem.job_id == job_id, ModerationItem.resolution == "remove_content")
        .order_by(ModerationItem.resolved_at.desc())
    ).first()
    if item is not None:
        return {"job": job, "removed_at": item.resolved_at, "removed_by": item.resolved_by, "report_id": None, "item_id": item.id}
    row = s.get(StandardJob, job_id)
    if row is not None and row.delete_reason == "removed":
        return {"job": job, "removed_at": row.deleted_at, "removed_by": None, "report_id": None, "item_id": None}
    return None


def content_hidden(s: Session, job: Job, now: float) -> bool:
    """Whether the job's content is out of its owner's reach (deleted, removed, or hidden while a hold keeps it)."""
    if job.privacy == STANDARD:
        row = s.get(StandardJob, job.id)
        return row is None or row.deleted_at is not None
    blob = s.get(Blob, job.output_blob_id) if job.output_blob_id else None
    return blob is None or blob.expires_at <= now


def content_stored(s: Session, job: Job) -> bool:
    """Whether anything of the job's content is still stored. After a removal, only a preservation hold keeps it."""
    if job.privacy == STANDARD:
        row = s.get(StandardJob, job.id)
        return row is not None and (row.video_blob_id is not None or row.prompt is not None or row.plan is not None)
    return bool(job.output_blob_id) and s.get(Blob, job.output_blob_id) is not None


def resolution_restriction(s: Session, report: Report) -> AccountRestriction | None:
    """The restriction or ban a report's resolution placed: same account, by an operator, at the moment it resolved."""
    if report.account_id is None or report.resolved_at is None:
        return None
    return s.scalars(
        select(AccountRestriction).where(
            AccountRestriction.account_id == report.account_id,
            AccountRestriction.source == "operator",
            AccountRestriction.created_at == report.resolved_at,
        )
    ).first()


def check_subject(s: Session, account_id: str, kind: str, subject_id: str, now: float) -> None:
    """Raises AppealError unless the subject is this account's and there is something to appeal."""
    missing = AppealError(404, "subject_not_found", "There's nothing with that id on this account to appeal.")
    if kind == "strike":
        strike = s.get(Strike, subject_id)
        if strike is None or strike.account_id != account_id:
            raise missing
        if strike.voided_at is not None:
            raise AppealError(409, "not_appealable", "This strike was already voided.")
    elif kind == "restriction":
        restriction = s.get(AccountRestriction, subject_id)
        if restriction is None or restriction.account_id != account_id:
            raise missing
        if not restriction_active(restriction, now):
            raise AppealError(409, "not_appealable", "This restriction has already ended.")
    elif kind == "removal":
        found = removal(s, account_id, subject_id)
        if found is None:
            raise missing
        if not content_hidden(s, found["job"], now):
            raise AppealError(409, "not_appealable", "This video isn't removed any more.")
    elif kind == "report_resolution":
        report = s.get(Report, subject_id)
        if report is None or report.account_id != account_id or report.status != "resolved":
            raise missing
        if report.resolution not in APPEALABLE_RESOLUTIONS:
            raise AppealError(409, "not_appealable", "This report was dismissed: nothing was done to the account.")
    else:
        raise AppealError(422, "invalid_subject", f"subject_kind must be one of: {', '.join(SUBJECT_KINDS)}.")


# ------------------------------------------------------------------ creating and withdrawing


def create(s: Session, account_id: str, user_id: str, kind: str, subject_id: str, statement: str, now: float) -> Appeal:
    statement = statement.strip()
    if not statement:
        raise AppealError(422, "empty_statement", "Say why the decision should change.")
    if len(statement) > MAX_STATEMENT:
        raise AppealError(422, "statement_too_long", f"Keep the statement to {MAX_STATEMENT} characters.")
    recent = s.scalar(
        select(func.count()).select_from(Appeal).where(Appeal.account_id == account_id, Appeal.created_at > now - DAY)
    ) or 0
    if recent >= APPEALS_PER_DAY:
        raise AppealError(429, "rate_limited", f"An account can send {APPEALS_PER_DAY} appeals a day. Try again tomorrow.")
    check_subject(s, account_id, kind, subject_id, now)
    key = open_key(account_id, kind, subject_id)
    if s.scalars(select(Appeal.id).where(Appeal.open_key == key)).first() is not None:
        raise AppealError(409, "appeal_open", "There's already an open appeal about this. You'll get an email when it's decided.")
    appeal = Appeal(
        id=uuid.uuid4().hex, account_id=account_id, user_id=user_id, subject_kind=kind, subject_id=subject_id,
        statement=statement, status=OPEN, open_key=key, created_at=now,
    )
    item = moderation.add_item(
        s, "appeal", APPEAL_PRIORITY, account_id=account_id, now=now,
        detail={"appeal_id": appeal.id, "subject_kind": kind, "subject_id": subject_id},
    )
    appeal.item_id = item.id
    s.add(appeal)
    s.flush()
    moderation.log_action(
        s, owner_actor(user_id), "appeal.create", "appeal", appeal.id, None,
        {"account_id": account_id, "subject_kind": kind, "subject_id": subject_id, "item_id": item.id}, now,
    )
    return appeal


def withdraw_open(s: Session, account_id: str, by: str, now: float) -> int:
    """Closes the account's open appeals (the account is being closed) and their queue items."""
    rows = s.scalars(select(Appeal).where(Appeal.account_id == account_id, Appeal.status == OPEN)).all()
    for appeal in rows:
        appeal.status, appeal.open_key, appeal.resolved_at, appeal.resolved_by = WITHDRAWN, None, now, by
        item = s.get(ModerationItem, appeal.item_id) if appeal.item_id else None
        if item is not None and item.status == "open":
            item.status, item.resolved_at, item.resolved_by = "resolved", now, by
            item.resolution, item.resolution_note = WITHDRAWN, "the account was closed"
        moderation.log_action(s, by, "appeal.withdraw", "appeal", appeal.id, "the account was closed", {"account_id": account_id}, now)
    return len(rows)


# ------------------------------------------------------------------ deciding


def resolve(state: GatewayState, s: Session, appeal: Appeal, decision: str, note: str, by: str, now: float) -> dict:
    """Upholds or overturns an open appeal, applies an overturn's effects, closes its queue item and logs it all."""
    if decision not in DECISIONS:
        raise AppealError(422, "invalid_decision", "decision must be uphold or overturn.")
    if appeal.status != OPEN:
        raise AppealError(409, "already_resolved", "This appeal is already decided.")
    outcome = _overturn(state, s, appeal, note, by, now) if decision == "overturn" else {}
    appeal.status = OVERTURNED if decision == "overturn" else UPHELD
    appeal.decision, appeal.note, appeal.resolved_at, appeal.resolved_by, appeal.open_key = decision, note, now, by, None
    appeal.outcome = json.dumps(outcome, separators=(",", ":")) if outcome else None
    item = s.get(ModerationItem, appeal.item_id) if appeal.item_id else None
    if item is not None and item.status == "open":
        item.status, item.resolved_at, item.resolved_by, item.resolution, item.resolution_note = "resolved", now, by, decision, note
    moderation.log_action(
        s, by, f"appeal.{decision}", "appeal", appeal.id, note,
        {"account_id": appeal.account_id, "subject_kind": appeal.subject_kind, "subject_id": appeal.subject_id, **outcome},
        now,
    )
    return outcome


def _overturn(state: GatewayState, s: Session, appeal: Appeal, note: str, by: str, now: float) -> dict:
    kind = appeal.subject_kind
    if kind == "strike":
        strike = s.get(Strike, appeal.subject_id)
        if strike is None or strike.voided_at is not None:
            return {"strike_voided": False}
        strike.voided_at, strike.voided_by = now, by
        moderation.log_action(s, by, "strike.void", "strike", strike.id, note, {"appeal_id": appeal.id, "account_id": strike.account_id}, now)
        return {"strike_voided": True}
    if kind == "restriction":
        return _lift(s, s.get(AccountRestriction, appeal.subject_id), appeal, note, by, now)
    if kind == "removal":
        return restore(s, s.get(Job, appeal.subject_id), appeal, note, by, now)
    report = s.get(Report, appeal.subject_id)
    if report is None:
        return {}
    outcome: dict = {"report_id": report.id, "resolution": report.resolution}
    if report.resolution in ACCOUNT_ACTIONS:
        outcome.update(_lift(s, resolution_restriction(s, report), appeal, note, by, now))
    elif report.resolution == "remove_content":
        outcome.update(restore(s, s.get(Job, report.job_id) if report.job_id else None, appeal, note, by, now))
    moderation.log_action(s, by, "report.overturn", "report", report.id, note, {"appeal_id": appeal.id, **outcome}, now)
    return outcome


def _lift(s: Session, restriction: AccountRestriction | None, appeal: Appeal, note: str, by: str, now: float) -> dict:
    if restriction is None:
        return {"restriction_lifted": False}
    if not restriction_active(restriction, now):
        return {"restriction_lifted": False, "restriction_ended": True, "restriction_id": restriction.id}
    restriction.lifted_at, restriction.lifted_by = now, by
    moderation.log_action(
        s, by, "account.unrestrict", "account", restriction.account_id, note,
        {"appeal_id": appeal.id, "restriction_id": restriction.id, "lifted": 1}, now,
    )
    return {"restriction_lifted": True, "restriction_id": restriction.id}


def restore(s: Session, job: Job | None, appeal: Appeal, note: str, by: str, now: float) -> dict:
    """Undoes a removal when the content is still stored (a preservation hold kept it). Otherwise it's gone."""
    gone = {"content_restored": False, "content_gone": True}
    if job is None:
        return gone
    if not content_hidden(s, job, now):
        return {"content_restored": False, "already_available": True, "job_id": job.id}
    if not content_stored(s, job):
        return {**gone, "job_id": job.id}
    if job.privacy == STANDARD:
        row = s.get(StandardJob, job.id)
        row.deleted_at = row.delete_reason = None
    # Hidden sealed blobs expired at the moment of removal; stored videos never expire.
    unhidden = s.execute(update(Blob).where(Blob.job_id == job.id).values(expires_at=NEVER_EXPIRES)).rowcount or 0
    moderation.log_action(
        s, by, "job.restore", "job", job.id, note, {"appeal_id": appeal.id, "privacy": job.privacy, "sealed_blobs": unhidden}, now,
    )
    return {"content_restored": True, "job_id": job.id}


# ------------------------------------------------------------------ telling the customer


SUBJECT_WORDS = {
    "strike": "a strike on your account",
    "restriction": "a restriction on your account",
    "removal": "the removal of one of your videos",
    "report_resolution": "a decision on a report about your account",
}


def outcome_sentences(status: str, outcome: dict | None) -> list[str]:
    outcome = outcome or {}
    if status == OPEN:
        return ["A reviewer hasn't decided this appeal yet."]
    if status == WITHDRAWN:
        return ["This appeal was withdrawn when the account was closed."]
    if status == UPHELD:
        return ["We reviewed it, and the decision stands."]
    lines = ["We reviewed it and overturned the decision."]
    if outcome.get("strike_voided"):
        lines.append("The strike no longer counts toward restrictions or Private mode.")
    if outcome.get("restriction_lifted"):
        lines.append("The restriction is lifted: you can make videos again.")
    elif outcome.get("restriction_ended"):
        lines.append("The restriction had already ended.")
    if outcome.get("content_restored"):
        lines.append("The video is back in your library.")
    elif outcome.get("content_gone"):
        lines.append("The video itself is gone: its content was deleted when it was removed, so it can't be restored.")
    return lines


def owner_json(appeal: Appeal) -> dict:
    outcome = json.loads(appeal.outcome) if appeal.outcome else None
    return {
        "appeal_id": appeal.id,
        "subject_kind": appeal.subject_kind,
        "subject_id": appeal.subject_id,
        "status": appeal.status,
        "statement": appeal.statement,
        "created_at": appeal.created_at,
        "resolved_at": appeal.resolved_at,
        "decision": appeal.decision,
        "note": appeal.note,
        "outcome": outcome,
        "summary": outcome_sentences(appeal.status, outcome),
    }


def recipient(s: Session, appeal: Appeal) -> str | None:
    """The address to tell about a decision: the user's, unless the account was closed."""
    user = s.get(User, appeal.user_id)
    if user is None or s.scalars(select(AccountClosure.id).where(AccountClosure.user_id == user.id)).first() is not None:
        return None
    return user.email


def outcome_message(to: str, appeal: Appeal, site_url: str) -> Message:
    about = SUBJECT_WORDS.get(appeal.subject_kind, "a decision on your account")
    lines = outcome_sentences(appeal.status, json.loads(appeal.outcome) if appeal.outcome else None)
    link = f"{site_url.rstrip('/')}/account#appeals"
    # "Upheld" would be ambiguous in a subject line (the appeal, or the decision?), so say what happened to the decision.
    subject = "Your KunoWorld appeal: " + ("the decision was overturned" if appeal.status == OVERTURNED else "the decision stands")
    note = appeal.note or ""
    text = (
        f"Your appeal about {about}\n\n" + "\n".join(lines) + "\n\n"
        + (f"Note from the reviewer:\n{note}\n\n" if note else "")
        + f"Your appeals and their decisions are on your account page: {link}\n"
    )
    html = (
        f"<p><strong>Your appeal about {escape(about)}</strong></p>"
        + "".join(f"<p>{escape(line)}</p>" for line in lines)
        + (f"<p>Note from the reviewer:</p><blockquote>{escape(note)}</blockquote>" if note else "")
        + f'<p>Your appeals and their decisions are on <a href="{escape(link, quote=True)}">your account page</a>.</p>'
    )
    return Message(to=to, subject=subject, text=text, html=html)


def notify(state: GatewayState, appeal_id: str, message: Message) -> float | None:
    """Emails a decision after it is committed. A failed send is logged; the decision stands either way."""
    try:
        state.mailer.send(message)
    except Exception:
        log.exception("emailing an appeal decision failed")
        with state.session() as s, s.begin():
            moderation.log_action(s, SYSTEM, "appeal.notify_failed", "appeal", appeal_id, None, {"channel": "email"})
        return None
    now = time.time()
    with state.session() as s, s.begin():
        appeal = s.get(Appeal, appeal_id)
        if appeal is not None:
            appeal.notified_at = now
        moderation.log_action(s, SYSTEM, "appeal.notify", "appeal", appeal_id, None, {"channel": "email"}, now)
    return now


# ------------------------------------------------------------------ what the customer and operators see


def _appeal_ref(appeal: Appeal | None) -> dict | None:
    return None if appeal is None else {"appeal_id": appeal.id, "status": appeal.status}


def standing(s: Session, account_id: str, now: float) -> dict:
    """The account's strikes, restrictions, removals and report resolutions, each with its latest appeal and whether a
    new one can be sent. No operator identities or notes."""
    latest: dict[tuple[str, str], Appeal] = {}
    for appeal in s.scalars(select(Appeal).where(Appeal.account_id == account_id).order_by(Appeal.created_at)).all():
        latest[(appeal.subject_kind, appeal.subject_id)] = appeal

    def appealable(kind: str, subject_id: str, eligible: bool) -> bool:
        appeal = latest.get((kind, subject_id))
        return eligible and not (appeal is not None and appeal.status in (OPEN, OVERTURNED))

    strikes = [
        {
            "strike_id": strike.id, "reason": strike.reason, "job_id": strike.job_id, "created_at": strike.created_at,
            # Within the 30 days the strike rules and private eligibility look at.
            "recent": strike.created_at > now - 30 * DAY,
            "voided_at": strike.voided_at, "appeal": _appeal_ref(latest.get(("strike", strike.id))),
            "appealable": appealable("strike", strike.id, strike.voided_at is None),
        }
        for strike in s.scalars(
            select(Strike).where(Strike.account_id == account_id).order_by(Strike.created_at.desc()).limit(100)
        ).all()
    ]
    restrictions = []
    for restriction in s.scalars(
        select(AccountRestriction).where(AccountRestriction.account_id == account_id).order_by(AccountRestriction.created_at.desc()).limit(100)
    ).all():
        active = restriction_active(restriction, now)
        restrictions.append({
            "restriction_id": restriction.id, "kind": restriction.kind, "until": restriction.until,
            "indefinite": restriction.until is None, "source": restriction.source,
            # Automatic restrictions say which rule; an operator's reason is their audit note and stays internal.
            "reason": restriction.reason if restriction.source == "strikes" else None,
            "created_at": restriction.created_at, "lifted_at": restriction.lifted_at, "active": active,
            "appeal": _appeal_ref(latest.get(("restriction", restriction.id))),
            "appealable": appealable("restriction", restriction.id, active),
        })
    removals = []
    for job_id in sorted(removed_job_ids(s, account_id)):
        found = removal(s, account_id, job_id)
        if found is None:
            continue
        hidden = content_hidden(s, found["job"], now)
        removals.append({
            "job_id": job_id, "privacy": found["job"].privacy, "removed_at": found["removed_at"], "restored": not hidden,
            "appeal": _appeal_ref(latest.get(("removal", job_id))), "appealable": appealable("removal", job_id, hidden),
        })
    removals.sort(key=lambda r: r["removed_at"] or 0, reverse=True)
    resolutions = [
        {
            "report_id": report.id, "reason": report.reason, "resolution": report.resolution,
            "resolved_at": report.resolved_at, "job_id": report.job_id,
            "appeal": _appeal_ref(latest.get(("report_resolution", report.id))),
            "appealable": appealable("report_resolution", report.id, True),
        }
        for report in s.scalars(
            select(Report)
            .where(Report.account_id == account_id, Report.status == "resolved", Report.resolution.in_(APPEALABLE_RESOLUTIONS))
            .order_by(Report.resolved_at.desc())
            .limit(100)
        ).all()
    ]
    sent_today = s.scalar(
        select(func.count()).select_from(Appeal).where(Appeal.account_id == account_id, Appeal.created_at > now - DAY)
    ) or 0
    return {
        "strikes": strikes,
        "restrictions": restrictions,
        "removals": removals,
        "report_resolutions": resolutions,
        "appeals_sent_today": sent_today,
        "appeals_per_day": APPEALS_PER_DAY,
        "max_statement": MAX_STATEMENT,
    }


def subject_view(s: Session, appeal: Appeal, now: float) -> dict | None:
    """What an operator needs to decide: the subject's metadata, never content."""
    kind, subject_id = appeal.subject_kind, appeal.subject_id
    if kind == "strike":
        strike = s.get(Strike, subject_id)
        return None if strike is None else {
            "reason": strike.reason, "job_id": strike.job_id, "created_at": strike.created_at,
            "voided_at": strike.voided_at, "voided_by": strike.voided_by,
            "strikes_30d": moderation.strike_counts(s, appeal.account_id, now)["30d"],
        }
    if kind == "restriction":
        restriction = s.get(AccountRestriction, subject_id)
        return None if restriction is None else {
            "kind": restriction.kind, "until": restriction.until, "source": restriction.source, "reason": restriction.reason,
            "created_by": restriction.created_by, "created_at": restriction.created_at, "lifted_at": restriction.lifted_at,
            "lifted_by": restriction.lifted_by, "active": restriction_active(restriction, now),
        }
    if kind == "removal":
        found = removal(s, appeal.account_id, subject_id)
        if found is None:
            return None
        hidden = content_hidden(s, found["job"], now)
        return {
            "job_id": subject_id, "privacy": found["job"].privacy, "removed_at": found["removed_at"],
            "removed_by": found["removed_by"], "report_id": found["report_id"], "item_id": found["item_id"],
            "hidden": hidden, "content_restorable": hidden and content_stored(s, found["job"]),
        }
    report = s.get(Report, subject_id)
    if report is None:
        return None
    view = {
        "report_id": report.id, "reason": report.reason, "resolution": report.resolution, "resolution_note": report.resolution_note,
        "resolved_by": report.resolved_by, "resolved_at": report.resolved_at, "job_id": report.job_id,
    }
    if report.resolution in ACCOUNT_ACTIONS:
        restriction = resolution_restriction(s, report)
        view["restriction_active"] = restriction is not None and restriction_active(restriction, now)
    elif report.resolution == "remove_content" and report.job_id:
        job = s.get(Job, report.job_id)
        view["content_restorable"] = bool(job) and content_hidden(s, job, now) and content_stored(s, job)
    return view


def operator_json(s: Session, appeal: Appeal, now: float) -> dict:
    return {
        **owner_json(appeal),
        "account_id": appeal.account_id,
        "item_id": appeal.item_id,
        "resolved_by": appeal.resolved_by,
        "notified_at": appeal.notified_at,
        "subject": subject_view(s, appeal, now),
    }
