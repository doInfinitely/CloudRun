import uuid

def authorize(amount_cents: int) -> dict:
    # Mimics Stripe PaymentIntent authorization response minimally
    return {"processor": "fake", "payment_intent_id": f"pi_{uuid.uuid4().hex}", "amount_cents": amount_cents}
