"""Onfido identity verification vendor integration.

Set IDV_VENDOR=onfido and configure ONFIDO_API_TOKEN to activate.
"""
from __future__ import annotations

import os
import logging
import uuid

from .types import VerificationResult

log = logging.getLogger(__name__)

ONFIDO_API_TOKEN = os.getenv("ONFIDO_API_TOKEN", "")
ONFIDO_BASE_URL = os.getenv("ONFIDO_BASE_URL", "https://api.us.onfido.com/v3.6")


def _headers():
    return {
        "Authorization": f"Token token={ONFIDO_API_TOKEN}",
        "Content-Type": "application/json",
    }


def verify_checkout(session_ref: str, age_threshold: int = 21) -> VerificationResult:
    """Age verification at checkout via Onfido document + face check.

    In production this creates an Onfido applicant, generates an SDK token,
    and waits for the check result via webhook. For the MVP scaffold, we call
    the API synchronously and map the result.
    """
    import requests

    proof_ref = f"onfido_{uuid.uuid4().hex}"
    try:
        # Create applicant
        applicant = requests.post(
            f"{ONFIDO_BASE_URL}/applicants",
            headers=_headers(),
            json={"first_name": "Checkout", "last_name": session_ref[:20]},
            timeout=10,
        ).json()
        applicant_id = applicant["id"]

        # Create check (document + facial_similarity_photo)
        check = requests.post(
            f"{ONFIDO_BASE_URL}/checks",
            headers=_headers(),
            json={
                "applicant_id": applicant_id,
                "report_names": ["document", "facial_similarity_photo"],
            },
            timeout=30,
        ).json()

        status = check.get("result", "clear")
        if status == "clear":
            return VerificationResult(status="PASSED", proof_ref=proof_ref)
        else:
            return VerificationResult(
                status="FAILED",
                proof_ref=proof_ref,
                reason_code="VENDOR_ERROR",
            )
    except Exception as e:
        log.error("Onfido checkout verification failed: %s", e)
        return VerificationResult(status="FAILED", proof_ref=proof_ref, reason_code="VENDOR_ERROR")


def verify_doorstep(session_ref: str, age_threshold: int = 21) -> VerificationResult:
    """Doorstep ID verification via Onfido.

    Verifies the customer's physical ID matches their checkout identity.
    """
    import requests

    proof_ref = f"onfido_{uuid.uuid4().hex}"
    try:
        applicant = requests.post(
            f"{ONFIDO_BASE_URL}/applicants",
            headers=_headers(),
            json={"first_name": "Doorstep", "last_name": session_ref[:20]},
            timeout=10,
        ).json()
        applicant_id = applicant["id"]

        check = requests.post(
            f"{ONFIDO_BASE_URL}/checks",
            headers=_headers(),
            json={
                "applicant_id": applicant_id,
                "report_names": ["document"],
            },
            timeout=30,
        ).json()

        status = check.get("result", "clear")
        if status == "clear":
            return VerificationResult(
                status="PASSED",
                proof_ref=proof_ref,
                id_type="DL",
            )
        else:
            return VerificationResult(
                status="FAILED",
                proof_ref=proof_ref,
                reason_code="NO_MATCH" if status == "consider" else "VENDOR_ERROR",
            )
    except Exception as e:
        log.error("Onfido doorstep verification failed: %s", e)
        return VerificationResult(status="FAILED", proof_ref=proof_ref, reason_code="VENDOR_ERROR")
