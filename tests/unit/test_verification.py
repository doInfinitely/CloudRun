"""Unit tests for the fake verification vendor."""
from packages.verification.vendors_fake import verify_checkout, verify_doorstep


def test_checkout_pass():
    result = verify_checkout("session_pass_123")
    assert result.status == "PASSED"
    assert result.proof_ref.startswith("proof_")
    assert result.dob_year == 1999


def test_checkout_underage():
    result = verify_checkout("session_underage_456")
    assert result.status == "FAILED"
    assert result.reason_code == "UNDERAGE"


def test_checkout_vendor_error():
    result = verify_checkout("session_other")
    assert result.status == "FAILED"
    assert result.reason_code == "VENDOR_ERROR"


def test_doorstep_pass():
    result = verify_doorstep("session_pass_789")
    assert result.status == "PASSED"
    assert result.id_type == "DL"
    assert result.id_last4 == "1234"


def test_doorstep_noid():
    result = verify_doorstep("session_noid_abc")
    assert result.status == "FAILED"
    assert result.reason_code == "NO_ID"


def test_doorstep_mismatch():
    result = verify_doorstep("session_mismatch_def")
    assert result.status == "FAILED"
    assert result.reason_code == "MISMATCH"


def test_doorstep_underage():
    result = verify_doorstep("session_underage_ghi")
    assert result.status == "FAILED"
    assert result.reason_code == "UNDERAGE"
