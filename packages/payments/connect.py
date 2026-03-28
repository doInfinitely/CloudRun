"""Stripe Connect Express account management.

Set PAYMENT_PROCESSOR=stripe and STRIPE_SECRET_KEY to use real Stripe.
Otherwise runs in fake mode for local development.
"""
from __future__ import annotations

import os
import logging

log = logging.getLogger(__name__)

PAYMENT_PROCESSOR = os.getenv("PAYMENT_PROCESSOR", "fake")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")


def create_express_account(entity_type: str, entity_id: str, email: str) -> dict:
    """Create a Stripe Express connected account."""
    if PAYMENT_PROCESSOR == "stripe" and STRIPE_SECRET_KEY:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        account = stripe.Account.create(
            type="express",
            email=email,
            metadata={"entity_type": entity_type, "entity_id": entity_id},
        )
        return {"stripe_account_id": account.id}

    # Fake mode
    fake_id = f"acct_fake_{entity_id}"
    log.info("FAKE Stripe Connect: created account %s", fake_id)
    return {"stripe_account_id": fake_id}


def create_account_link(stripe_account_id: str, return_url: str, refresh_url: str) -> dict:
    """Generate a Stripe-hosted onboarding URL for the Express account."""
    if PAYMENT_PROCESSOR == "stripe" and STRIPE_SECRET_KEY:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        link = stripe.AccountLink.create(
            account=stripe_account_id,
            return_url=return_url,
            refresh_url=refresh_url,
            type="account_onboarding",
        )
        return {"url": link.url}

    # Fake mode — redirect straight to return_url with success param
    separator = "&" if "?" in return_url else "?"
    fake_url = f"{return_url}{separator}stripe_onboarding=complete"
    log.info("FAKE Stripe Connect: account link -> %s", fake_url)
    return {"url": fake_url}


def get_account_status(stripe_account_id: str) -> dict:
    """Check whether an Express account has completed onboarding."""
    if PAYMENT_PROCESSOR == "stripe" and STRIPE_SECRET_KEY:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        account = stripe.Account.retrieve(stripe_account_id)
        return {
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled,
            "details_submitted": account.details_submitted,
        }

    # Fake mode — always return fully onboarded
    log.info("FAKE Stripe Connect: account status for %s -> all true", stripe_account_id)
    return {
        "charges_enabled": True,
        "payouts_enabled": True,
        "details_submitted": True,
    }
