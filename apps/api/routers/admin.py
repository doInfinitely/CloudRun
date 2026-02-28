from __future__ import annotations
import csv
import io
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from packages.db.session import get_db
from packages.db.models import (
    Order, Store, Merchant, Customer, CustomerAddress, CustomerAgeVerification,
    Driver, DriverVehicle, DriverDocument, DeliveryTask, OrderEvent, OfferLog,
    SupportTicket, TicketMessage,
)
from packages.core.enums import OrderStatus
from packages.core.state_machine import OrderStateMachine
from packages.dossier.writer import emit_order_event
from apps.api.schemas import (
    MerchantApplication, MerchantReview, MerchantCreate,
    TicketUpdate, TicketMessageCreate, AdminOrderAction, DriverDocumentReview,
)

router = APIRouter(prefix="/admin")

ADMIN_ID = "admin_001"


# ── helpers ──────────────────────────────────────────────────────────

def _iso(dt):
    return dt.isoformat() if dt else None


# ── Dashboard ────────────────────────────────────────────────────────

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    active_statuses = {
        OrderStatus.PENDING_MERCHANT.value, OrderStatus.MERCHANT_ACCEPTED.value,
        OrderStatus.DISPATCHING.value, OrderStatus.PICKUP.value,
        OrderStatus.EN_ROUTE.value, OrderStatus.DOORSTEP_VERIFY.value,
    }

    orders_today = db.query(Order).filter(Order.created_at >= today_start).all()
    active_orders = sum(1 for o in orders_today if o.status in active_statuses)
    today_revenue = sum(o.total_cents for o in orders_today if o.status == OrderStatus.DELIVERED.value)

    active_drivers = db.query(Driver).filter(Driver.status.in_(["IDLE", "ON_TASK"])).count()
    total_merchants = db.query(Merchant).count()
    pending_tickets = db.query(SupportTicket).filter(SupportTicket.status.in_(["OPEN", "IN_PROGRESS"])).count()

    # Hourly volume for today
    hourly = []
    for h in range(24):
        h_start = today_start + timedelta(hours=h)
        h_end = h_start + timedelta(hours=1)
        if h_start > now:
            break
        cnt = sum(1 for o in orders_today if o.created_at and h_start <= o.created_at.replace(tzinfo=timezone.utc if o.created_at.tzinfo is None else o.created_at.tzinfo) < h_end)
        hourly.append({"hour": h, "orders": cnt})

    # Recent events
    recent_events = (
        db.query(OrderEvent)
        .order_by(OrderEvent.ts.desc())
        .limit(20)
        .all()
    )

    return {
        "total_orders_today": len(orders_today),
        "active_orders": active_orders,
        "today_revenue": today_revenue,
        "active_drivers": active_drivers,
        "total_merchants": total_merchants,
        "pending_tickets": pending_tickets,
        "hourly_volume": hourly,
        "recent_events": [
            {
                "id": e.id,
                "order_id": e.order_id,
                "event_type": e.event_type,
                "actor_type": e.actor_type,
                "ts": _iso(e.ts),
            }
            for e in recent_events
        ],
    }


# ── Orders ───────────────────────────────────────────────────────────

