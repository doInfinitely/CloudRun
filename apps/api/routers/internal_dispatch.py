from __future__ import annotations
import os
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from packages.db.session import get_db
from packages.dispatch.snapshot import build_dispatch_snapshot
from packages.dispatch.loops import run_fast_tick

router = APIRouter(prefix="/internal", tags=["internal"])

def _require_token(x_internal_token: str | None) -> None:
    expected = os.getenv("INTERNAL_API_TOKEN")
    if expected and x_internal_token != expected:
        raise HTTPException(401, "invalid internal token")

@router.post("/dispatch/tick")
def dispatch_tick(
    region_id: str = "tx-dfw",
    db: Session = Depends(get_db),
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
):
    _require_token(x_internal_token)
    snap = build_dispatch_snapshot(db, region_id=region_id)
    out = run_fast_tick(snap)
    return {"region_id": region_id, "snapshot_counts": {"drivers": len(snap["drivers"]), "jobs": len(snap["jobs"]), "tasks": len(snap["tasks"])}, "result": out}
