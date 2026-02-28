import os
import logging
from celery import Celery

from packages.db.session import SessionLocal
from packages.dispatch.snapshot import build_dispatch_snapshot
from packages.dispatch.loops import run_fast_tick
from packages.dispatch.expire import expire_offers
from packages.dispatch.batch_loop import run_batch_tick

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery = Celery("vape_mvp", broker=REDIS_URL, backend=REDIS_URL)

# ---------------------------------------------------------------------------
# Periodic beat schedule
# ---------------------------------------------------------------------------
celery.conf.beat_schedule = {
    "dispatch_tick": {
        "task": "apps.worker.celery_app.dispatch_tick",
        "schedule": 3.0,
    },
    "expire_stale_offers": {
        "task": "apps.worker.celery_app.expire_stale_offers",
        "schedule": 15.0,
    },
    "dispatch_batch_tick": {
        "task": "apps.worker.celery_app.dispatch_batch_tick",
        "schedule": 30.0,
    },
}


@celery.task
def ping():
    return "pong"


@celery.task(bind=True, max_retries=2, default_retry_delay=5)
def dispatch_tick(self):
    """FAST dispatch loop -- runs every ~3 s.

    Builds a DB snapshot for the default region and runs the min-cost-flow
    matching pipeline (candidate generation -> ETA refinement -> cost
    scoring -> MCF solver -> offer creation).
    """
    db = SessionLocal()
    try:
        snapshot = build_dispatch_snapshot(db, region_id="tx-dfw")
        result = run_fast_tick(snapshot)
        logger.info("dispatch_tick completed: %s", result)
        return result
    except Exception as exc:
        logger.exception("dispatch_tick failed")
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery.task(bind=True, max_retries=1, default_retry_delay=5)
def expire_stale_offers(self):
    """Sweep OFFERED tasks whose offer_expires_at has passed.

    Marks them EXPIRED and sets corresponding OfferLog outcomes to TIMEOUT.
    """
    db = SessionLocal()
    try:
        result = expire_offers(db)
        db.commit()
        logger.info("expire_stale_offers completed: %s", result)
        return result
    except Exception as exc:
        db.rollback()
        logger.exception("expire_stale_offers failed")
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery.task(bind=True, max_retries=1, default_retry_delay=10)
def dispatch_batch_tick(self):
    """BATCH dispatch loop -- runs every ~30 s.

    Builds a snapshot and runs VRP-style batch planning: clusters nearby
    pickups, plans multi-stop routes per driver with nearest-neighbor
    ordering, and commits the immediate next offer for each planned driver.
    """
    db = SessionLocal()
    try:
        snapshot = build_dispatch_snapshot(
            db, region_id="tx-dfw", horizon_s=20 * 60,
        )
        result = run_batch_tick(snapshot)
        logger.info("dispatch_batch_tick completed: %s", result)
        return result
    except Exception as exc:
        logger.exception("dispatch_batch_tick failed")
        raise self.retry(exc=exc)
    finally:
        db.close()
