from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from packages.db.session import get_db
from packages.db.models import Order, OrderEvent

router = APIRouter()

@router.get("/orders/{order_id}/dossier")
def get_dossier(order_id: str, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "order not found")
    events = (
        db.query(OrderEvent)
        .filter(OrderEvent.order_id == order_id)
        .order_by(OrderEvent.ts.asc())
        .all()
    )
    return {
        "order_id": order_id,
        "status": order.status,
        "events": [
            {
                "id": e.id,
                "ts": e.ts.isoformat(),
                "actor_type": e.actor_type,
                "actor_id": e.actor_id,
                "event_type": e.event_type,
                "payload": e.payload,
                "hash_prev": e.hash_prev,
                "hash_self": e.hash_self,
            }
            for e in events
        ],
    }
