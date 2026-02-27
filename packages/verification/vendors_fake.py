from __future__ import annotations
import uuid
from datetime import date
from .types import VerificationResult

# Fake vendor rules:
# - If session_ref contains "pass" => PASSED with dob_year=1999
# - If contains "underage" => FAILED UNDERAGE
# - If contains "noid" => FAILED NO_ID
# - else FAILED VENDOR_ERROR

def verify_checkout(session_ref: str, age_threshold: int = 21) -> VerificationResult:
    proof_ref = f"proof_{uuid.uuid4().hex}"
    if "pass" in session_ref:
        return VerificationResult(status="PASSED", proof_ref=proof_ref, dob_year=1999)
    if "underage" in session_ref:
        return VerificationResult(status="FAILED", proof_ref=proof_ref, reason_code="UNDERAGE")
    return VerificationResult(status="FAILED", proof_ref=proof_ref, reason_code="VENDOR_ERROR")

def verify_doorstep(session_ref: str, age_threshold: int = 21) -> VerificationResult:
    proof_ref = f"proof_{uuid.uuid4().hex}"
    if "pass" in session_ref:
        return VerificationResult(status="PASSED", proof_ref=proof_ref, dob_year=1999, id_type="DL", id_last4="1234")
    if "noid" in session_ref:
        return VerificationResult(status="FAILED", proof_ref=proof_ref, reason_code="NO_ID")
    if "mismatch" in session_ref:
        return VerificationResult(status="FAILED", proof_ref=proof_ref, reason_code="MISMATCH")
    if "underage" in session_ref:
        return VerificationResult(status="FAILED", proof_ref=proof_ref, reason_code="UNDERAGE")
    return VerificationResult(status="FAILED", proof_ref=proof_ref, reason_code="VENDOR_ERROR")
