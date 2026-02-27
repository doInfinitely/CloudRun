from __future__ import annotations
import os
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from packages.db.session import get_db
from packages.dispatch.expire import expire_offers

router = APIRouter(prefix="/internal", tags=["internal"])

def _require_token(x_internal_token: str | None) -> None:
    expected = os.getenv("INTERNAL_API_TOKEN")
    if expected and x_internal_token != expected:
        raise HTTPException(401, "invalid internal token")

@router.post("/dispatch/expire_offers")
def dispatch_expire_offers(
    limit: int = 500,
    db: Session = Depends(get_db),
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
):
    _require_token(x_internal_token)
    out = expire_offers(db, limit=limit)
    db.commit()
    return out
