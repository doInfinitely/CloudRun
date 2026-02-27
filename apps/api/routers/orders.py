from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from packages.db.session import get_db
from packages.db.models import Order, OrderEvent
from packages.core.enums import OrderStatus
from packages.core.state_machine import OrderStateMachine
from packages.dossier.writer import emit_order_event
from packages.verification.orchestrator import verify_age_checkout, verify_id_doorstep
from packages.payments.processor_fake import authorize as pay_authorize
from packages.common.idempotency import get_or_set as idem_get_or_set

from apps.api.schemas import CreateOrderIn, VerifyAgeIn, AuthorizePaymentIn, DoorstepSubmitIn, DeliverConfirmIn, RefuseIn

router = APIRouter()

def _transition(db: Session, order: Order, to: OrderStatus, *, actor_type="system", actor_id="oms", event_type="ORDER_STATUS_UPDATED"):
    sm = OrderStateMachine(OrderStatus(order.status))
    sm2 = sm.transition(to)
    order.status = sm2.status.value
    db.add(order)
    emit_order_event(db, order_id=order.id, actor_type=actor_type, actor_id=actor_id, event_type=event_type, payload={"to": sm2.status.value})

@router.post("/orders")
def create_order(body: CreateOrderIn, db: Session = Depends(get_db)):
    order_id = f"ord_{uuid.uuid4().hex}"
    order = Order(
        id=order_id,
        customer_id=body.customer_id,
        store_id=body.store_id,
        address_id=body.address_id,
        status=OrderStatus.CREATED.value,
        disclosure_version=body.disclosure_version,
        tip_cents=body.tip_cents,
        subtotal_cents=0,
        tax_cents=0,
        fees_cents=0,
        total_cents=0,
        payment_status="UNPAID",
    )
    db.add(order)

    emit_order_event(
        db,
        order_id=order_id,
        actor_type="customer",
        actor_id=body.customer_id,
        event_type="DISCLOSURE_ACKNOWLEDGED",
        payload={"disclosure_version": body.disclosure_version, "locale": "en-US"},
    )

    _transition(db, order, OrderStatus.VERIFYING_AGE, event_type="ORDER_STATUS_UPDATED")
    db.commit()
    return {"order_id": order_id, "status": order.status}

@router.post("/orders/{order_id}/verify_age")
def verify_age(order_id: str, body: VerifyAgeIn, db: Session = Depends(get_db), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    if not idempotency_key:
        raise HTTPException(400, "Idempotency-Key header required")

    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "order not found")
    if order.status != OrderStatus.VERIFYING_AGE.value:
        raise HTTPException(409, f"order not in VERIFYING_AGE (is {order.status})")

    def compute():
        emit_order_event(db, order_id=order_id, actor_type="system", actor_id="oms", event_type="AGE_VERIFY_ATTEMPTED",
                        payload={"method": "DOCUMENT_SCAN", "vendor": "fake", "session_ref": body.session_ref})
        res = verify_age_checkout(body.session_ref, age_threshold=21)
        if res.status == "PASSED":
            emit_order_event(db, order_id=order_id, actor_type="system", actor_id="oms", event_type="AGE_VERIFY_PASSED",
                            payload={"vendor": "fake", "proof_ref": res.proof_ref, "age_threshold": 21, "dob_year": res.dob_year})
            _transition(db, order, OrderStatus.PAYMENT_AUTH, event_type="ORDER_STATUS_UPDATED")
            return 200, {"status": "PASSED", "order_status": order.status}
        else:
            emit_order_event(db, order_id=order_id, actor_type="system", actor_id="oms", event_type="AGE_VERIFY_FAILED",
                            payload={"vendor": "fake", "proof_ref": res.proof_ref, "reason_code": res.reason_code})
            return 403, {"status": "FAILED", "reason_code": res.reason_code}

    try:
        status_code, resp, replayed = idem_get_or_set(
            db, key=idempotency_key, route="POST:/orders/{order_id}/verify_age",
            request_body=body.model_dump(), compute=compute
        )
        db.commit()
    except ValueError as e:
        db.rollback()
        raise HTTPException(409, str(e))

    if status_code >= 400:
        raise HTTPException(status_code, resp.get("reason_code", "error"))
    return resp

