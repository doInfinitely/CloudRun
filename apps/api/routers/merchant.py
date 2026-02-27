from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from packages.db.session import get_db
from packages.db.models import Merchant, Store, Order, Product, OrderEvent, DeliveryTask, Driver
from packages.core.enums import OrderStatus
from packages.core.state_machine import OrderStateMachine
from packages.dossier.writer import emit_order_event
from apps.api.schemas import ProductCreate, ProductUpdate, StoreUpdate, MerchantOrderAction

router = APIRouter(prefix="/merchants")


# ── helpers ──────────────────────────────────────────────────────────

def _get_merchant(db: Session, mid: str) -> Merchant:
    m = db.get(Merchant, mid)
    if not m:
        raise HTTPException(404, "merchant not found")
    return m

def _get_store(db: Session, mid: str, sid: str) -> Store:
    _get_merchant(db, mid)
    s = db.get(Store, sid)
    if not s or s.merchant_id != mid:
        raise HTTPException(404, "store not found")
    return s

def _get_order(db: Session, mid: str, sid: str, oid: str) -> Order:
    _get_store(db, mid, sid)
    o = db.get(Order, oid)
    if not o or o.store_id != sid:
        raise HTTPException(404, "order not found")
    return o

def _transition(db: Session, order: Order, to: OrderStatus, *, actor_type="merchant", actor_id="merchant", event_type="ORDER_STATUS_UPDATED"):
    sm = OrderStateMachine(OrderStatus(order.status))
    sm2 = sm.transition(to)
    order.status = sm2.status.value
    db.add(order)
    emit_order_event(db, order_id=order.id, actor_type=actor_type, actor_id=actor_id, event_type=event_type, payload={"to": sm2.status.value})


# ── Dashboard ────────────────────────────────────────────────────────

@router.get("/{mid}/dashboard")
def dashboard(mid: str, db: Session = Depends(get_db)):
    _get_merchant(db, mid)
    stores = db.query(Store).filter(Store.merchant_id == mid).all()
    store_ids = [s.id for s in stores]
    if not store_ids:
        return {"today_orders": 0, "today_revenue": 0, "pending": 0, "active": 0, "completed": 0, "recent": []}

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    base = db.query(Order).filter(Order.store_id.in_(store_ids))
    today_orders = base.filter(Order.created_at >= today_start).all()

    pending = sum(1 for o in today_orders if o.status == OrderStatus.PENDING_MERCHANT.value)
    active_statuses = {OrderStatus.MERCHANT_ACCEPTED.value, OrderStatus.DISPATCHING.value, OrderStatus.PICKUP.value, OrderStatus.EN_ROUTE.value, OrderStatus.DOORSTEP_VERIFY.value}
    active = sum(1 for o in today_orders if o.status in active_statuses)
    completed = sum(1 for o in today_orders if o.status == OrderStatus.DELIVERED.value)
    revenue = sum(o.total_cents for o in today_orders if o.status == OrderStatus.DELIVERED.value)

    recent = base.order_by(Order.created_at.desc()).limit(20).all()
    recent_list = [
        {"id": o.id, "status": o.status, "total_cents": o.total_cents, "created_at": o.created_at.isoformat() if o.created_at else None}
        for o in recent
    ]

    return {
        "today_orders": len(today_orders),
        "today_revenue": revenue,
        "pending": pending,
        "active": active,
        "completed": completed,
        "recent": recent_list,
    }


# ── Stores ───────────────────────────────────────────────────────────

@router.get("/{mid}/stores")
def list_stores(mid: str, db: Session = Depends(get_db)):
    _get_merchant(db, mid)
    stores = db.query(Store).filter(Store.merchant_id == mid).all()
    return [
        {"id": s.id, "name": s.name, "address": s.address, "accepting_orders": s.accepting_orders, "hours_json": s.hours_json, "status": s.status}
        for s in stores
    ]

@router.get("/{mid}/stores/{sid}")
def get_store(mid: str, sid: str, db: Session = Depends(get_db)):
    s = _get_store(db, mid, sid)
    return {"id": s.id, "name": s.name, "address": s.address, "accepting_orders": s.accepting_orders, "hours_json": s.hours_json, "status": s.status, "lat": s.lat, "lng": s.lng}

@router.put("/{mid}/stores/{sid}")
def update_store(mid: str, sid: str, body: StoreUpdate, db: Session = Depends(get_db)):
    s = _get_store(db, mid, sid)
    if body.accepting_orders is not None:
        s.accepting_orders = body.accepting_orders
    if body.hours_json is not None:
        s.hours_json = body.hours_json
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "name": s.name, "accepting_orders": s.accepting_orders, "hours_json": s.hours_json}


# ── Orders ───────────────────────────────────────────────────────────

