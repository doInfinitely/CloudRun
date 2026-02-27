"""init

Revision ID: 0001_init
Revises: 
Create Date: 2026-02-26

"""

from alembic import op
import sqlalchemy as sa

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "merchants",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("legal_name", sa.String(), nullable=False),
        sa.Column("ein", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "stores",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("merchant_id", sa.String(), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("lat", sa.String(), nullable=True),
        sa.Column("lng", sa.String(), nullable=True),
        sa.Column("hours_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("geofence_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "customers",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "customer_addresses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("customer_id", sa.String(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("lat", sa.String(), nullable=True),
        sa.Column("lng", sa.String(), nullable=True),
        sa.Column("deliverable_flag", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "customer_age_verifications",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("customer_id", sa.String(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("vendor", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("proof_ref", sa.String(), nullable=True),
        sa.Column("reason_code", sa.String(), nullable=True),
        sa.Column("dob_year", sa.Integer(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_customer_age_verif_latest", "customer_age_verifications", ["customer_id", sa.text("created_at DESC")])
    op.create_table(
        "orders",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("customer_id", sa.String(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("store_id", sa.String(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("address_id", sa.String(), sa.ForeignKey("customer_addresses.id"), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="CREATED"),
        sa.Column("disclosure_version", sa.String(), nullable=False),
        sa.Column("subtotal_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tax_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fees_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tip_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payment_status", sa.String(), nullable=False, server_default="UNPAID"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "delivery_tasks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("order_id", sa.String(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("driver_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="UNASSIGNED"),
        sa.Column("offered_to_driver_id", sa.String(), nullable=True),
        sa.Column("offer_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("route_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "idempotency_keys",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("route", sa.String(), nullable=False),
        sa.Column("request_hash", sa.String(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("response_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "order_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("order_id", sa.String(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("actor_type", sa.String(), nullable=False),
        sa.Column("actor_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("hash_prev", sa.String(), nullable=True),
        sa.Column("hash_self", sa.String(), nullable=False),
    )
    op.create_index("idx_order_events_order_ts", "order_events", ["order_id", "ts"])

def downgrade():
    op.drop_index("idx_order_events_order_ts", table_name="order_events")
    op.drop_table("order_events")
    op.drop_table("delivery_tasks")
    op.drop_table("idempotency_keys")
    op.drop_table("orders")
    op.drop_index("idx_customer_age_verif_latest", table_name="customer_age_verifications")
    op.drop_table("customer_age_verifications")
    op.drop_table("customer_addresses")
    op.drop_table("customers")
    op.drop_table("stores")
    op.drop_table("merchants")
