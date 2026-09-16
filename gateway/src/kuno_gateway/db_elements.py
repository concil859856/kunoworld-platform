"""Elements (migration 0021): a customer's reusable characters, products, locations, styles and voices, encrypted in
their browser or program. See ELEMENTS.md and elements.py.

Nothing here opens an Element. The row holds the element key wrapped under the account's Elements key (derived from
the key sync master key, which the platform never receives), the element's record sealed under the element key, and
the ids of its sealed files in the blob store. The gateway checks shapes and sizes; it can't unwrap or unseal anything.
"""

from __future__ import annotations

from sqlalchemy import BigInteger, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class Element(Base):
    """One Element. Its kind, name, description, consent record and file types are inside `meta`, not here."""

    __tablename__ = "elements"

    account_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # 32 lowercase hex characters chosen by the client, and part of the wrapped key's associated data. Scoped to the
    # account, so an id tells nothing about any other account's Elements.
    element_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # 1 when made, +1 on every replacement: a replacement names the revision it replaces.
    revision: Mapped[int] = mapped_column(Integer)
    # The key sync generation whose Elements key wrapped `wrapped_key`. Always the vault's current one: a rotation
    # re-wraps every Element in the same transaction.
    master_key_id: Mapped[str] = mapped_column(String(32))
    # base64url of "KVE1" | IV | AES-256-GCM(32-byte element key) | tag
    wrapped_key: Mapped[str] = mapped_column(String(128))
    # base64url of a KUNOB1 version 2 blob: the element's record, padded to at least 4 KiB before sealing
    meta: Mapped[str] = mapped_column(Text)
    # Sum of the sealed files' sizes, for the account's storage limit.
    files_bytes: Mapped[int] = mapped_column(BigInteger)
    # When the uploader last affirmed the Elements rules (no public figures, no minors, consent for real people). Every
    # write carries the affirmation, whatever the Element shows, so this says nothing about what it depicts.
    rules_affirmed_at: Mapped[float] = mapped_column(Float)
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float)


class ElementFile(Base):
    """One sealed file of an Element (an image or a voice clip; which, only the record says), in listed order."""

    __tablename__ = "element_files"

    account_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    element_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, primary_key=True)
    # The object in the blob store (R2 in production). It was uploaded through POST /v1/blobs; claiming it for the
    # Element removed its `blobs` row, so no other route serves it and the upload sweep never deletes it.
    blob_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    # Ciphertext size and SHA-256: what the store holds, served as the file's ETag.
    size: Mapped[int] = mapped_column(BigInteger)
    sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[float] = mapped_column(Float)


# ------------------------------------------------------------------ restores
#
# Deleting an Element records a tombstone (elements.py), and each of its files a `blob` tombstone. After a database
# restore, `kuno-gateway reapply-deletions` replays them: the `element` replayer removes the rows (and their objects, if
# the bucket still has them), and `blob` replays remove objects a bucket restore brought back. Registered here, where
# the models load, because every gateway process imports the models, that command included.

TOMBSTONE_ELEMENT = "element"


def replay_element(state, s, entry, now: float, dry_run: bool) -> str:
    from sqlalchemy import select

    from . import tombstones

    if not entry.account_id:
        return tombstones.ABSENT
    row = s.get(Element, (entry.account_id, entry.ref))
    # An Element made again with the same id after the deletion isn't the one deleted.
    if row is not None and row.created_at > entry.created_at:
        return tombstones.ABSENT
    files = s.scalars(
        select(ElementFile).where(ElementFile.account_id == entry.account_id, ElementFile.element_id == entry.ref)
    ).all()
    files = [f for f in files if f.created_at <= entry.created_at]
    if row is None and not files:
        return tombstones.ABSENT
    if dry_run:
        return tombstones.WOULD_DELETE
    for file in files:
        try:
            state.blobs.delete(file.blob_id)
        except Exception:  # noqa: BLE001  (its `blob` tombstone deletes it on the next replay)
            import logging

            logging.getLogger("kuno.gateway.tombstones").warning("could not delete element object %s", file.blob_id)
        s.delete(file)
    if row is not None:
        s.delete(row)
    return tombstones.DELETED


def _register_replayers() -> None:
    import importlib.util

    if importlib.util.find_spec(f"{__package__}.tombstones") is None:
        return
    from . import tombstones

    tombstones.register_replayer(TOMBSTONE_ELEMENT, replay_element)


_register_replayers()