@router.get("/orders")
def list_orders(
    status: str | None = Query(default=None),
    merchant_id: str | None = Query(default=None),
    driver_id: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    q = db.query(Order)
    if status:
        q = q.filter(Order.status == status)
    if merchant_id:
        store_ids = [s.id for s in db.query(Store).filter(Store.merchant_id == merchant_id).all()]
        q = q.filter(Order.store_id.in_(store_ids)) if store_ids else q.filter(False)
    if driver_id:
        task_order_ids = [t.order_id for t in db.query(DeliveryTask).filter(DeliveryTask.driver_id == driver_id).all()]
        q = q.filter(Order.id.in_(task_order_ids)) if task_order_ids else q.filter(False)
    total = q.count()
    orders = q.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for o in orders:
        store = db.get(Store, o.store_id)
        results.append({
            "id": o.id,
            "customer_id": o.customer_id,
            "store_id": o.store_id,
            "store_name": store.name if store else None,
            "status": o.status,
            "total_cents": o.total_cents,
            "payment_status": o.payment_status,
            "created_at": _iso(o.created_at),
        })
    return {"total": total, "orders": results}


@router.get("/orders/{order_id}")
def get_order(order_id: str, db: Session = Depends(get_db)):
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "order not found")

    store = db.get(Store, o.store_id)
    customer = db.get(Customer, o.customer_id)
    task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order_id).first()
    driver = db.get(Driver, task.driver_id) if task and task.driver_id else None

    events = (
        db.query(OrderEvent)
        .filter(OrderEvent.order_id == order_id)
        .order_by(OrderEvent.ts.asc())
        .all()
    )

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
        "created_at": _iso(o.created_at),
        "store": {"id": store.id, "name": store.name, "address": store.address} if store else None,
        "customer": {"id": customer.id, "name": customer.name, "email": customer.email, "phone": customer.phone} if customer else None,
        "delivery_task": {
            "id": task.id,
            "status": task.status,
            "driver_id": task.driver_id,
        } if task else None,
        "driver": {"id": driver.id, "name": driver.name, "phone": driver.phone, "status": driver.status} if driver else None,
        "events": [
            {"id": e.id, "event_type": e.event_type, "actor_type": e.actor_type, "actor_id": e.actor_id, "payload": e.payload, "ts": _iso(e.ts)}
            for e in events
        ],
    }


@router.post("/orders/{order_id}/action")
def order_action(order_id: str, body: AdminOrderAction, db: Session = Depends(get_db)):
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "order not found")

    if body.action == "cancel":
        sm = OrderStateMachine(OrderStatus(o.status))
        sm2 = sm.transition(OrderStatus.CANCELED)
        o.status = sm2.status.value
        emit_order_event(db, order_id=o.id, actor_type="admin", actor_id=ADMIN_ID,
                         event_type="ORDER_CANCELED_BY_ADMIN", payload={})
        db.commit()
        return {"order_id": o.id, "status": o.status}
    elif body.action == "reassign":
        if not body.driver_id:
            raise HTTPException(400, "driver_id required for reassign")
        task = db.query(DeliveryTask).filter(DeliveryTask.order_id == order_id).first()
        if not task:
            raise HTTPException(404, "no delivery task for this order")
        task.driver_id = body.driver_id
        task.status = "ACCEPTED"
        emit_order_event(db, order_id=o.id, actor_type="admin", actor_id=ADMIN_ID,
                         event_type="DRIVER_REASSIGNED", payload={"driver_id": body.driver_id})
        db.commit()
        return {"order_id": o.id, "task_id": task.id, "driver_id": task.driver_id}
    else:
        raise HTTPException(400, "action must be 'cancel' or 'reassign'")


# ── Merchants ────────────────────────────────────────────────────────