@router.post("/orders/{order_id}/payment/authorize")
def authorize_payment(order_id: str, body: AuthorizePaymentIn, db: Session = Depends(get_db), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    if not idempotency_key:
        raise HTTPException(400, "Idempotency-Key header required")

    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "order not found")
    if order.status != OrderStatus.PAYMENT_AUTH.value:
        raise HTTPException(409, f"order not in PAYMENT_AUTH (is {order.status})")

    def compute():
        order.total_cents = max(order.total_cents, 2500)
        pi = pay_authorize(order.total_cents)
        order.payment_status = "AUTHORIZED"
        db.add(order)
        emit_order_event(db, order_id=order_id, actor_type="system", actor_id="payments", event_type="PAYMENT_AUTHORIZED",
                        payload={"processor": pi["processor"], "payment_intent_id": pi["payment_intent_id"], "amount_cents": pi["amount_cents"]})
        _transition(db, order, OrderStatus.MERCHANT_ACCEPTED, event_type="ORDER_STATUS_UPDATED")
        return 200, {"payment_status": order.payment_status, "order_status": order.status}

    try:
        status_code, resp, replayed = idem_get_or_set(
            db, key=idempotency_key, route="POST:/orders/{order_id}/payment/authorize",
            request_body=body.model_dump(), compute=compute
        )
        db.commit()
    except ValueError as e:
        db.rollback()
        raise HTTPException(409, str(e))

    return resp

@router.post("/orders/{order_id}/doorstep_id_check/submit")
def doorstep_id_check(order_id: str, body: DoorstepSubmitIn, db: Session = Depends(get_db), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    if not idempotency_key:
        raise HTTPException(400, "Idempotency-Key header required")

    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "order not found")
    if order.status not in {OrderStatus.MERCHANT_ACCEPTED.value, OrderStatus.DOORSTEP_VERIFY.value}:
        raise HTTPException(409, f"order not eligible for doorstep check (is {order.status})")

    def compute():
        if order.status != OrderStatus.DOORSTEP_VERIFY.value:
            _transition(db, order, OrderStatus.DOORSTEP_VERIFY, event_type="ORDER_STATUS_UPDATED")

        emit_order_event(db, order_id=order_id, actor_type="driver", actor_id="drv_demo", event_type="DOORSTEP_ID_CHECK_STARTED",
                        payload={"driver_id": "drv_demo", "method": "DOCUMENT_SCAN"})

        res = verify_id_doorstep(body.session_ref, age_threshold=21)
        if res.status == "PASSED":
            emit_order_event(db, order_id=order_id, actor_type="driver", actor_id="drv_demo", event_type="DOORSTEP_ID_CHECK_PASSED",
                            payload={
                                "vendor":"fake",
                                "proof_ref": res.proof_ref,
                                "age_threshold": 21,
                                "dob_year": res.dob_year,
                                "id_type": res.id_type,
                                "id_last4": res.id_last4,
                            })
            return 200, {"status": "PASSED"}
        else:
            emit_order_event(db, order_id=order_id, actor_type="driver", actor_id="drv_demo", event_type="DOORSTEP_ID_CHECK_FAILED",
                            payload={"vendor":"fake","proof_ref":res.proof_ref,"reason_code":res.reason_code})
            _transition(db, order, OrderStatus.REFUSED_RETURNING, event_type="ORDER_STATUS_UPDATED")
            emit_order_event(db, order_id=order_id, actor_type="driver", actor_id="drv_demo", event_type="REFUSED",
                            payload={"driver_id":"drv_demo","reason_code":res.reason_code,"notes":None,"gps":None})
            from packages.db.models import DeliveryTask
            import uuid as _uuid
            ret_task_id = f"task_ret_{_uuid.uuid4().hex}"
            db.add(DeliveryTask(id=ret_task_id, order_id=order_id, status="UNASSIGNED", route_json={"type":"RETURN","to_store_id": order.store_id}))
            emit_order_event(db, order_id=order_id, actor_type="system", actor_id="oms", event_type="RETURN_INITIATED",
                            payload={"return_task_id": ret_task_id, "to_store_id": order.store_id})
            return 403, {"status": "FAILED", "reason_code": res.reason_code}

    try:
        status_code, resp, replayed = idem_get_or_set(
            db, key=idempotency_key, route="POST:/orders/{order_id}/doorstep_id_check/submit",
            request_body=body.model_dump(), compute=compute
        )
        db.commit()
    except ValueError as e:
        db.rollback()
        raise HTTPException(409, str(e))

    if status_code >= 400:
        raise HTTPException(status_code, resp.get("reason_code", "error"))
    return resp

