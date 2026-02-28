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


# --- Merchant schemas ---

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price_cents: int = Field(ge=0)
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True
    sort_order: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = Field(default=None, ge=0)
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    sort_order: Optional[int] = None

class StoreUpdate(BaseModel):
    accepting_orders: Optional[bool] = None
    hours_json: Optional[Dict[str, Any]] = None

class MerchantOrderAction(BaseModel):
    action: str  # "accept" or "reject"


# --- Admin / Support schemas ---

class MerchantApplication(BaseModel):
    legal_name: str
    ein: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    business_type: Optional[str] = None
    application_notes: Optional[str] = None

class MerchantReview(BaseModel):
    action: str  # "approve" or "reject"
    notes: Optional[str] = None

class TicketCreate(BaseModel):
    requester_type: str
    requester_id: str
    order_id: Optional[str] = None
    subject: str
    body: str
    category: Optional[str] = None
    priority: str = "MEDIUM"

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None

class TicketMessageCreate(BaseModel):
    sender_type: str
    sender_id: str
    body: str

class AdminOrderAction(BaseModel):
    action: str  # "cancel" or "reassign"
    driver_id: Optional[str] = None

class DriverDocumentReview(BaseModel):
    action: str  # "approve" or "reject"
    notes: Optional[str] = None

class MerchantCreate(BaseModel):
    legal_name: str
    ein: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    business_type: Optional[str] = None
