"""add drivers and offer logs

Revision ID: 0002_add_drivers_offer_logs
Revises: 0001_init
Create Date: 2026-02-26
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_add_drivers_offer_logs"
down_revision = "0001_init"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "drivers",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("status", sa.String(), nullable=False, server_default="OFFLINE"),
        sa.Column("lat", sa.String(), nullable=True),
        sa.Column("lng", sa.String(), nullable=True),
        sa.Column("node_id", sa.String(), nullable=True),
        sa.Column("zone_id", sa.String(), nullable=True),
        sa.Column("insurance_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("registration_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("vehicle_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("background_clear", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("training_flags_json", sa.JSON(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("metrics_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "offer_logs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("task_id", sa.String(), nullable=False),
        sa.Column("order_id", sa.String(), nullable=False),
        sa.Column("driver_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("features_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("outcome", sa.String(), nullable=True),
        sa.Column("outcome_ms", sa.Integer(), nullable=True),
        sa.Column("response_latency_ms", sa.Integer(), nullable=True),
    )

def downgrade():
    op.drop_table("offer_logs")
    op.drop_table("drivers")
