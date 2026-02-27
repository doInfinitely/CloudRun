from __future__ import annotations
from dataclasses import dataclass
from .enums import OrderStatus
from .errors import InvalidStateTransition

# Centralized state machine logic to avoid "controllers doing transitions"
# Transitions are driven by high-level events.

ALLOWED = {
    OrderStatus.CREATED: {OrderStatus.VERIFYING_AGE, OrderStatus.CANCELED},
    OrderStatus.VERIFYING_AGE: {OrderStatus.PAYMENT_AUTH, OrderStatus.CANCELED},
    OrderStatus.PAYMENT_AUTH: {OrderStatus.PENDING_MERCHANT, OrderStatus.CANCELED},
    OrderStatus.PENDING_MERCHANT: {OrderStatus.MERCHANT_ACCEPTED, OrderStatus.CANCELED},
    OrderStatus.MERCHANT_ACCEPTED: {OrderStatus.DISPATCHING, OrderStatus.CANCELED},
    OrderStatus.DISPATCHING: {OrderStatus.PICKUP, OrderStatus.CANCELED},
    OrderStatus.PICKUP: {OrderStatus.EN_ROUTE, OrderStatus.CANCELED},
    OrderStatus.EN_ROUTE: {OrderStatus.DOORSTEP_VERIFY, OrderStatus.CANCELED},
    OrderStatus.DOORSTEP_VERIFY: {OrderStatus.DELIVERED, OrderStatus.REFUSED_RETURNING},
    OrderStatus.REFUSED_RETURNING: {OrderStatus.REFUSED_RETURNING},  # remains until return completed (future)
    OrderStatus.DELIVERED: {OrderStatus.DELIVERED},
    OrderStatus.CANCELED: {OrderStatus.CANCELED},
}

@dataclass(frozen=True)
class OrderStateMachine:
    status: OrderStatus

    def transition(self, to: OrderStatus) -> "OrderStateMachine":
        allowed = ALLOWED.get(self.status, set())
        if to not in allowed:
            raise InvalidStateTransition(f"Cannot transition {self.status} -> {to}")
        return OrderStateMachine(to)
