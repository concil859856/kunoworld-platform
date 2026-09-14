"""Preservation holds (migration 0009). See MODERATION.md, "Preservation holds", and holds.py.

A hold names a job or an upload whose stored content must not be deleted until the hold is released or expires.
Removal and deletion still hide held content from its owner and validators; only the destruction waits.
"""

from __future__ import annotations

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class PreservationHold(Base):
    __tablename__ = "preservation_holds"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # Exactly one of job_id and upload_id is set.
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    # A standard_uploads id, or the id a blocked upload was stored under (it has no standard_uploads row).
    upload_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    # A blocked upload's at-rest blob (sealed by the vault). Cleared once the blob is deleted after release.
    blob_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    account_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    # report_csam, report_sexual_minor, upload_match, legal_request, operator
    reason: Mapped[str] = mapped_column(String(32))
    report_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    # A private video's key a report handed over, resealed at rest for this hold. Deleted when the hold ends.
    output_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    # An operator's name, or "system" for automatic holds.
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[float] = mapped_column(Float, index=True)
    expires_at: Mapped[float] = mapped_column(Float, index=True)
    released_at: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    released_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_note: Mapped[str | None] = mapped_column(Text, nullable=True)
