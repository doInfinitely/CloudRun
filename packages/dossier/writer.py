from __future__ import annotations
import uuid
from sqlalchemy.orm import Session
from packages.db.models import OrderEvent
from packages.common.crypto import sha256_hex, stable_json

def emit_order_event(
    db: Session,
    *,
    order_id: str,
    actor_type: str,
    actor_id: str,
    event_type: str,
    payload: dict,
) -> OrderEvent:
    # Get last event hash for this order
    last = (
        db.query(OrderEvent)
        .filter(OrderEvent.order_id == order_id)
        .order_by(OrderEvent.ts.desc())
        .limit(1)
        .one_or_none()
    )
    hash_prev = last.hash_self if last else None

    evt_id = f"evt_{uuid.uuid4().hex}"
    to_hash = {
        "order_id": order_id,
        "actor_type": actor_type,
        "actor_id": actor_id,
        "event_type": event_type,
        "payload": payload,
        "hash_prev": hash_prev,
        "id": evt_id,
    }
    hash_self = sha256_hex(stable_json(to_hash))

    evt = OrderEvent(
        id=evt_id,
        order_id=order_id,
        actor_type=actor_type,
        actor_id=actor_id,
        event_type=event_type,
        payload=payload,
        hash_prev=hash_prev,
        hash_self=hash_self,
    )
    db.add(evt)
    db.flush()
    return evt
