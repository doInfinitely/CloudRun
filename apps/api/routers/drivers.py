from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from packages.db.session import get_db
from packages.db.models import Driver, DeliveryTask, Order, Store, CustomerAddress

router = APIRouter(prefix="/v1", tags=["drivers"])

@router.post("/drivers/{driver_id}")
def upsert_driver(driver_id: str, body: dict, db: Session = Depends(get_db)):
    d = db.get(Driver, driver_id)
    if not d:
        d = Driver(id=driver_id)
    d.status = body.get("status", d.status)
    d.lat = str(body.get("lat")) if body.get("lat") is not None else d.lat
    d.lng = str(body.get("lng")) if body.get("lng") is not None else d.lng
    d.zone_id = body.get("zone_id", d.zone_id)
    d.insurance_verified = bool(body.get("insurance_verified", d.insurance_verified))
    d.registration_verified = bool(body.get("registration_verified", d.registration_verified))
    d.vehicle_verified = bool(body.get("vehicle_verified", d.vehicle_verified))
    d.background_clear = bool(body.get("background_clear", d.background_clear))
    d.training_flags_json = body.get("training_flags", d.training_flags_json) or []
    d.metrics_json = body.get("metrics", d.metrics_json) or {}
    db.add(d)
    db.commit()
    return {"driver_id": d.id}

@router.get("/drivers")
def list_drivers(db: Session = Depends(get_db)):
    out=[]
    for d in db.query(Driver).all():
        out.append({"driver_id": d.id, "status": d.status, "lat": d.lat, "lng": d.lng})
    return {"drivers": out}

@router.get("/drivers/{driver_id}/task")
def get_driver_task(driver_id: str, db: Session = Depends(get_db)):
    """Return the current offered or accepted task for a driver with pickup/delivery details."""
    d = db.get(Driver, driver_id)
    if not d:
        raise HTTPException(404, "driver not found")

    task = (
        db.query(DeliveryTask)
        .filter(
            ((DeliveryTask.offered_to_driver_id == driver_id) & (DeliveryTask.status == "OFFERED"))
            | ((DeliveryTask.driver_id == driver_id) & (DeliveryTask.status.in_(["ACCEPTED", "IN_PROGRESS"])))
        )
        .first()
    )
    if not task:
        return {"task": None}

    order = db.get(Order, task.order_id)
    store = db.get(Store, order.store_id) if order else None
    address = db.get(CustomerAddress, order.address_id) if order else None

    return {
        "task": {
            "id": task.id,
            "order_id": task.order_id,
            "status": task.status,
            "pickup": {
                "store_id": store.id if store else None,
                "name": store.name if store else None,
                "address": store.address if store else None,
                "lat": float(store.lat) if store and store.lat else None,
                "lng": float(store.lng) if store and store.lng else None,
            } if store else None,
            "delivery": {
                "address_id": address.id if address else None,
                "address": address.address if address else None,
                "lat": float(address.lat) if address and address.lat else None,
                "lng": float(address.lng) if address and address.lng else None,
            } if address else None,
        }
    }
