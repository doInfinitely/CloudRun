from __future__ import annotations
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from packages.db.session import get_db
from packages.db.models import Driver, DriverVehicle, DriverDocument

router = APIRouter(prefix="/v1", tags=["vehicles"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads")
ALLOWED_DOC_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_DOC_SIZE = 10 * 1024 * 1024  # 10MB


class VehicleCreate(BaseModel):
    make: str
    model: str
    year: int | None = None
    color: str | None = None
    license_plate: str | None = None


def _vehicle_dict(v: DriverVehicle) -> dict:
    return {
        "id": v.id,
        "make": v.make,
        "model": v.model,
        "year": v.year,
        "color": v.color,
        "license_plate": v.license_plate,
        "is_active": v.is_active,
    }


def _doc_dict(d: DriverDocument) -> dict:
    return {
        "id": d.id,
        "doc_type": d.doc_type,
        "file_url": d.file_url,
        "status": d.status,
        "vehicle_id": d.vehicle_id,
        "expires_at": d.expires_at.isoformat() if d.expires_at else None,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


def _require_driver(driver_id: str, db: Session) -> Driver:
    d = db.get(Driver, driver_id)
    if not d:
        raise HTTPException(404, "driver not found")
    return d


@router.get("/drivers/{driver_id}/vehicles")
def list_vehicles(driver_id: str, db: Session = Depends(get_db)):
    _require_driver(driver_id, db)
    vehicles = db.query(DriverVehicle).filter(DriverVehicle.driver_id == driver_id).all()
    return {"vehicles": [_vehicle_dict(v) for v in vehicles]}


@router.post("/drivers/{driver_id}/vehicles")
def create_vehicle(driver_id: str, body: VehicleCreate, db: Session = Depends(get_db)):
    _require_driver(driver_id, db)
    v = DriverVehicle(
        id=f"veh_{uuid.uuid4().hex[:12]}",
        driver_id=driver_id,
        make=body.make,
        model=body.model,
        year=body.year,
        color=body.color,
        license_plate=body.license_plate,
    )
    db.add(v)
    db.commit()
    return _vehicle_dict(v)


@router.delete("/drivers/{driver_id}/vehicles/{vehicle_id}")
def delete_vehicle(driver_id: str, vehicle_id: str, db: Session = Depends(get_db)):
    _require_driver(driver_id, db)
    v = db.get(DriverVehicle, vehicle_id)
    if not v or v.driver_id != driver_id:
        raise HTTPException(404, "vehicle not found")
    db.delete(v)
    db.commit()
    return {"deleted": True}


@router.get("/drivers/{driver_id}/vehicles/{vehicle_id}/documents")
def list_vehicle_documents(driver_id: str, vehicle_id: str, db: Session = Depends(get_db)):
    _require_driver(driver_id, db)
    docs = (
        db.query(DriverDocument)
        .filter(DriverDocument.driver_id == driver_id, DriverDocument.vehicle_id == vehicle_id)
        .all()
    )
    return {"documents": [_doc_dict(d) for d in docs]}


@router.post("/drivers/{driver_id}/vehicles/{vehicle_id}/documents")
async def upload_vehicle_document(
    driver_id: str,
    vehicle_id: str,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    _require_driver(driver_id, db)
    v = db.get(DriverVehicle, vehicle_id)
    if not v or v.driver_id != driver_id:
        raise HTTPException(404, "vehicle not found")
    if doc_type not in ("INSURANCE", "REGISTRATION"):
        raise HTTPException(400, "doc_type must be INSURANCE or REGISTRATION")
    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, and PDF files are allowed")
    contents = await file.read()
    if len(contents) > MAX_DOC_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin"
    filename = f"{driver_id}_{vehicle_id}_{doc_type}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    doc = DriverDocument(
        id=f"doc_{uuid.uuid4().hex[:12]}",
        driver_id=driver_id,
        vehicle_id=vehicle_id,
        doc_type=doc_type,
        file_url=f"/uploads/{filename}",
    )
    db.add(doc)
    db.commit()
    return _doc_dict(doc)


# Driver-level documents (e.g. LICENSE)
@router.get("/drivers/{driver_id}/documents")
def list_driver_documents(driver_id: str, db: Session = Depends(get_db)):
    _require_driver(driver_id, db)
    docs = (
        db.query(DriverDocument)
        .filter(DriverDocument.driver_id == driver_id, DriverDocument.vehicle_id.is_(None))
        .all()
    )
    return {"documents": [_doc_dict(d) for d in docs]}


@router.post("/drivers/{driver_id}/documents")
async def upload_driver_document(
    driver_id: str,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    _require_driver(driver_id, db)
    if doc_type != "LICENSE":
        raise HTTPException(400, "Driver-level doc_type must be LICENSE")
    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, and PDF files are allowed")
    contents = await file.read()
    if len(contents) > MAX_DOC_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin"
    filename = f"{driver_id}_LICENSE_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    doc = DriverDocument(
        id=f"doc_{uuid.uuid4().hex[:12]}",
        driver_id=driver_id,
        vehicle_id=None,
        doc_type=doc_type,
        file_url=f"/uploads/{filename}",
    )
    db.add(doc)
    db.commit()
    return _doc_dict(doc)
