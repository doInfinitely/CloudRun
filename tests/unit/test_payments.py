"""Unit tests for the payment processor."""
import os

# Force fake processor for tests
os.environ["PAYMENT_PROCESSOR"] = "fake"

from packages.payments.processor import authorize, capture, refund
from packages.payments.processor_fake import authorize as fake_authorize


def test_fake_authorize():
    result = fake_authorize(1500)
    assert result["processor"] == "fake"
    assert result["amount_cents"] == 1500
    assert result["payment_intent_id"].startswith("pi_")


def test_orchestrator_authorize_fake():
    result = authorize(2000)
    assert result["processor"] == "fake"
    assert result["amount_cents"] == 2000


def test_orchestrator_capture_fake():
    result = capture("pi_test123")
    assert result["processor"] == "fake"
    assert result["status"] == "captured"


def test_orchestrator_refund_fake():
    result = refund("pi_test123")
    assert result["processor"] == "fake"
    assert result["status"] == "refunded"