@router.get("/merchants")
def list_merchants(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    q = db.query(Merchant)
    if status:
        q = q.filter(Merchant.status == status)
    total = q.count()
    merchants = q.order_by(Merchant.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "merchants": [
            {
                "id": m.id,
                "legal_name": m.legal_name,
                "status": m.status,
                "contact_email": m.contact_email,
                "business_type": m.business_type,
                "created_at": _iso(m.created_at),
            }
            for m in merchants
        ],
    }


@router.get("/merchants/{mid}")
def get_merchant(mid: str, db: Session = Depends(get_db)):
    m = db.get(Merchant, mid)
    if not m:
        raise HTTPException(404, "merchant not found")

    stores = db.query(Store).filter(Store.merchant_id == mid).all()
    store_ids = [s.id for s in stores]

    order_count = 0
    revenue = 0
    if store_ids:
        orders = db.query(Order).filter(Order.store_id.in_(store_ids)).all()
        order_count = len(orders)
        revenue = sum(o.total_cents for o in orders if o.status == OrderStatus.DELIVERED.value)

    product_count = 0
    for s in stores:
        product_count += len(s.products) if s.products else 0

    return {
        "id": m.id,
        "legal_name": m.legal_name,
        "ein": m.ein,
        "status": m.status,
        "contact_email": m.contact_email,
        "contact_phone": m.contact_phone,
        "business_type": m.business_type,
        "application_notes": m.application_notes,
        "reviewed_by": m.reviewed_by,
        "reviewed_at": _iso(m.reviewed_at),
        "created_at": _iso(m.created_at),
        "stores": [{"id": s.id, "name": s.name, "address": s.address, "status": s.status} for s in stores],
        "order_count": order_count,
        "total_revenue": revenue,
        "product_count": product_count,
    }


@router.post("/merchants", status_code=201)
def create_merchant(body: MerchantCreate, db: Session = Depends(get_db)):
    mid = f"merch_{uuid.uuid4().hex[:12]}"
    m = Merchant(
        id=mid,
        legal_name=body.legal_name,
        ein=body.ein,
        contact_email=body.contact_email,
        contact_phone=body.contact_phone,
        business_type=body.business_type,
        status="ACTIVE",
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"id": m.id, "legal_name": m.legal_name, "status": m.status}


@router.post("/merchants/apply", status_code=201)
def merchant_apply(body: MerchantApplication, db: Session = Depends(get_db)):
    mid = f"merch_{uuid.uuid4().hex[:12]}"
    m = Merchant(
        id=mid,
        legal_name=body.legal_name,
        ein=body.ein,
        contact_email=body.contact_email,
        contact_phone=body.contact_phone,
        business_type=body.business_type,
        application_notes=body.application_notes,
        status="PENDING",
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"id": m.id, "legal_name": m.legal_name, "status": m.status}


@router.post("/merchants/{mid}/review")
def review_merchant(mid: str, body: MerchantReview, db: Session = Depends(get_db)):
    m = db.get(Merchant, mid)
    if not m:
        raise HTTPException(404, "merchant not found")
    if m.status != "PENDING":
        raise HTTPException(409, f"merchant not in PENDING status (is {m.status})")

    now = datetime.now(timezone.utc)
    if body.action == "approve":
        m.status = "APPROVED"
    elif body.action == "reject":
        m.status = "SUSPENDED"
    else:
        raise HTTPException(400, "action must be 'approve' or 'reject'")

    m.reviewed_by = ADMIN_ID
    m.reviewed_at = now
    if body.notes:
        m.application_notes = body.notes
    db.commit()
    return {"id": m.id, "status": m.status, "reviewed_by": m.reviewed_by, "reviewed_at": _iso(m.reviewed_at)}


@router.put("/merchants/{mid}/status")
def update_merchant_status(mid: str, status: str = Query(...), db: Session = Depends(get_db)):
    m = db.get(Merchant, mid)
    if not m:
        raise HTTPException(404, "merchant not found")
    if status not in ("ACTIVE", "SUSPENDED", "APPROVED", "PENDING"):
        raise HTTPException(400, "invalid status")
    m.status = status
    db.commit()
    return {"id": m.id, "status": m.status}


# ── Drivers ──────────────────────────────────────────────────────────

@router.get("/drivers")
def list_drivers(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    q = db.query(Driver)
    if status:
        q = q.filter(Driver.status == status)
    total = q.count()
    drivers = q.order_by(Driver.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "drivers": [
            {
                "id": d.id,
                "name": d.name,
                "email": d.email,
                "phone": d.phone,
                "status": d.status,
                "insurance_verified": d.insurance_verified,
                "registration_verified": d.registration_verified,
                "background_clear": d.background_clear,
                "created_at": _iso(d.created_at),
            }
            for d in drivers
        ],
    }


@router.get("/drivers/{did}")
def get_driver(did: str, db: Session = Depends(get_db)):
    d = db.get(Driver, did)
    if not d:
        raise HTTPException(404, "driver not found")

    vehicles = db.query(DriverVehicle).filter(DriverVehicle.driver_id == did).all()
    documents = db.query(DriverDocument).filter(DriverDocument.driver_id == did).all()

    # Delivery history
    tasks = db.query(DeliveryTask).filter(DeliveryTask.driver_id == did).order_by(DeliveryTask.created_at.desc()).limit(50).all()
    completed = sum(1 for t in tasks if t.status == "COMPLETED")

    # Offer stats
    offers = db.query(OfferLog).filter(OfferLog.driver_id == did).all()
    accepted = sum(1 for o in offers if o.outcome == "ACCEPTED")
    acceptance_rate = (accepted / len(offers) * 100) if offers else 0

    return {
        "id": d.id,
        "name": d.name,
        "email": d.email,
        "phone": d.phone,
        "photo_url": d.photo_url,
        "status": d.status,
        "insurance_verified": d.insurance_verified,
        "registration_verified": d.registration_verified,
        "vehicle_verified": d.vehicle_verified,
        "background_clear": d.background_clear,
        "metrics_json": d.metrics_json,
        "created_at": _iso(d.created_at),
        "vehicles": [
            {"id": v.id, "make": v.make, "model": v.model, "year": v.year, "color": v.color, "license_plate": v.license_plate, "is_active": v.is_active}
            for v in vehicles
        ],
        "documents": [
            {"id": doc.id, "doc_type": doc.doc_type, "file_url": doc.file_url, "status": doc.status, "vehicle_id": doc.vehicle_id, "expires_at": _iso(doc.expires_at)}
            for doc in documents
        ],
        "delivery_count": len(tasks),
        "completed_deliveries": completed,
        "total_offers": len(offers),
        "acceptance_rate": round(acceptance_rate, 1),
    }


@router.post("/drivers/{did}/documents/{doc_id}/review")
def review_document(did: str, doc_id: str, body: DriverDocumentReview, db: Session = Depends(get_db)):
    doc = db.get(DriverDocument, doc_id)
    if not doc or doc.driver_id != did:
        raise HTTPException(404, "document not found")
    if body.action == "approve":
        doc.status = "APPROVED"
    elif body.action == "reject":
        doc.status = "REJECTED"
    else:
        raise HTTPException(400, "action must be 'approve' or 'reject'")
    db.commit()

    # Update driver verification flags based on all docs
    driver = db.get(Driver, did)
    all_docs = db.query(DriverDocument).filter(DriverDocument.driver_id == did).all()
    driver.insurance_verified = any(d.doc_type == "INSURANCE" and d.status == "APPROVED" for d in all_docs)
    driver.registration_verified = any(d.doc_type == "REGISTRATION" and d.status == "APPROVED" for d in all_docs)
    db.commit()

    return {"id": doc.id, "status": doc.status}


# ── Customers ────────────────────────────────────────────────────────

@router.get("/customers")
def list_customers(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    total = db.query(Customer).count()
    customers = db.query(Customer).order_by(Customer.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "customers": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "status": c.status,
                "created_at": _iso(c.created_at),
            }
            for c in customers
        ],
    }


@router.get("/customers/{cid}")
def get_customer(cid: str, db: Session = Depends(get_db)):
    c = db.get(Customer, cid)
    if not c:
        raise HTTPException(404, "customer not found")

    addresses = db.query(CustomerAddress).filter(CustomerAddress.customer_id == cid).all()
    verifications = db.query(CustomerAgeVerification).filter(CustomerAgeVerification.customer_id == cid).all()
    orders = db.query(Order).filter(Order.customer_id == cid).order_by(Order.created_at.desc()).limit(50).all()

    return {
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "dob": c.dob.isoformat() if c.dob else None,
        "status": c.status,
        "created_at": _iso(c.created_at),
        "addresses": [
            {"id": a.id, "address": a.address, "lat": a.lat, "lng": a.lng, "deliverable_flag": a.deliverable_flag}
            for a in addresses
        ],
        "verifications": [
            {"id": v.id, "method": v.method, "status": v.status, "verified_at": _iso(v.verified_at)}
            for v in verifications
        ],
        "orders": [
            {"id": o.id, "status": o.status, "total_cents": o.total_cents, "created_at": _iso(o.created_at)}
            for o in orders
        ],
    }


# ── Support (admin side) ────────────────────────────────────────────

@router.get("/tickets")
def list_tickets(
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    assigned_to: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    q = db.query(SupportTicket)
    if status:
        q = q.filter(SupportTicket.status == status)
    if priority:
        q = q.filter(SupportTicket.priority == priority)
    if assigned_to:
        q = q.filter(SupportTicket.assigned_to == assigned_to)
    total = q.count()
    tickets = q.order_by(SupportTicket.updated_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "tickets": [
            {
                "id": t.id,
                "requester_type": t.requester_type,
                "requester_id": t.requester_id,
                "subject": t.subject,
                "status": t.status,
                "priority": t.priority,
                "category": t.category,
                "assigned_to": t.assigned_to,
                "order_id": t.order_id,
                "created_at": _iso(t.created_at),
                "updated_at": _iso(t.updated_at),
            }
            for t in tickets
        ],
    }


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "ticket not found")
    messages = (
        db.query(TicketMessage)
        .filter(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at.asc())
        .all()
    )
    return {
        "id": ticket.id,
        "requester_type": ticket.requester_type,
        "requester_id": ticket.requester_id,
        "order_id": ticket.order_id,
        "subject": ticket.subject,
        "status": ticket.status,
        "priority": ticket.priority,
        "category": ticket.category,
        "assigned_to": ticket.assigned_to,
        "created_at": _iso(ticket.created_at),
        "updated_at": _iso(ticket.updated_at),
        "messages": [
            {"id": m.id, "sender_type": m.sender_type, "sender_id": m.sender_id, "body": m.body, "created_at": _iso(m.created_at)}
            for m in messages
        ],
    }


@router.put("/tickets/{ticket_id}")
def update_ticket(ticket_id: str, body: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "ticket not found")
    if body.status:
        ticket.status = body.status
    if body.priority:
        ticket.priority = body.priority
    if body.assigned_to is not None:
        ticket.assigned_to = body.assigned_to
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": ticket.id, "status": ticket.status, "priority": ticket.priority, "assigned_to": ticket.assigned_to}


@router.post("/tickets/{ticket_id}/messages", status_code=201)
def post_ticket_message(ticket_id: str, body: TicketMessageCreate, db: Session = Depends(get_db)):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "ticket not found")
    msg = TicketMessage(
        id=f"tmsg_{uuid.uuid4().hex[:12]}",
        ticket_id=ticket_id,
        sender_type=body.sender_type,
        sender_id=body.sender_id,
        body=body.body,
    )
    db.add(msg)
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    return {"id": msg.id, "sender_type": msg.sender_type, "body": msg.body, "created_at": _iso(msg.created_at)}


