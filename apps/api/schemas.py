from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class OrderItemIn(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)

class CreateOrderIn(BaseModel):
    customer_id: str
    store_id: str
    address_id: str
    items: List[OrderItemIn]
    tip_cents: int = 0
    disclosure_version: str

class VerifyAgeIn(BaseModel):
    session_ref: str

class AuthorizePaymentIn(BaseModel):
    payment_method_id: str

class DoorstepSubmitIn(BaseModel):
    session_ref: str

class DeliverConfirmIn(BaseModel):
    attestation_ref: str
    gps: Dict[str, float]

class RefuseIn(BaseModel):
    reason_code: str
    notes: Optional[str] = None
    gps: Dict[str, float]