@router.get("/{mid}/stores/{sid}/orders")
def list_orders(mid: str, sid: str, status: str | None = Query(default=None), limit: int = Query(default=50, le=200), offset: int = Query(default=0), db: Session = Depends(get_db)):
    _get_store(db, mid, sid)
    q = db.query(Order).filter(Order.store_id == sid)
    if status:
        q = q.filter(Order.status == status)
    total = q.count()
    orders = q.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "orders": [
            {"id": o.id, "status": o.status, "total_cents": o.total_cents, "items_json": o.items_json, "created_at": o.created_at.isoformat() if o.created_at else None}
            for o in orders
        ],
    }

@router.get("/{mid}/stores/{sid}/orders/{oid}")
def get_order(mid: str, sid: str, oid: str, db: Session = Depends(get_db)):
    o = _get_order(db, mid, sid, oid)
    # Get delivery task + driver info
    task = db.query(DeliveryTask).filter(DeliveryTask.order_id == oid).first()
    driver_info = None
    if task and task.driver_id:
        drv = db.get(Driver, task.driver_id)
        if drv:
            driver_info = {"id": drv.id, "name": drv.name, "phone": drv.phone, "status": drv.status}

    return {
        "id": o.id,
        "customer_id": o.customer_id,
        "store_id": o.store_id,
        "status": o.status,
        "items_json": o.items_json,
        "subtotal_cents": o.subtotal_cents,
        "tax_cents": o.tax_cents,
        "fees_cents": o.fees_cents,
        "tip_cents": o.tip_cents,
        "total_cents": o.total_cents,
        "payment_status": o.payment_status,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "delivery_task": {
            "id": task.id,
            "status": task.status,
            "driver_id": task.driver_id,
        } if task else None,
        "driver": driver_info,
    }

@router.post("/{mid}/stores/{sid}/orders/{oid}/action")
def order_action(mid: str, sid: str, oid: str, body: MerchantOrderAction, db: Session = Depends(get_db)):
    o = _get_order(db, mid, sid, oid)
    if body.action == "accept":
        if o.status != OrderStatus.PENDING_MERCHANT.value:
            raise HTTPException(409, f"order not in PENDING_MERCHANT (is {o.status})")
        _transition(db, o, OrderStatus.MERCHANT_ACCEPTED, actor_id=mid)
        db.commit()
        return {"order_id": o.id, "status": o.status}
    elif body.action == "reject":
        if o.status != OrderStatus.PENDING_MERCHANT.value:
            raise HTTPException(409, f"order not in PENDING_MERCHANT (is {o.status})")
        _transition(db, o, OrderStatus.CANCELED, actor_id=mid, event_type="ORDER_REJECTED_BY_MERCHANT")
        db.commit()
        return {"order_id": o.id, "status": o.status}
    else:
        raise HTTPException(400, "action must be 'accept' or 'reject'")


# ── Products ─────────────────────────────────────────────────────────

@router.get("/{mid}/stores/{sid}/products")
def list_products(mid: str, sid: str, db: Session = Depends(get_db)):
    _get_store(db, mid, sid)
    products = db.query(Product).filter(Product.store_id == sid).order_by(Product.sort_order, Product.name).all()
    return [
        {"id": p.id, "name": p.name, "description": p.description, "price_cents": p.price_cents, "category": p.category, "image_url": p.image_url, "is_available": p.is_available, "sort_order": p.sort_order}
        for p in products
    ]

@router.post("/{mid}/stores/{sid}/products", status_code=201)
def create_product(mid: str, sid: str, body: ProductCreate, db: Session = Depends(get_db)):
    _get_store(db, mid, sid)
    pid = f"prod_{uuid.uuid4().hex[:12]}"
    p = Product(
        id=pid,
        store_id=sid,
        name=body.name,
        description=body.description,
        price_cents=body.price_cents,
        category=body.category,
        image_url=body.image_url,
        is_available=body.is_available,
        sort_order=body.sort_order,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "name": p.name, "description": p.description, "price_cents": p.price_cents, "category": p.category, "is_available": p.is_available, "sort_order": p.sort_order}

@router.put("/{mid}/stores/{sid}/products/{pid}")
def update_product(mid: str, sid: str, pid: str, body: ProductUpdate, db: Session = Depends(get_db)):
    _get_store(db, mid, sid)
    p = db.get(Product, pid)
    if not p or p.store_id != sid:
        raise HTTPException(404, "product not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(p, field, val)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "name": p.name, "description": p.description, "price_cents": p.price_cents, "category": p.category, "is_available": p.is_available, "sort_order": p.sort_order}

@router.delete("/{mid}/stores/{sid}/products/{pid}")
def delete_product(mid: str, sid: str, pid: str, db: Session = Depends(get_db)):
    _get_store(db, mid, sid)
    p = db.get(Product, pid)
    if not p or p.store_id != sid:
        raise HTTPException(404, "product not found")
    db.delete(p)
    db.commit()
    return {"deleted": True}
