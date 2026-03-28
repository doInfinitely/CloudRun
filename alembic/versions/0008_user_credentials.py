"""add user_credentials table for auth

Revision ID: 0008_user_credentials
Revises: 0007_mission_control
Create Date: 2026-03-23
"""

from alembic import op
import sqlalchemy as sa

revision = "0008_user_credentials"
down_revision = "0007_mission_control"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_credentials",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_user_credentials_email", "user_credentials", ["email"], unique=True)


def downgrade():
    op.drop_index("ix_user_credentials_email", table_name="user_credentials")
    op.drop_table("user_credentials")
