"""Plans (PROTOCOL.md "Plans (Director)"): enclaves.features and standard_jobs.plan.

* `enclaves.features`: the optional job kinds a worker listed at registration (`MinerRegistration.features`), as a JSON
  list, e.g. `["plan/1"]`. Plan jobs are routed only to enclaves that list `plan/1`: a worker from before plans can't
  parse `mode: "plan"` and would leave the job to time out. NULL is no features, which is what every enclave registered
  before this revision advertised.
* `standard_jobs.plan`: a Standard plan job's delivered plan, the canonical Plan v1 JSON the receipt's `content_digest`
  covers. The gateway reads it in Standard mode, so it stores it like the prompt: shown to the owner, validators and an
  operator reviewing the job, and cleared when the content is deleted. NULL for every other job and until the plan
  arrives.

Downgrade drops both columns, and with them every enclave's features (until it registers again) and the plans of any
Standard plan job stored since.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("enclaves") as batch:
        batch.add_column(sa.Column("features", sa.Text(), nullable=True))
    with op.batch_alter_table("standard_jobs") as batch:
        batch.add_column(sa.Column("plan", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("standard_jobs") as batch:
        batch.drop_column("plan")
    with op.batch_alter_table("enclaves") as batch:
        batch.drop_column("features")
