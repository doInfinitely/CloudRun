from __future__ import annotations
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from packages.db.session import get_db
from packages.db.models import Driver

router = APIRouter(prefix="/v1", tags=["profile"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads")
ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png"}
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5MB


class ProfileUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None


def _driver_profile(d: Driver) -> dict:
    return {
        "id": d.id,
        "name": d.name,
        "email": d.email,
        "phone": d.phone,
        "photo_url": d.photo_url,
        "status": d.status,
    }


@router.get("/drivers/{driver_id}/profile")
def get_profile(driver_id: str, db: Session = Depends(get_db)):
    d = db.get(Driver, driver_id)
    if not d:
        raise HTTPException(404, "driver not found")
    vehicles = [
        {
            "id": v.id,
            "make": v.make,
            "model": v.model,
            "year": v.year,
            "color": v.color,
            "license_plate": v.license_plate,
            "is_active": v.is_active,
        }
        for v in d.vehicles
    ]
    return {**_driver_profile(d), "vehicles": vehicles}


@router.put("/drivers/{driver_id}/profile")
def update_profile(driver_id: str, body: ProfileUpdate, db: Session = Depends(get_db)):
    d = db.get(Driver, driver_id)
    if not d:
        raise HTTPException(404, "driver not found")
    if body.name is not None:
        d.name = body.name
    if body.email is not None:
        d.email = body.email
    if body.phone is not None:
        d.phone = body.phone
    db.commit()
    return _driver_profile(d)


@router.post("/drivers/{driver_id}/profile/photo")
async def upload_photo(driver_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    d = db.get(Driver, driver_id)
    if not d:
        raise HTTPException(404, "driver not found")
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(400, "Only JPEG and PNG files are allowed")
    contents = await file.read()
    if len(contents) > MAX_PHOTO_SIZE:
        raise HTTPException(400, "File too large (max 5MB)")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = "jpg" if file.content_type == "image/jpeg" else "png"
    filename = f"{driver_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    d.photo_url = f"/uploads/{filename}"
    db.commit()
    return {"photo_url": d.photo_url}
