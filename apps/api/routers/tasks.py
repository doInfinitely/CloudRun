from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
import time
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from packages.db.session import get_db
from packages.db.models import DeliveryTask, OfferLog, Order
from packages.core.enums import OrderStatus
from packages.core.state_machine import OrderStateMachine
from packages.dossier.writer import emit_order_event
from packages.common.redis_client import get_redis, lock_key
from packages.common.idempotency import get_or_set as idem_get_or_set


def _try_order_transition(db, order, to: OrderStatus):
    """Attempt an order state transition; silently skip if not allowed."""
    try:
        sm = OrderStateMachine(OrderStatus(order.status))
        sm2 = sm.transition(to)
        order.status = sm2.status.value
        emit_order_event(db, order_id=order.id, actor_type="system", actor_id="dispatch",
                         event_type="ORDER_STATUS_UPDATED", payload={"to": sm2.status.value})
    except Exception:
        pass

router = APIRouter()

LOCK_TTL_S = 10

@router.post("/orders/{order_id}/dispatch")
def dispatch(order_id: str, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "order not found")
    task_id = f"task_{uuid.uuid4().hex}"
    task = DeliveryTask(id=task_id, order_id=order_id, status="UNASSIGNED", route_json={})
    db.add(task)
    emit_order_event(db, order_id=order_id, actor_type="system", actor_id="dispatch", event_type="TASK_CREATED", payload={"task_id": task_id})
    db.commit()
    return {"task_id": task_id, "status": task.status}

@router.post("/tasks/{task_id}/offer")
def offer_task(task_id: str, driver_id: str, db: Session = Depends(get_db)):
    task = db.get(DeliveryTask, task_id)
    if not task:
        raise HTTPException(404, "task not found")
    if task.status not in ("UNASSIGNED", "FAILED"):
        raise HTTPException(409, f"cannot offer task in status {task.status}")

    task.status = "OFFERED"
    task.offered_to_driver_id = driver_id
    task.offer_expires_at = datetime.now(timezone.utc) + timedelta(minutes=2)

    db.add(task)
    emit_order_event(db, order_id=task.order_id, actor_type="system", actor_id="dispatch", event_type="TASK_OFFERED",
                    payload={"task_id": task.id, "driver_id": driver_id, "expires_at": task.offer_expires_at.isoformat()})
    db.commit()
    return {"task_id": task.id, "status": task.status, "offered_to_driver_id": driver_id}

