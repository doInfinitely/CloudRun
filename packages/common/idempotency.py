from __future__ import annotations
import hashlib
import json
from typing import Callable, Tuple, Any
from sqlalchemy.orm import Session
from packages.db.models import IdempotencyKey

def _hash_request(body: Any) -> str:
    payload = json.dumps(body, separators=(",", ":"), sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()

def get_or_set(
    db: Session,
    *,
    key: str,
    route: str,
    request_body: Any,
    compute: Callable[[], Tuple[int, dict]],
) -> Tuple[int, dict, bool]:
    """Return (status_code, response_json, replayed)."""
    req_hash = _hash_request(request_body)
    existing = db.query(IdempotencyKey).filter(IdempotencyKey.key == key, IdempotencyKey.route == route).one_or_none()
    if existing:
        if existing.request_hash != req_hash:
            raise ValueError("Idempotency-Key reuse with different request body")
        return existing.status_code, existing.response_json, True

    status_code, resp = compute()
    rec = IdempotencyKey(
        key=key,
        route=route,
        request_hash=req_hash,
        status_code=status_code,
        response_json=resp,
    )
    db.add(rec)
    db.flush()
    return status_code, resp, False
