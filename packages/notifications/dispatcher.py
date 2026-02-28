"""Notification dispatcher.

Routes notifications to the appropriate channel (SMS, push, email).
MVP uses a console logger; swap in real providers via NOTIFICATION_PROVIDER env var.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

log = logging.getLogger(__name__)

PROVIDER = os.getenv("NOTIFICATION_PROVIDER", "console")


def notify_customer(customer_id: str, event: str, payload: dict) -> None:
    """Send a notification to a customer about an order event."""
    if PROVIDER == "console":
        log.info("NOTIFY customer=%s event=%s payload=%s", customer_id, event, payload)
        return
    if PROVIDER == "twilio":
        _send_sms(payload.get("phone"), _customer_message(event, payload))
        return


def notify_driver(driver_id: str, event: str, payload: dict) -> None:
    """Send a notification to a driver about a task event."""
    if PROVIDER == "console":
        log.info("NOTIFY driver=%s event=%s payload=%s", driver_id, event, payload)
        return
    if PROVIDER == "twilio":
        _send_sms(payload.get("phone"), _driver_message(event, payload))
        return


def notify_merchant(merchant_id: str, event: str, payload: dict) -> None:
    """Send a notification to a merchant about an order event."""
    if PROVIDER == "console":
        log.info("NOTIFY merchant=%s event=%s payload=%s", merchant_id, event, payload)
        return


# ── message templates ───────────────────────────────────────────────

def _customer_message(event: str, payload: dict) -> str:
    order_id = payload.get("order_id", "")[:8]
    templates = {
        "ORDER_CONFIRMED": f"Your order {order_id} has been confirmed! A driver will be assigned shortly.",
        "DRIVER_ASSIGNED": f"A driver is heading to pick up your order {order_id}.",
        "EN_ROUTE": f"Your order {order_id} is on its way!",
        "DELIVERED": f"Your order {order_id} has been delivered. Enjoy!",
        "CANCELED": f"Your order {order_id} has been canceled.",
    }
    return templates.get(event, f"Update on order {order_id}: {event}")


def _driver_message(event: str, payload: dict) -> str:
    task_id = payload.get("task_id", "")[:8]
    templates = {
        "TASK_OFFERED": f"New delivery offer {task_id}! Open the app to accept.",
        "TASK_EXPIRED": f"Offer {task_id} has expired.",
    }
    return templates.get(event, f"Task update {task_id}: {event}")


# ── provider implementations ────────────────────────────────────────

def _send_sms(phone: Optional[str], body: str) -> None:
    """Send SMS via Twilio. Requires TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM."""
    if not phone:
        log.warning("SMS skipped: no phone number")
        return
    try:
        from twilio.rest import Client
        sid = os.environ["TWILIO_SID"]
        token = os.environ["TWILIO_TOKEN"]
        from_num = os.environ["TWILIO_FROM"]
        client = Client(sid, token)
        client.messages.create(to=phone, from_=from_num, body=body)
    except Exception as e:
        log.error("SMS send failed: %s", e)
