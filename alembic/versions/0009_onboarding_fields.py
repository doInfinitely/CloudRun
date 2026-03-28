"""add onboarding and stripe connect fields

Revision ID: 0009_onboarding_fields
Revises: 0008_user_credentials
Create Date: 2026-03-23
"""

from alembic import op
import sqlalchemy as sa

revision = "0009_onboarding_fields"
down_revision = "0008_user_credentials"
branch_labels = None
depends_on = None


def upgrade():
    # Customer
    op.add_column("customers", sa.Column("onboarding_complete", sa.Boolean(), nullable=False, server_default="false"))

    # Driver
    op.add_column("drivers", sa.Column("onboarding_complete", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("drivers", sa.Column("stripe_account_id", sa.String(), nullable=True))
    op.add_column("drivers", sa.Column("stripe_onboarding_complete", sa.Boolean(), nullable=False, server_default="false"))

    # Merchant
    op.add_column("merchants", sa.Column("onboarding_complete", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("merchants", sa.Column("contact_name", sa.String(), nullable=True))
    op.add_column("merchants", sa.Column("stripe_account_id", sa.String(), nullable=True))
    op.add_column("merchants", sa.Column("stripe_onboarding_complete", sa.Boolean(), nullable=False, server_default="false"))


def downgrade():
    op.drop_column("merchants", "stripe_onboarding_complete")
    op.drop_column("merchants", "stripe_account_id")
    op.drop_column("merchants", "contact_name")
    op.drop_column("merchants", "onboarding_complete")

    op.drop_column("drivers", "stripe_onboarding_complete")
    op.drop_column("drivers", "stripe_account_id")
    op.drop_column("drivers", "onboarding_complete")

    op.drop_column("customers", "onboarding_complete")
