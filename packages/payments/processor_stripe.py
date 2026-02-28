"""Stripe payment processor integration.

Set PAYMENT_PROCESSOR=stripe and configure STRIPE_SECRET_KEY to activate.
"""
from __future__ import annotations

import os
import logging

log = logging.getLogger(__name__)

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")


def authorize(amount_cents: int, *, currency: str = "usd", metadata: dict | None = None) -> dict:
    """Create a Stripe PaymentIntent in 'requires_capture' mode (auth-only)."""
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency,
        capture_method="manual",
        metadata=metadata or {},
    )
    return {
        "processor": "stripe",
        "payment_intent_id": intent.id,
        "amount_cents": amount_cents,
        "client_secret": intent.client_secret,
        "status": intent.status,
    }


def capture(payment_intent_id: str, *, amount_cents: int | None = None) -> dict:
    """Capture a previously authorized PaymentIntent."""
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
    params = {}
    if amount_cents is not None:
        params["amount_to_capture"] = amount_cents
    intent = stripe.PaymentIntent.capture(payment_intent_id, **params)
    return {
        "processor": "stripe",
        "payment_intent_id": intent.id,
        "status": intent.status,
        "amount_captured": intent.amount_received,
    }


def refund(payment_intent_id: str, *, amount_cents: int | None = None) -> dict:
    """Refund a captured PaymentIntent (full or partial)."""
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
    params = {"payment_intent": payment_intent_id}
    if amount_cents is not None:
        params["amount"] = amount_cents
    r = stripe.Refund.create(**params)
    return {
        "processor": "stripe",
        "refund_id": r.id,
        "status": r.status,
        "amount": r.amount,
    }
