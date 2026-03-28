"""Authentication endpoints: login, signup, token validation, demo access."""

from __future__ import annotations

import uuid

import bcrypt
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from apps.api.middleware.auth import create_token, decode_token
from apps.api.schemas import LoginRequest, SignupRequest
from packages.db.models import (
    AdminUser, Customer, Driver, Merchant, UserCredential,
)
from packages.db.session import SessionLocal

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _entity_info(db, cred: UserCredential) -> dict:
    """Fetch display name and onboarding status for a credential's entity."""
    model_map = {
        "admin": AdminUser,
        "merchant": Merchant,
        "customer": Customer,
        "driver": Driver,
    }
    model = model_map.get(cred.entity_type)
    if not model:
        return {"name": None, "onboarding_complete": True}
    entity = db.get(model, cred.entity_id)
    if not entity:
        return {"name": None, "onboarding_complete": True}
    name = entity.legal_name if cred.entity_type == "merchant" else getattr(entity, "name", None)
    onboarding = getattr(entity, "onboarding_complete", True)
    return {"name": name, "onboarding_complete": onboarding}


@router.post("/login")
def login(body: LoginRequest):
    db = SessionLocal()
    try:
        cred = db.execute(
            select(UserCredential).where(UserCredential.email == body.email)
        ).scalar_one_or_none()

        if not cred or not _verify_password(body.password, cred.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_token(subject=cred.entity_id, role=cred.entity_type)
        info = _entity_info(db, cred)

        return {
            "token": token,
            "user": {
                "id": cred.entity_id,
                "email": cred.email,
                "type": cred.entity_type,
                "name": info["name"],
                "onboarding_complete": info["onboarding_complete"],
            },
        }
    finally:
        db.close()


@router.post("/signup")
def signup(body: SignupRequest):
    if body.type not in ("customer", "driver", "merchant"):
        raise HTTPException(status_code=400, detail="Invalid account type")

    db = SessionLocal()
    try:
        existing = db.execute(
            select(UserCredential).where(UserCredential.email == body.email)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        # Create the domain entity
        entity_id = f"{body.type[:4]}_{uuid.uuid4().hex[:8]}"
        if body.type == "customer":
            entity = Customer(id=entity_id, name=body.name, email=body.email, status="ACTIVE")
        elif body.type == "driver":
            entity = Driver(id=entity_id, name=body.name, email=body.email, status="OFFLINE")
        else:  # merchant
            legal_name = body.legal_name or body.name
            entity = Merchant(id=entity_id, legal_name=legal_name, status="ACTIVE")

        db.add(entity)

        # Create credential
        cred = UserCredential(
            id=f"cred_{uuid.uuid4().hex[:8]}",
            email=body.email,
            password_hash=_hash_password(body.password),
            entity_type=body.type,
            entity_id=entity_id,
        )
        db.add(cred)
        db.commit()

        token = create_token(subject=entity_id, role=body.type)
        return {
            "token": token,
            "user": {
                "id": entity_id,
                "email": body.email,
                "type": body.type,
                "name": body.name,
                "onboarding_complete": False,
            },
        }
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@router.get("/me")
def me(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    payload = decode_token(auth_header[7:])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    db = SessionLocal()
    try:
        cred = db.execute(
            select(UserCredential).where(UserCredential.entity_id == payload["sub"])
        ).scalar_one_or_none()

        if not cred:
            raise HTTPException(status_code=401, detail="User not found")

        info = _entity_info(db, cred)
        return {
            "id": cred.entity_id,
            "email": cred.email,
            "type": cred.entity_type,
            "name": info["name"],
            "onboarding_complete": info["onboarding_complete"],
        }
    finally:
        db.close()


@router.post("/demo/merchant")
def demo_merchant():
    """Return a demo JWT for the demo merchant — no password needed."""
    token = create_token(subject="merch_demo_001", role="merchant", extra={"demo": True})
    return {
        "token": token,
        "user": {
            "id": "merch_demo_001",
            "email": "demo@cloudrun.shop",
            "type": "merchant",
            "name": "Austin Vape Co",
            "onboarding_complete": True,
        },
    }
