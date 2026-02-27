"""add postgres partial index for offered tasks

Revision ID: 0004_add_partial_index_postgres
Revises: 0003_add_dispatch_indexes
Create Date: 2026-02-26
"""

from alembic import op

revision = "0004_add_partial_index_postgres"
down_revision = "0003_add_dispatch_indexes"
branch_labels = None
depends_on = None

def upgrade():
    # Postgres-only: partial index tighter than composite for sweeper hot path.
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute("""
    CREATE INDEX IF NOT EXISTS ix_delivery_tasks_offered_expires_at_partial
    ON delivery_tasks (offer_expires_at)
    WHERE status = 'OFFERED' AND offer_expires_at IS NOT NULL;
    """)

def downgrade():
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute("DROP INDEX IF EXISTS ix_delivery_tasks_offered_expires_at_partial;")
