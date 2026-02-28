"""add mission control tables: admin_users, support_tickets, ticket_messages + merchant columns

Revision ID: 0007_mission_control
Revises: 0006_merchant_products
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_mission_control"
down_revision = "0006_merchant_products"
branch_labels = None
depends_on = None

def upgrade():
    # Add columns to merchants
    op.add_column("merchants", sa.Column("contact_email", sa.String(), nullable=True))
    op.add_column("merchants", sa.Column("contact_phone", sa.String(), nullable=True))
    op.add_column("merchants", sa.Column("business_type", sa.String(), nullable=True))
    op.add_column("merchants", sa.Column("application_notes", sa.Text(), nullable=True))
    op.add_column("merchants", sa.Column("reviewed_by", sa.String(), nullable=True))
    op.add_column("merchants", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))

    # Create admin_users table
    op.create_table(
        "admin_users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=False, server_default="admin"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Create support_tickets table
    op.create_table(
        "support_tickets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("requester_type", sa.String(), nullable=False),
        sa.Column("requester_id", sa.String(), nullable=False),
        sa.Column("order_id", sa.String(), sa.ForeignKey("orders.id"), nullable=True),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="OPEN"),
        sa.Column("priority", sa.String(), nullable=False, server_default="MEDIUM"),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("assigned_to", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_support_tickets_status", "support_tickets", ["status"])
    op.create_index("ix_support_tickets_requester", "support_tickets", ["requester_type", "requester_id"])

    # Create ticket_messages table
    op.create_table(
        "ticket_messages",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("ticket_id", sa.String(), sa.ForeignKey("support_tickets.id"), nullable=False),
        sa.Column("sender_type", sa.String(), nullable=False),
        sa.Column("sender_id", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ticket_messages_ticket_id", "ticket_messages", ["ticket_id"])

def downgrade():
    op.drop_index("ix_ticket_messages_ticket_id", "ticket_messages")
    op.drop_table("ticket_messages")
    op.drop_index("ix_support_tickets_requester", "support_tickets")
    op.drop_index("ix_support_tickets_status", "support_tickets")
    op.drop_table("support_tickets")
    op.drop_table("admin_users")
    op.drop_column("merchants", "reviewed_at")
    op.drop_column("merchants", "reviewed_by")
    op.drop_column("merchants", "application_notes")
    op.drop_column("merchants", "business_type")
    op.drop_column("merchants", "contact_phone")
    op.drop_column("merchants", "contact_email")
