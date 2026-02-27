from __future__ import annotations
from typing import Dict
import time
from sqlalchemy.orm import Session
from packages.db.models import Driver, Order, Store, DeliveryTask, CustomerAddress

DEFAULT_PREP_S = 5 * 60
DEFAULT_SLA_S = 45 * 60

def build_dispatch_snapshot(
    db: Session,
    *,
    region_id: str,
    now_ms: int | None = None,
    horizon_s: int = 20 * 60,
) -> Dict:
    now_ms = now_ms or int(time.time() * 1000)

    # Drivers: all in region (MVP: no region field -> include all)
    drivers = []
    for d in db.query(Driver).all():
        drivers.append({
            "driver_id": d.id,
            "node_id": d.node_id,
            "lat": float(d.lat) if d.lat else None,
            "lng": float(d.lng) if d.lng else None,
            "status": d.status,
            "zone_id": d.zone_id,
            "capacity": {"max_active_orders": 1, "active_orders": 0},
            "eligibility": {
                "vehicle_verified": bool(d.vehicle_verified),
                "insurance_verified": bool(d.insurance_verified),
                "registration_verified": bool(d.registration_verified),
                "background_clear": bool(d.background_clear),
                "training_flags": d.training_flags_json or [],
            },
            "metrics": d.metrics_json or {},
            "last_update_ms": now_ms,
        })

    # Tasks (offered/accepted/in_progress)
    tasks = []
    for t in db.query(DeliveryTask).filter(DeliveryTask.status.in_(["OFFERED","ACCEPTED","IN_PROGRESS"])).all():
        tasks.append({
            "task_id": t.id,
            "order_id": t.order_id,
            "status": t.status,
            "offered_to_driver_id": t.offered_to_driver_id,
            "offer_expires_at_ms": int(t.offer_expires_at.timestamp()*1000) if t.offer_expires_at else None,
        })

    # Orders needing dispatch
    orders = db.query(Order).filter(Order.status.in_(["CREATED","AGE_VERIFIED","PAYMENT_AUTHORIZED","DISPATCHING"])).all()
    jobs = []
    for o in orders:
        store = db.get(Store, o.store_id)
        addr = db.get(CustomerAddress, o.address_id)
        if not store or not store.lat or not store.lng or not addr or not addr.lat or not addr.lng:
            continue
        created_ms = int(o.created_at.timestamp()*1000) if o.created_at else now_ms
        ready_at_ms = created_ms + DEFAULT_PREP_S*1000
        deadline_ms = created_ms + DEFAULT_SLA_S*1000

        jobs.append({
            "order_id": o.id,
            "job_id": f"job_{o.id}",
            "store_id": o.store_id,
            "pickup_node_id": f"store_{o.store_id}",
            "drop_node_id": f"addr_{o.address_id}",
            "pickup_lat": float(store.lat),
            "pickup_lng": float(store.lng),
            "drop_lat": float(addr.lat),
            "drop_lng": float(addr.lng),
            "created_ms": created_ms,
            "ready_at_ms": ready_at_ms,
            "deadline_ms": deadline_ms,
            "priority": 1,
            "requires_id_check": True,
            "return_to_store_on_refusal": True,
            "zone_id": None,
            "state": "PENDING_DISPATCH",
            "pricing": {"payout_cents_est": max(500, int((o.total_cents or 0) * 0.25))},
            "approx_eta_drop_s": 600,
        })

    return {
        "ts_ms": now_ms,
        "region_id": region_id,
        "params": {
            "assignment_mode": "FAST_MATCH",
            "k_candidates_per_job": 100,
            "radius_meters": 6000,
            "offer_ttl_s": 30,
            "hard_pickup_eta_s_max": 900,
            "h3_res": 8,
            "weights": {"alpha_total_time":1.0,"beta_lateness":25.0,"gamma_deadhead":1.0,"rho_return_risk":1.0,"lambda_fairness":0.0,"mu_zone":0.0},
        },
        "road_graph": {"graph_id":"osm-texas","profile_id":"car-default"},
        "drivers": drivers,
        "jobs": jobs,
        "tasks": tasks,
        "predictions": {},
    }