# ── Analytics ────────────────────────────────────────────────────────

@router.get("/analytics/orders")
def analytics_orders(
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    granularity: str = Query(default="day"),
    db: Session = Depends(get_db),
):
    q = db.query(Order)
    if start_date:
        q = q.filter(Order.created_at >= start_date)
    if end_date:
        q = q.filter(Order.created_at <= end_date)
    orders = q.order_by(Order.created_at.asc()).all()

    # Group by day
    buckets = {}
    for o in orders:
        if not o.created_at:
            continue
        if granularity == "hour":
            key = o.created_at.strftime("%Y-%m-%d %H:00")
        else:
            key = o.created_at.strftime("%Y-%m-%d")
        if key not in buckets:
            buckets[key] = {"period": key, "orders": 0, "revenue": 0, "delivered": 0}
        buckets[key]["orders"] += 1
        if o.status == OrderStatus.DELIVERED.value:
            buckets[key]["revenue"] += o.total_cents
            buckets[key]["delivered"] += 1

    # Summary
    total = len(orders)
    delivered = sum(1 for o in orders if o.status == OrderStatus.DELIVERED.value)
    total_revenue = sum(o.total_cents for o in orders if o.status == OrderStatus.DELIVERED.value)
    avg_order = total_revenue // delivered if delivered else 0

    return {
        "summary": {"total_orders": total, "delivered": delivered, "total_revenue": total_revenue, "avg_order_value": avg_order},
        "trends": list(buckets.values()),
    }


