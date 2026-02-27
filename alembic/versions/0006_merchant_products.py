"""add products table, store accepting_orders, order items_json

Revision ID: 0006_merchant_products
Revises: 0005_driver_profile_vehicles_docs
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_merchant_products"
down_revision = "0005_driver_profile_vehicles_docs"
branch_labels = None
depends_on = None

def upgrade():
    # Create products table
    op.create_table(
        "products",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("store_id", sa.String(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("image_url", sa.String(), nullable=True),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_products_store_id", "products", ["store_id"])

    # Add accepting_orders to stores
    op.add_column("stores", sa.Column("accepting_orders", sa.Boolean(), nullable=False, server_default="true"))

    # Add items_json to orders
    op.add_column("orders", sa.Column("items_json", sa.JSON(), nullable=True))

def downgrade():
    op.drop_column("orders", "items_json")
    op.drop_column("stores", "accepting_orders")
    op.drop_index("ix_products_store_id", "products")
    op.drop_table("products")
