"""CyberTipline report drafts and submissions (migration 0013). See MODERATION.md, "CyberTipline reports", and cybertip.py.

Nothing here holds image or video data. A file row names where the gateway keeps the content (a hold's blob, a stored
Standard video, a private job whose key a hold kept) and its digests; the bytes are read only while uploading to NCMEC.
"""

from __future__ import annotations

from sqlalchemy import BigInteger, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class CybertipReport(Base):
    __tablename__ = "cybertip_reports"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # draft, dry_run, submitting, submitted, failed, canceled
    status: Mapped[str] = mapped_column(String(16), index=True)
    item_id: Mapped[str] = mapped_column(String(32), index=True)
    # The child-safety hold the draft was prepared under.
    hold_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    upload_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    account_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    incident_type: Mapped[str] = mapped_column(String(96))
    # JSON: incident, reporter, reported account, additional information. Metadata only.
    draft: Mapped[str] = mapped_column(Text)
    # The report XML last validated (a dry run or a submission).
    report_xml: Mapped[str | None] = mapped_column(Text, nullable=True)
    validated_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    # test or production: where a submission went. Null for drafts and dry runs.
    environment: Mapped[str | None] = mapped_column(String(16), nullable=True)
    ncmec_report_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    # A submission in progress holds the report until this time, so two can't run at once.
    lease_until: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[float] = mapped_column(Float, index=True)
    updated_at: Mapped[float] = mapped_column(Float)
    confirmed_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    confirmed_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    confirm_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    canceled_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    canceled_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    cancel_note: Mapped[str | None] = mapped_column(Text, nullable=True)


class CybertipReportFile(Base):
    __tablename__ = "cybertip_report_files"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    report_id: Mapped[str] = mapped_column(String(32), index=True)
    position: Mapped[int] = mapped_column(Integer)
    # held_upload, held_output, standard_video, private_video
    source: Mapped[str] = mapped_column(String(24))
    hold_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    upload_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sha256: Mapped[str] = mapped_column(String(64))
    # Computed while uploading; NCMEC answers an upload with the file's MD5.
    md5: Mapped[str | None] = mapped_column(String(32), nullable=True)
    size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    mime: Mapped[str] = mapped_column(String(64))
    file_name: Mapped[str] = mapped_column(String(255))
    ncmec_file_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    uploaded_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    details_xml: Mapped[str | None] = mapped_column(Text, nullable=True)
    details_sent_at: Mapped[float | None] = mapped_column(Float, nullable=True)
