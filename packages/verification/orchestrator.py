from __future__ import annotations
import os
from .types import VerificationResult

VENDOR = os.getenv("IDV_VENDOR", "fake").lower()

def verify_age_checkout(session_ref: str, age_threshold: int = 21) -> VerificationResult:
    if VENDOR == "fake":
        from .vendors_fake import verify_checkout
        return verify_checkout(session_ref=session_ref, age_threshold=age_threshold)
    if VENDOR == "onfido":
        from .vendors_onfido import verify_checkout
        return verify_checkout(session_ref=session_ref, age_threshold=age_threshold)
    raise RuntimeError(f"Unknown IDV_VENDOR: {VENDOR}")

def verify_id_doorstep(session_ref: str, age_threshold: int = 21) -> VerificationResult:
    if VENDOR == "fake":
        from .vendors_fake import verify_doorstep
        return verify_doorstep(session_ref=session_ref, age_threshold=age_threshold)
    if VENDOR == "onfido":
        from .vendors_onfido import verify_doorstep
        return verify_doorstep(session_ref=session_ref, age_threshold=age_threshold)
    raise RuntimeError(f"Unknown IDV_VENDOR: {VENDOR}")
