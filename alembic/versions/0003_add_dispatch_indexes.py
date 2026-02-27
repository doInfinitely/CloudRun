"""add dispatch indexes

Revision ID: 0003_add_dispatch_indexes
Revises: 0002_add_drivers_offer_logs
Create Date: 2026-02-26
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_add_dispatch_indexes"
down_revision = "0002_add_drivers_offer_logs"
branch_labels = None
depends_on = None

def upgrade():
    # Speed up expiry sweeper: WHERE status='OFFERED' AND offer_expires_at < now
    op.create_index(
        "ix_delivery_tasks_status_offer_expires_at",
        "delivery_tasks",
        ["status", "offer_expires_at"],
        unique=False,
    )

    # Speed up outcome updates/lookups
    op.create_index(
        "ix_offer_logs_task_id_created_at",
        "offer_logs",
        ["task_id", "created_at"],
        unique=False,
    )

def downgrade():
    op.drop_index("ix_offer_logs_task_id_created_at", table_name="offer_logs")
    op.drop_index("ix_delivery_tasks_status_offer_expires_at", table_name="delivery_tasks")
