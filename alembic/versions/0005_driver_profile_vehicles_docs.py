"""add driver profile fields, vehicles, and documents tables

Revision ID: 0005_profile_vehicles_docs
Revises: 0004_add_partial_index_postgres
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_profile_vehicles_docs"
down_revision = "0004_add_partial_index_postgres"
branch_labels = None
depends_on = None

def upgrade():
    # Add profile columns to drivers
    op.add_column("drivers", sa.Column("name", sa.String(), nullable=True))
    op.add_column("drivers", sa.Column("email", sa.String(), nullable=True))
    op.add_column("drivers", sa.Column("phone", sa.String(), nullable=True))
    op.add_column("drivers", sa.Column("photo_url", sa.String(), nullable=True))

    # Create driver_vehicles table
    op.create_table(
        "driver_vehicles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("driver_id", sa.String(), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("make", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("license_plate", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Create driver_documents table
    op.create_table(
        "driver_documents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("driver_id", sa.String(), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("vehicle_id", sa.String(), sa.ForeignKey("driver_vehicles.id"), nullable=True),
        sa.Column("doc_type", sa.String(), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="PENDING"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

def downgrade():
    op.drop_table("driver_documents")
    op.drop_table("driver_vehicles")
    op.drop_column("drivers", "photo_url")
    op.drop_column("drivers", "phone")
    op.drop_column("drivers", "email")
    op.drop_column("drivers", "name")
