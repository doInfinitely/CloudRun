from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from packages.db.session import get_db
from packages.db.models import Store, Product

router = APIRouter()


def _product_dict(p: Product) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "price_cents": p.price_cents,
        "category": p.category,
        "image_url": p.image_url,
        "is_available": p.is_available,
        "sort_order": p.sort_order,
    }


def _store_summary(s: Store) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "address": s.address,
        "lat": s.lat,
        "lng": s.lng,
        "product_count": len(s.products),
    }


@router.get("/stores")
def list_stores(db: Session = Depends(get_db)):
    stores = (
        db.query(Store)
        .filter(Store.status == "ACTIVE", Store.accepting_orders.is_(True))
        .all()
    )
    return {"stores": [_store_summary(s) for s in stores]}


@router.get("/stores/{store_id}")
def get_store(store_id: str, db: Session = Depends(get_db)):
    store = db.get(Store, store_id)
    if not store:
        raise HTTPException(404, "store not found")
    products = (
        db.query(Product)
        .filter(Product.store_id == store_id, Product.is_available.is_(True))
        .order_by(Product.sort_order)
        .all()
    )
    return {
        "id": store.id,
        "name": store.name,
        "address": store.address,
        "lat": store.lat,
        "lng": store.lng,
        "hours": store.hours_json,
        "geofence": store.geofence_json,
        "status": store.status,
        "accepting_orders": store.accepting_orders,
        "products": [_product_dict(p) for p in products],
    }
