"""
Seed script for the CloudRun customer demo.

Creates a merchant, two stores, products, a demo customer, and an address.
All inserts are idempotent -- safe to run multiple times.

Usage:
    python -m scripts.seed_customer_demo
"""

from packages.db.session import SessionLocal
from packages.db.models import Merchant, Store, Product, Customer, CustomerAddress


# ---------------------------------------------------------------------------
# Data definitions
# ---------------------------------------------------------------------------

MERCHANT = dict(
    id="merch_demo_001",
    legal_name="Austin Vape Co",
    status="ACTIVE",
)

STORES = [
    dict(
        id="store_downtown",
        merchant_id="merch_demo_001",
        name="CloudRun Downtown",
        address="401 Congress Ave, Austin, TX 78701",
        lat="30.2672",
        lng="-97.7431",
        status="ACTIVE",
        accepting_orders=True,
    ),
    dict(
        id="store_soco",
        merchant_id="merch_demo_001",
        name="CloudRun SoCo",
        address="1600 S Congress Ave, Austin, TX 78704",
        lat="30.2469",
        lng="-97.7494",
        status="ACTIVE",
        accepting_orders=True,
    ),
]

PRODUCTS_DOWNTOWN = [
    dict(
        id="prod_dt_01",
        store_id="store_downtown",
        name="Elf Bar BC5000",
        description="Rechargeable disposable, 5000 puffs",
        category="disposable",
        price_cents=1999,
        is_available=True,
        sort_order=0,
    ),
    dict(
        id="prod_dt_02",
        store_id="store_downtown",
        name="Lost Mary OS5000",
        description="Mesh coil disposable",
        category="disposable",
        price_cents=1799,
        is_available=True,
        sort_order=1,
    ),
    dict(
        id="prod_dt_03",
        store_id="store_downtown",
        name="JUUL Virginia Tobacco Pods (4pk)",
        description="Classic tobacco flavor",
        category="pod",
        price_cents=2199,
        is_available=True,
        sort_order=2,
    ),
    dict(
        id="prod_dt_04",
        store_id="store_downtown",
        name="JUUL Mint Pods (4pk)",
        description="Refreshing mint",
        category="pod",
        price_cents=2199,
        is_available=True,
        sort_order=3,
    ),
    dict(
        id="prod_dt_05",
        store_id="store_downtown",
        name="Naked 100 Lava Flow",
        description="Strawberry pineapple coconut 60ml",
        category="juice",
        price_cents=2499,
        is_available=True,
        sort_order=4,
    ),
    dict(
        id="prod_dt_06",
        store_id="store_downtown",
        name="Juice Head Watermelon Lime",
        description="Fruity blend 100ml",
        category="juice",
        price_cents=2799,
        is_available=True,
        sort_order=5,
    ),
    dict(
        id="prod_dt_07",
        store_id="store_downtown",
        name="Uwell Caliburn G3 Kit",
        description="Pod system starter kit",
        category="accessory",
        price_cents=3499,
        is_available=True,
        sort_order=6,
    ),
    dict(
        id="prod_dt_08",
        store_id="store_downtown",
        name="Replacement Coils 4-pack",
        description="Compatible with Caliburn G3",
        category="accessory",
        price_cents=1299,
        is_available=True,
        sort_order=7,
    ),
]

PRODUCTS_SOCO = [
    dict(
        id="prod_sc_01",
        store_id="store_soco",
        name="Elf Bar BC5000",
        description="Rechargeable disposable, 5000 puffs",
        category="disposable",
        price_cents=1999,
        is_available=True,
        sort_order=0,
    ),
    dict(
        id="prod_sc_02",
        store_id="store_soco",
        name="Flum Float 3000",
        description="Compact disposable, 3000 puffs",
        category="disposable",
        price_cents=1299,
        is_available=True,
        sort_order=1,
    ),
    dict(
        id="prod_sc_03",
        store_id="store_soco",
        name="VUSE Alto Pods Rich Tobacco (2pk)",
        description="Bold tobacco",
        category="pod",
        price_cents=1599,
        is_available=True,
        sort_order=2,
    ),
    dict(
        id="prod_sc_04",
        store_id="store_soco",
        name="VUSE Alto Pods Menthol (2pk)",
        description="Cool menthol",
        category="pod",
        price_cents=1599,
        is_available=True,
        sort_order=3,
    ),
    dict(
        id="prod_sc_05",
        store_id="store_soco",
        name="Sadboy Shamrock Cookie",
        description="Mint cookie 100ml",
        category="juice",
        price_cents=2699,
        is_available=True,
        sort_order=4,
    ),
    dict(
        id="prod_sc_06",
        store_id="store_soco",
        name="Coastal Clouds Blood Orange Mango",
        description="Tropical citrus 60ml",
        category="juice",
        price_cents=2499,
        is_available=True,
        sort_order=5,
    ),
    dict(
        id="prod_sc_07",
        store_id="store_soco",
        name="SMOK Nord 5 Kit",
        description="Versatile pod mod",
        category="accessory",
        price_cents=3999,
        is_available=True,
        sort_order=6,
    ),
    dict(
        id="prod_sc_08",
        store_id="store_soco",
        name="18650 Battery Charger",
        description="Dual-bay USB charger",
        category="accessory",
        price_cents=1499,
        is_available=True,
        sort_order=7,
    ),
]

CUSTOMER = dict(
    id="cust_demo_001",
    name="Alex Demo",
    phone="+15125551234",
    email="alex@example.com",
    status="ACTIVE",
)

ADDRESS = dict(
    id="addr_demo_001",
    customer_id="cust_demo_001",
    address="1100 S Lamar Blvd, Austin, TX 78704",
    lat="30.2555",
    lng="-97.7580",
    deliverable_flag=True,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def upsert(db, model_cls, data: dict):
    """Insert a row if its primary key does not yet exist; otherwise skip."""
    pk = data["id"] if "id" in data else None
    if pk is None:
        raise ValueError("All seed records must have an 'id' field")
    existing = db.get(model_cls, pk)
    if existing is None:
        obj = model_cls(**data)
        db.add(obj)
        return "created", obj
    return "exists", existing


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def seed():
    db = SessionLocal()
    try:
        # Merchant
        action, _ = upsert(db, Merchant, MERCHANT)
        print(f"  Merchant {MERCHANT['id']}: {action}")

        # Stores
        for store_data in STORES:
            action, _ = upsert(db, Store, store_data)
            print(f"  Store {store_data['id']}: {action}")

        # Products
        all_products = PRODUCTS_DOWNTOWN + PRODUCTS_SOCO
        for prod_data in all_products:
            action, _ = upsert(db, Product, prod_data)
            print(f"  Product {prod_data['id']}: {action}")

        # Customer
        action, _ = upsert(db, Customer, CUSTOMER)
        print(f"  Customer {CUSTOMER['id']}: {action}")

        # Address
        action, _ = upsert(db, CustomerAddress, ADDRESS)
        print(f"  Address {ADDRESS['id']}: {action}")

        db.commit()
        print("\nSeed complete.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding customer demo data ...\n")
    seed()
