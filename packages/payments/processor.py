"""Payment processor orchestrator.

Routes to fake or Stripe based on PAYMENT_PROCESSOR env var.
"""
from __future__ import annotations

import os

PROCESSOR = os.getenv("PAYMENT_PROCESSOR", "fake").lower()


def authorize(amount_cents: int, **kwargs) -> dict:
    if PROCESSOR == "fake":
        from .processor_fake import authorize as _auth
        return _auth(amount_cents)
    if PROCESSOR == "stripe":
        from .processor_stripe import authorize as _auth
        return _auth(amount_cents, **kwargs)
    raise RuntimeError(f"Unknown PAYMENT_PROCESSOR: {PROCESSOR}")


def capture(payment_intent_id: str, **kwargs) -> dict:
    if PROCESSOR == "fake":
        return {"processor": "fake", "payment_intent_id": payment_intent_id, "status": "captured"}
    if PROCESSOR == "stripe":
        from .processor_stripe import capture as _cap
        return _cap(payment_intent_id, **kwargs)
    raise RuntimeError(f"Unknown PAYMENT_PROCESSOR: {PROCESSOR}")


def refund(payment_intent_id: str, **kwargs) -> dict:
    if PROCESSOR == "fake":
        return {"processor": "fake", "payment_intent_id": payment_intent_id, "status": "refunded"}
    if PROCESSOR == "stripe":
        from .processor_stripe import refund as _ref
        return _ref(payment_intent_id, **kwargs)
    raise RuntimeError(f"Unknown PAYMENT_PROCESSOR: {PROCESSOR}")