@router.get("/analytics/drivers")
def analytics_drivers(db: Session = Depends(get_db)):
    drivers = db.query(Driver).all()
    results = []
    for d in drivers:
        offers = db.query(OfferLog).filter(OfferLog.driver_id == d.id).all()
        accepted = sum(1 for o in offers if o.outcome == "ACCEPTED")
        tasks = db.query(DeliveryTask).filter(DeliveryTask.driver_id == d.id, DeliveryTask.status == "COMPLETED").count()
        results.append({
            "id": d.id,
            "name": d.name,
            "total_offers": len(offers),
            "accepted": accepted,
            "acceptance_rate": round(accepted / len(offers) * 100, 1) if offers else 0,
            "completed_deliveries": tasks,
        })
    results.sort(key=lambda x: x["completed_deliveries"], reverse=True)
    return {"drivers": results}


@router.get("/analytics/merchants")
def analytics_merchants(db: Session = Depends(get_db)):
    merchants = db.query(Merchant).all()
    results = []
    for m in merchants:
        store_ids = [s.id for s in db.query(Store).filter(Store.merchant_id == m.id).all()]
        if not store_ids:
            results.append({"id": m.id, "legal_name": m.legal_name, "order_count": 0, "revenue": 0})
            continue
        orders = db.query(Order).filter(Order.store_id.in_(store_ids)).all()
        revenue = sum(o.total_cents for o in orders if o.status == OrderStatus.DELIVERED.value)
        results.append({"id": m.id, "legal_name": m.legal_name, "order_count": len(orders), "revenue": revenue})
    results.sort(key=lambda x: x["revenue"], reverse=True)
    return {"merchants": results}


