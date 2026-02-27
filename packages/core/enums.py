from enum import Enum

class OrderStatus(str, Enum):
    CREATED = "CREATED"
    VERIFYING_AGE = "VERIFYING_AGE"
    PAYMENT_AUTH = "PAYMENT_AUTH"
    MERCHANT_ACCEPTED = "MERCHANT_ACCEPTED"
    DISPATCHING = "DISPATCHING"
    PICKUP = "PICKUP"
    EN_ROUTE = "EN_ROUTE"
    DOORSTEP_VERIFY = "DOORSTEP_VERIFY"
    DELIVERED = "DELIVERED"
    REFUSED_RETURNING = "REFUSED_RETURNING"
    CANCELED = "CANCELED"

class TaskStatus(str, Enum):
    UNASSIGNED = "UNASSIGNED"
    OFFERED = "OFFERED"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    PASSED = "PASSED"
    FAILED = "FAILED"

class DriverStatus(str, Enum):
    APPLIED = "APPLIED"
    ACTIVE = "ACTIVE"
    EXPIRING_SOON = "EXPIRING_SOON"
    SUSPENDED = "SUSPENDED"

class ActorType(str, Enum):
    customer = "customer"
    driver = "driver"
    merchant = "merchant"
    system = "system"
    support = "support"
