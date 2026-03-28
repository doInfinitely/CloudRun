"""building cache table for shared Overpass data

Revision ID: 0010_building_cache
Revises: 0009_onboarding_fields
Create Date: 2026-03-27
"""

from alembic import op
import sqlalchemy as sa

revision = "0010_building_cache"
down_revision = "0009_onboarding_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "building_cache",
        sa.Column("grid_key", sa.String(), primary_key=True),
        sa.Column("data_json", sa.JSON(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("building_cache")