@router.get("/analytics/customers")
def analytics_customers(db: Session = Depends(get_db)):
    customers = db.query(Customer).all()
    results = []
    for c in customers:
        orders = db.query(Order).filter(Order.customer_id == c.id).all()
        delivered = [o for o in orders if o.status == OrderStatus.DELIVERED.value]
        avg_val = sum(o.total_cents for o in delivered) // len(delivered) if delivered else 0
        results.append({
            "id": c.id,
            "name": c.name,
            "total_orders": len(orders),
            "delivered_orders": len(delivered),
            "avg_order_value": avg_val,
            "is_repeat": len(delivered) > 1,
        })
    repeat_count = sum(1 for r in results if r["is_repeat"])
    repeat_rate = round(repeat_count / len(results) * 100, 1) if results else 0
    return {"repeat_rate": repeat_rate, "customers": results}


@router.get("/analytics/export")
def analytics_export(dataset: str = Query(...), db: Session = Depends(get_db)):
    buf = io.StringIO()
    writer = csv.writer(buf)

    if dataset == "orders":
        writer.writerow(["id", "customer_id", "store_id", "status", "total_cents", "payment_status", "created_at"])
        for o in db.query(Order).order_by(Order.created_at.desc()).all():
            writer.writerow([o.id, o.customer_id, o.store_id, o.status, o.total_cents, o.payment_status, _iso(o.created_at)])
    elif dataset == "drivers":
        writer.writerow(["id", "name", "email", "status", "insurance_verified", "background_clear", "created_at"])
        for d in db.query(Driver).all():
            writer.writerow([d.id, d.name, d.email, d.status, d.insurance_verified, d.background_clear, _iso(d.created_at)])
    elif dataset == "merchants":
        writer.writerow(["id", "legal_name", "status", "contact_email", "business_type", "created_at"])
        for m in db.query(Merchant).all():
            writer.writerow([m.id, m.legal_name, m.status, m.contact_email, m.business_type, _iso(m.created_at)])
    elif dataset == "customers":
        writer.writerow(["id", "name", "email", "phone", "status", "created_at"])
        for c in db.query(Customer).all():
            writer.writerow([c.id, c.name, c.email, c.phone, c.status, _iso(c.created_at)])
    else:
        raise HTTPException(400, "dataset must be orders|drivers|merchants|customers")

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={dataset}_export.csv"},
    )
