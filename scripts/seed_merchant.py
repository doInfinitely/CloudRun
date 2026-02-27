"""
Seed script for the CloudRun merchant demo.

Uses the same merchant/store/product data as seed_customer_demo.
This is a convenience wrapper that only seeds merchant-side data.

Usage:
    python -m scripts.seed_merchant
"""

from scripts.seed_customer_demo import seed

if __name__ == "__main__":
    print("Seeding merchant demo data ...\n")
    seed()