@router.post("/orders/{order_id}/deliver/confirm")
def deliver_confirm(order_id: str, body: DeliverConfirmIn, db: Session = Depends(get_db), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    if not idempotency_key:
        raise HTTPException(400, "Idempotency-Key header required")

    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "order not found")
    if order.status != OrderStatus.DOORSTEP_VERIFY.value:
        raise HTTPException(409, f"order not in DOORSTEP_VERIFY (is {order.status})")

    def compute():
        passed = db.query(OrderEvent).filter(OrderEvent.order_id==order_id, OrderEvent.event_type=="DOORSTEP_ID_CHECK_PASSED").first()
        if not passed:
            return 403, {"status":"FAILED", "reason_code":"MISSING_DOORSTEP_PASS"}

        emit_order_event(db, order_id=order_id, actor_type="driver", actor_id="drv_demo", event_type="DELIVERED",
                        payload={"driver_id":"drv_demo","attestation_ref":body.attestation_ref,"gps":body.gps})
        _transition(db, order, OrderStatus.DELIVERED, event_type="ORDER_STATUS_UPDATED")
        return 200, {"order_status": order.status}

    try:
        status_code, resp, replayed = idem_get_or_set(
            db, key=idempotency_key, route="POST:/orders/{order_id}/deliver/confirm",
            request_body=body.model_dump(), compute=compute
        )
        db.commit()
    except ValueError as e:
        db.rollback()
        raise HTTPException(409, str(e))

    if status_code >= 400:
        raise HTTPException(status_code, resp.get("reason_code", "error"))
    return resp


@router.post("/orders/{order_id}/refuse")
def refuse_order(order_id: str, body: RefuseIn, db: Session = Depends(get_db)):
    """Explicit refusal endpoint.

    Use when driver cannot complete delivery (no ID, mismatch, unsafe, etc).
    This enforces state transition to REFUSED_RETURNING and creates a return task.
    """
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "order not found")

    # Only allow refusal before delivered/canceled.
    if order.status in {OrderStatus.DELIVERED.value, OrderStatus.CANCELED.value}:
        raise HTTPException(409, f"cannot refuse order in status {order.status}")

    # Transition if needed
    if order.status != OrderStatus.REFUSED_RETURNING.value:
        # If currently doorstep verify or en route, we allow refusal.
        _transition(db, order, OrderStatus.REFUSED_RETURNING, event_type="ORDER_STATUS_UPDATED")

    emit_order_event(
        db,
        order_id=order_id,
        actor_type="driver",
        actor_id="drv_demo",
        event_type="REFUSED",
        payload={
            "driver_id": "drv_demo",
            "reason_code": body.reason_code,
            "notes": body.notes,
            "gps": body.gps,
        },
    )

    # Create return task record (delivery_tasks) to store_id
    from packages.db.models import DeliveryTask
    import uuid
    ret_task_id = f"task_ret_{uuid.uuid4().hex}"
    db.add(DeliveryTask(id=ret_task_id, order_id=order_id, status="UNASSIGNED", route_json={"type": "RETURN", "to_store_id": order.store_id}))

    emit_order_event(
        db,
        order_id=order_id,
        actor_type="system",
        actor_id="oms",
        event_type="RETURN_INITIATED",
        payload={"return_task_id": ret_task_id, "to_store_id": order.store_id},
    )

    db.commit()
    return {"order_status": order.status, "return_task_id": ret_task_id}
