"""standard_jobs.shots: a Standard storyboard's shot prompts.

A storyboard (PROTOCOL.md, "Storyboards") seals one prompt per shot next to the scene prompt they share. The gateway
reads them in Standard mode, so it stores them with the prompt, as JSON `[{"prompt"}, ...]` in shot order, and shows
them wherever it shows the prompt: to the owner, to validators and to an operator reviewing the job. Deleting the
content clears them with the prompt. NULL for every job that isn't a storyboard, including every job from before this
revision.

Downgrade drops the column, and with it the shot prompts of any Standard storyboard stored since.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("standard_jobs") as batch:
        batch.add_column(sa.Column("shots", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("standard_jobs") as batch:
        batch.drop_column("shots")
