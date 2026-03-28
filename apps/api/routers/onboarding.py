"""Onboarding endpoints: Stripe Connect + completion checks."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from packages.db.session import get_db
from packages.db.models import Customer, Driver, Merchant, CustomerAddress, DriverVehicle, Store
from packages.payments.connect import create_express_account, create_account_link, get_account_status

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


# ── Schemas ──────────────────────────────────────────────────────────

class StripeLinkRequest(BaseModel):
    return_url: str
    refresh_url: str


# ── Helpers ──────────────────────────────────────────────────────────

_ENTITY_MODELS = {
    "merchant": Merchant,
    "driver": Driver,
}


def _get_entity(db: Session, entity_type: str, entity_id: str):
    model = _ENTITY_MODELS.get(entity_type)
    if not model:
        raise HTTPException(400, f"Invalid entity type: {entity_type}")
    entity = db.get(model, entity_id)
    if not entity:
        raise HTTPException(404, f"{entity_type} not found")
    return entity


# ── Stripe Connect ───────────────────────────────────────────────────

@router.post("/{entity_type}/{entity_id}/stripe/create-account")
def stripe_create_account(entity_type: str, entity_id: str, db: Session = Depends(get_db)):
    entity = _get_entity(db, entity_type, entity_id)
    if entity.stripe_account_id:
        return {"stripe_account_id": entity.stripe_account_id}
    email = getattr(entity, "contact_email", None) or getattr(entity, "email", None) or ""
    result = create_express_account(entity_type, entity_id, email)
    entity.stripe_account_id = result["stripe_account_id"]
    db.commit()
    return result


@router.post("/{entity_type}/{entity_id}/stripe/create-link")
def stripe_create_link(entity_type: str, entity_id: str, body: StripeLinkRequest, db: Session = Depends(get_db)):
    entity = _get_entity(db, entity_type, entity_id)
    if not entity.stripe_account_id:
        raise HTTPException(400, "No Stripe account created yet")
    return create_account_link(entity.stripe_account_id, body.return_url, body.refresh_url)


@router.get("/{entity_type}/{entity_id}/stripe/status")
def stripe_status(entity_type: str, entity_id: str, db: Session = Depends(get_db)):
    entity = _get_entity(db, entity_type, entity_id)
    if not entity.stripe_account_id:
        raise HTTPException(400, "No Stripe account created yet")
    status = get_account_status(entity.stripe_account_id)
    if status["details_submitted"] and status["charges_enabled"]:
        entity.stripe_onboarding_complete = True
        db.commit()
    return {**status, "stripe_onboarding_complete": entity.stripe_onboarding_complete}


# ── Completion checks ────────────────────────────────────────────────

@router.post("/customer/{customer_id}/complete")
def complete_customer(customer_id: str, db: Session = Depends(get_db)):
    c = db.get(Customer, customer_id)
    if not c:
        raise HTTPException(404, "customer not found")
    missing = []
    if not c.phone:
        missing.append("phone")
    if not c.dob:
        missing.append("dob")
    addrs = db.query(CustomerAddress).filter(CustomerAddress.customer_id == customer_id).first()
    if not addrs:
        missing.append("address")
    if missing:
        raise HTTPException(400, f"Missing required fields: {', '.join(missing)}")
    c.onboarding_complete = True
    db.commit()
    return {"onboarding_complete": True}


@router.post("/driver/{driver_id}/complete")
def complete_driver(driver_id: str, db: Session = Depends(get_db)):
    d = db.get(Driver, driver_id)
    if not d:
        raise HTTPException(404, "driver not found")
    missing = []
    if not d.phone:
        missing.append("phone")
    vehicles = db.query(DriverVehicle).filter(DriverVehicle.driver_id == driver_id).first()
    if not vehicles:
        missing.append("vehicle")
    if not d.stripe_onboarding_complete:
        missing.append("stripe")
    if missing:
        raise HTTPException(400, f"Missing required fields: {', '.join(missing)}")
    d.onboarding_complete = True
    db.commit()
    return {"onboarding_complete": True}


@router.post("/merchant/{merchant_id}/complete")
def complete_merchant(merchant_id: str, db: Session = Depends(get_db)):
    m = db.get(Merchant, merchant_id)
    if not m:
        raise HTTPException(404, "merchant not found")
    missing = []
    if not m.legal_name:
        missing.append("legal_name")
    stores = db.query(Store).filter(Store.merchant_id == merchant_id).first()
    if not stores:
        missing.append("store")
    if not m.stripe_onboarding_complete:
        missing.append("stripe")
    if missing:
        raise HTTPException(400, f"Missing required fields: {', '.join(missing)}")
    m.onboarding_complete = True
    db.commit()
    return {"onboarding_complete": True}
