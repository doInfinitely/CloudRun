"""Unit tests for the order state machine."""
import pytest

from packages.core.enums import OrderStatus
from packages.core.state_machine import OrderStateMachine
from packages.core.errors import InvalidStateTransition


def test_created_to_verifying_age():
    sm = OrderStateMachine(OrderStatus.CREATED)
    sm2 = sm.transition(OrderStatus.VERIFYING_AGE)
    assert sm2.status == OrderStatus.VERIFYING_AGE


def test_full_happy_path():
    states = [
        OrderStatus.CREATED,
        OrderStatus.VERIFYING_AGE,
        OrderStatus.PAYMENT_AUTH,
        OrderStatus.PENDING_MERCHANT,
        OrderStatus.MERCHANT_ACCEPTED,
        OrderStatus.DISPATCHING,
        OrderStatus.PICKUP,
        OrderStatus.EN_ROUTE,
        OrderStatus.DOORSTEP_VERIFY,
        OrderStatus.DELIVERED,
    ]
    sm = OrderStateMachine(states[0])
    for next_state in states[1:]:
        sm = sm.transition(next_state)
    assert sm.status == OrderStatus.DELIVERED


def test_invalid_transition_raises():
    sm = OrderStateMachine(OrderStatus.CREATED)
    with pytest.raises(InvalidStateTransition):
        sm.transition(OrderStatus.DELIVERED)


def test_state_machine_is_frozen():
    sm = OrderStateMachine(OrderStatus.CREATED)
    sm2 = sm.transition(OrderStatus.VERIFYING_AGE)
    # Original should be unchanged
    assert sm.status == OrderStatus.CREATED
    assert sm2.status == OrderStatus.VERIFYING_AGE


def test_cancel_from_multiple_states():
    cancellable = [
        OrderStatus.CREATED,
        OrderStatus.VERIFYING_AGE,
        OrderStatus.PAYMENT_AUTH,
        OrderStatus.PENDING_MERCHANT,
    ]
    for s in cancellable:
        sm = OrderStateMachine(s)
        sm2 = sm.transition(OrderStatus.CANCELED)
        assert sm2.status == OrderStatus.CANCELED


def test_delivered_cannot_cancel():
    sm = OrderStateMachine(OrderStatus.DELIVERED)
    with pytest.raises(InvalidStateTransition):
        sm.transition(OrderStatus.CANCELED)


def test_delivered_self_transition():
    sm = OrderStateMachine(OrderStatus.DELIVERED)
    sm2 = sm.transition(OrderStatus.DELIVERED)
    assert sm2.status == OrderStatus.DELIVERED