@router.post("/tasks/{task_id}/accept")
def accept_task(task_id: str, driver_id: str, db: Session = Depends(get_db), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    if not idempotency_key:
        raise HTTPException(400, "Idempotency-Key header required")

    r = get_redis()
    lk = lock_key(f"task_accept:{task_id}")
    if not r.set(lk, "1", nx=True, ex=LOCK_TTL_S):
        raise HTTPException(409, "task accept is locked; retry")

    try:
        task = db.get(DeliveryTask, task_id)
        if not task:
            raise HTTPException(404, "task not found")
        if task.status != "OFFERED":
            raise HTTPException(409, f"task not offered (is {task.status})")
        if task.offered_to_driver_id != driver_id:
            raise HTTPException(403, "task not offered to this driver")

        def compute():
            task.status = "ACCEPTED"
            _set_offer_outcome(db, task_id=task.id, outcome="ACCEPTED")
            task.driver_id = driver_id
            db.add(task)
            emit_order_event(db, order_id=task.order_id, actor_type="driver", actor_id=driver_id, event_type="TASK_ACCEPTED",
                            payload={"task_id": task.id, "driver_id": driver_id})
            # Sync order status: DISPATCHING -> PICKUP
            order = db.get(Order, task.order_id)
            if order:
                _try_order_transition(db, order, OrderStatus.PICKUP)
            return 200, {"task_id": task.id, "status": task.status}

        try:
            status_code, resp, replayed = idem_get_or_set(
                db, key=idempotency_key, route="POST:/tasks/{task_id}/accept",
                request_body={"task_id": task_id, "driver_id": driver_id}, compute=compute
            )
            db.commit()
        except ValueError as e:
            db.rollback()
            raise HTTPException(409, str(e))

        return resp
    finally:
        r.delete(lk)

@router.post("/tasks/{task_id}/reject")
def reject_task(task_id: str, driver_id: str, db: Session = Depends(get_db)):
    task = db.get(DeliveryTask, task_id)
    if not task:
        raise HTTPException(404, "task not found")
    if task.status != "OFFERED":
        raise HTTPException(409, f"task not offered (is {task.status})")
    if task.offered_to_driver_id != driver_id:
        raise HTTPException(403, "task not offered to this driver")

    task.status = "UNASSIGNED"
    task.offered_to_driver_id = None
    task.offer_expires_at = None
    db.add(task)
    emit_order_event(db, order_id=task.order_id, actor_type="driver", actor_id=driver_id, event_type="TASK_REJECTED", payload={"task_id": task.id})
    db.commit()
    return {"task_id": task.id, "status": task.status}


@router.post("/tasks/{task_id}/start")
def start_task(task_id: str, driver_id: str, db: Session = Depends(get_db)):
    """Transition task from ACCEPTED to IN_PROGRESS (driver picked up the order)."""
    task = db.get(DeliveryTask, task_id)
    if not task:
        raise HTTPException(404, "task not found")
    if task.status != "ACCEPTED":
        raise HTTPException(409, f"cannot start task in status {task.status}")
    if task.driver_id != driver_id:
        raise HTTPException(403, "task not assigned to this driver")

    task.status = "IN_PROGRESS"
    db.add(task)
    emit_order_event(db, order_id=task.order_id, actor_type="driver", actor_id=driver_id,
                    event_type="TASK_STARTED", payload={"task_id": task.id})
    # Sync order status: PICKUP -> EN_ROUTE -> DOORSTEP_VERIFY
    order = db.get(Order, task.order_id)
    if order:
        _try_order_transition(db, order, OrderStatus.EN_ROUTE)
        _try_order_transition(db, order, OrderStatus.DOORSTEP_VERIFY)
    db.commit()
    return {"task_id": task.id, "status": task.status}

@router.post("/tasks/{task_id}/complete")
def complete_task(task_id: str, driver_id: str, db: Session = Depends(get_db)):
    """Transition task from IN_PROGRESS to COMPLETED (delivery done)."""
    task = db.get(DeliveryTask, task_id)
    if not task:
        raise HTTPException(404, "task not found")
    if task.status != "IN_PROGRESS":
        raise HTTPException(409, f"cannot complete task in status {task.status}")
    if task.driver_id != driver_id:
        raise HTTPException(403, "task not assigned to this driver")

    task.status = "COMPLETED"
    db.add(task)
    emit_order_event(db, order_id=task.order_id, actor_type="driver", actor_id=driver_id,
                    event_type="TASK_COMPLETED", payload={"task_id": task.id})
    # Sync order status: DOORSTEP_VERIFY -> DELIVERED
    order = db.get(Order, task.order_id)
    if order:
        _try_order_transition(db, order, OrderStatus.DELIVERED)
    db.commit()
    return {"task_id": task.id, "status": task.status}

@router.post("/tasks/{task_id}/return/complete")
def complete_return(task_id: str, db: Session = Depends(get_db)):
    """Mark a return task completed (store received)."""
    task = db.get(DeliveryTask, task_id)
    if not task:
        raise HTTPException(404, "task not found")
    if task.status not in ("ACCEPTED", "IN_PROGRESS", "OFFERED", "UNASSIGNED"):
        raise HTTPException(409, f"cannot complete task in status {task.status}")

    task.status = "COMPLETED"
    db.add(task)
    emit_order_event(db, order_id=task.order_id, actor_type="system", actor_id="dispatch", event_type="RETURN_COMPLETED",
                    payload={"return_task_id": task.id})
    db.commit()
    return {"task_id": task.id, "status": task.status}


def _set_offer_outcome(db: Session, *, task_id: str, outcome: str) -> None:
    # Best-effort. OfferLog might not exist for older tasks.
    log = db.query(OfferLog).filter(OfferLog.task_id == task_id).order_by(OfferLog.created_at.desc()).first()
    if not log:
        return
    log.outcome = outcome
    log.outcome_ms = int(time.time() * 1000)
