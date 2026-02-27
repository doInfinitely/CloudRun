from __future__ import annotations
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from packages.db.models import DeliveryTask, OfferLog
from packages.dossier.writer import emit_order_event

from packages.dossier.writer import emit_order_event

def _try_pg_advisory_lock(db: Session, key: int = 9001001) -> bool:
    """Best-effort Postgres advisory lock so only one sweeper runs.

    Returns True if lock acquired or DB isn't Postgres.
    """
    try:
        res = db.execute("SELECT pg_try_advisory_lock(:k)", {"k": key}).scalar()
        return bool(res)
    except Exception:
        # Not Postgres or not permitted; proceed without lock.
        return True

def _pg_advisory_unlock(db: Session, key: int = 9001001) -> None:
    try:
        db.execute("SELECT pg_advisory_unlock(:k)", {"k": key})
    except Exception:
        pass

def expire_offers(db: Session, *, now_ms: Optional[int] = None, limit: int = 500) -> Dict:
    """Expire OFFERED tasks past offer_expires_at and mark OfferLog as TIMEOUT.

    This should be run periodically (e.g. every 10-30 seconds) by a scheduler or a Cloud Run job.
    """
    now_ms = now_ms or int(time.time() * 1000)
    now_dt = datetime.fromtimestamp(now_ms / 1000.0, tz=timezone.utc)

    if not _try_pg_advisory_lock(db):
        return {"expired_tasks": 0, "updated_offer_logs": 0, "skipped": True}

    try:
        q = (
            db.query(DeliveryTask)
            .filter(DeliveryTask.status == "OFFERED")
            .filter(DeliveryTask.offer_expires_at.isnot(None))
            .filter(DeliveryTask.offer_expires_at < now_dt)
        )
        # Avoid concurrent sweepers expiring the same rows (Postgres supports SKIP LOCKED).
        try:
            q = q.with_for_update(skip_locked=True)
        except Exception:
            pass
        tasks = q.limit(limit).all()
    finally:
        _pg_advisory_unlock(db)

    expired = 0
    updated_logs = 0
    for t in tasks:
        # mark task expired
        t.status = "EXPIRED"
        expired += 1

        emit_order_event(
            db,
            order_id=t.order_id,
            actor_type="system",
            actor_id="dispatch",
            event_type="TASK_EXPIRED",
            payload={"task_id": t.id, "driver_id": t.offered_to_driver_id, "expired_at": now_dt.isoformat()},
        )

        # best-effort: mark offer log outcome = TIMEOUT
        log = (
            db.query(OfferLog)
            .filter(OfferLog.task_id == t.id)
            .order_by(OfferLog.created_at.desc())
            .first()
        )
        if log and not log.outcome:
            log.outcome = "TIMEOUT"
            log.outcome_ms = now_ms
            # approximate latency if we can parse created_at
            try:
                created_ms = int(log.created_at.replace(tzinfo=timezone.utc).timestamp() * 1000)
                log.response_latency_ms = max(0, now_ms - created_ms)
            except Exception:
                pass
            updated_logs += 1

    return {"expired_tasks": expired, "updated_offer_logs": updated_logs}
