from __future__ import annotations
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from packages.db.models import DeliveryTask, OfferLog
from packages.dossier.writer import emit_order_event

def create_offer(db: Session, *, snapshot: dict, order_id: str, driver_id: str, offer_ttl_s: int, edge_debug: dict | None = None) -> DeliveryTask:
    import uuid
    task_id = f"task_{uuid.uuid4().hex}"
    task = DeliveryTask(
        id=task_id,
        order_id=order_id,
        status="OFFERED",
        offered_to_driver_id=driver_id,
        offer_expires_at=datetime.now(timezone.utc) + timedelta(seconds=offer_ttl_s),
        route_json={"type":"DELIVERY"},
    )
    db.add(task)
    # Offer logging for future acceptance model training
    import uuid
    offer_log = OfferLog(
        id=f"offlog_{uuid.uuid4().hex}",
        task_id=task_id,
        order_id=order_id,
        driver_id=driver_id,
        features_json=_mk_offer_features(snapshot=snapshot, driver_id=driver_id, order_id=order_id, edge_debug=edge_debug),
    )
    db.add(offer_log)
    emit_order_event(db, order_id=order_id, actor_type="system", actor_id="dispatch", event_type="TASK_OFFERED",
                    payload={"task_id": task_id, "driver_id": driver_id, "expires_at": task.offer_expires_at.isoformat()})
    return task


def _mk_offer_features(*, snapshot: dict, driver_id: str, order_id: str, edge_debug: dict | None) -> dict:
    # Keep this stable for ML training later.
    params = snapshot.get("params", {}) or {}
    return {
        "ts_ms": int(snapshot.get("ts_ms", 0)),
        "region_id": snapshot.get("region_id"),
        "weights": (params.get("weights") or {}),
        "driver_id": driver_id,
        "order_id": order_id,
        "edge_debug": edge_debug or {},
    }
