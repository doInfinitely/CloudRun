from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from packages.db.session import get_db
from packages.db.models import Customer, CustomerAddress, Order, Store

router = APIRouter()


# -- Pydantic schemas --------------------------------------------------------

class CustomerUpsert(BaseModel):
    id: str
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class AddressCreate(BaseModel):
    address: str
    lat: Optional[str] = None
    lng: Optional[str] = None


# -- Helpers ------------------------------------------------------------------

def _customer_dict(c: Customer) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "status": c.status,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _address_dict(a: CustomerAddress) -> dict:
    return {
        "id": a.id,
        "customer_id": a.customer_id,
        "address": a.address,
        "lat": a.lat,
        "lng": a.lng,
        "deliverable_flag": a.deliverable_flag,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _order_dict(o: Order, store_name: str | None) -> dict:
    return {
        "id": o.id,
        "customer_id": o.customer_id,
        "store_id": o.store_id,
        "store_name": store_name,
        "address_id": o.address_id,
        "status": o.status,
        "subtotal_cents": o.subtotal_cents,
        "tax_cents": o.tax_cents,
        "fees_cents": o.fees_cents,
        "tip_cents": o.tip_cents,
        "total_cents": o.total_cents,
        "items_json": o.items_json,
        "payment_status": o.payment_status,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _require_customer(customer_id: str, db: Session) -> Customer:
    c = db.get(Customer, customer_id)
    if not c:
        raise HTTPException(404, "customer not found")
    return c


# -- Endpoints ----------------------------------------------------------------

@router.post("/customers")
def upsert_customer(body: CustomerUpsert, db: Session = Depends(get_db)):
    c = db.get(Customer, body.id)
    if c:
        if body.name is not None:
            c.name = body.name
        if body.phone is not None:
            c.phone = body.phone
        if body.email is not None:
            c.email = body.email
        db.commit()
    else:
        c = Customer(
            id=body.id,
            name=body.name,
            phone=body.phone,
            email=body.email,
        )
        db.add(c)
        db.commit()
    return _customer_dict(c)


@router.get("/customers/{customer_id}")
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    c = _require_customer(customer_id, db)
    return _customer_dict(c)


@router.post("/customers/{customer_id}/addresses")
def add_address(customer_id: str, body: AddressCreate, db: Session = Depends(get_db)):
    _require_customer(customer_id, db)
    a = CustomerAddress(
        id=f"addr_{uuid.uuid4().hex}",
        customer_id=customer_id,
        address=body.address,
        lat=body.lat,
        lng=body.lng,
    )
    db.add(a)
    db.commit()
    return _address_dict(a)


@router.get("/customers/{customer_id}/addresses")
def list_addresses(customer_id: str, db: Session = Depends(get_db)):
    _require_customer(customer_id, db)
    addresses = (
        db.query(CustomerAddress)
        .filter(CustomerAddress.customer_id == customer_id)
        .all()
    )
    return {"addresses": [_address_dict(a) for a in addresses]}


@router.get("/customers/{customer_id}/orders")
def list_orders(customer_id: str, db: Session = Depends(get_db)):
    _require_customer(customer_id, db)
    rows = (
        db.query(Order, Store.name)
        .outerjoin(Store, Order.store_id == Store.id)
        .filter(Order.customer_id == customer_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return {"orders": [_order_dict(o, store_name) for o, store_name in rows]}
