from dataclasses import dataclass
from typing import Literal, Optional

ReasonCode = Literal["UNDERAGE","NO_MATCH","DOC_INVALID","VENDOR_ERROR","NO_ID","EXPIRED","MISMATCH","SUSPECTED_FAKE"]

@dataclass
class VerificationResult:
    status: Literal["PASSED","FAILED"]
    proof_ref: str
    dob_year: Optional[int] = None
    id_type: Optional[str] = None
    id_last4: Optional[str] = None
    reason_code: Optional[ReasonCode] = None
