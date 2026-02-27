import os
import uuid
import pytest
from fastapi.testclient import TestClient

from apps.api.main import app
from packages.db.session import SessionLocal
from packages.db.models import Merchant, Store, Customer, CustomerAddress

client = TestClient(app)

pytestmark = pytest.mark.skipif(os.getenv("RUN_INTEGRATION") != "1", reason="Set RUN_INTEGRATION=1 and run scripts/run_integration.sh")

def seed_once():
    db = SessionLocal()
    try:
        if db.get(Merchant, "m_1"):
            return
        db.add(Merchant(id="m_1", legal_name="Test Merchant"))
        db.add(Store(id="store_1", merchant_id="m_1", address="123 Test St"))
        db.add(Customer(id="cust_1", name="Test Customer"))
        db.add(CustomerAddress(id="addr_1", customer_id="cust_1", address="999 Dropoff Ave"))
        db.commit()
    finally:
        db.close()

def test_happy_path_checkout_to_delivery():
    seed_once()
    r = client.post("/v1/orders", json={
        "customer_id":"cust_1","store_id":"store_1","address_id":"addr_1",
        "items":[{"product_id":"prod_1","quantity":1}],
        "tip_cents":0,"disclosure_version":"tx-v1.0"
    })
    assert r.status_code == 200
    order_id = r.json()["order_id"]

    r = client.post(f"/v1/orders/{order_id}/verify_age", headers={"Idempotency-Key": str(uuid.uuid4())}, json={"session_ref":"pass"})
    assert r.status_code == 200

    r = client.post(f"/v1/orders/{order_id}/payment/authorize", headers={"Idempotency-Key": str(uuid.uuid4())}, json={"payment_method_id":"pm_x"})
    assert r.status_code == 200

    r = client.post(f"/v1/orders/{order_id}/doorstep_id_check/submit", headers={"Idempotency-Key": str(uuid.uuid4())}, json={"session_ref":"pass"})
    assert r.status_code == 200

    r = client.post(f"/v1/orders/{order_id}/deliver/confirm", headers={"Idempotency-Key": str(uuid.uuid4())}, json={"attestation_ref":"att_1","gps":{"lat":32.9,"lng":-96.9}})
    assert r.status_code == 200
    assert r.json()["order_status"] == "DELIVERED"

def test_underage_checkout_blocked():
    seed_once()
    r = client.post("/v1/orders", json={
        "customer_id":"cust_1","store_id":"store_1","address_id":"addr_1",
        "items":[{"product_id":"prod_1","quantity":1}],
        "tip_cents":0,"disclosure_version":"tx-v1.0"
    })
    order_id = r.json()["order_id"]
    r = client.post(f"/v1/orders/{order_id}/verify_age", headers={"Idempotency-Key": str(uuid.uuid4())}, json={"session_ref":"underage"})
    assert r.status_code == 403


def test_doorstep_noid_creates_return_task():
    seed_once()
    r = client.post("/v1/orders", json={
        "customer_id":"cust_1","store_id":"store_1","address_id":"addr_1",
        "items":[{"product_id":"prod_1","quantity":1}],
        "tip_cents":0,"disclosure_version":"tx-v1.0"
    })
    order_id = r.json()["order_id"]

    r = client.post(f"/v1/orders/{order_id}/verify_age", headers={"Idempotency-Key": str(uuid.uuid4())}, json={"session_ref":"pass"})
    assert r.status_code == 200
    r = client.post(f"/v1/orders/{order_id}/payment/authorize", headers={"Idempotency-Key": str(uuid.uuid4())}, json={"payment_method_id":"pm_x"})
    assert r.status_code == 200

    # doorstep fails with noid
    r = client.post(f"/v1/orders/{order_id}/doorstep_id_check/submit", headers={"Idempotency-Key": str(uuid.uuid4())}, json={"session_ref":"noid"})
    assert r.status_code == 403

    dossier = client.get(f"/v1/orders/{order_id}/dossier").json()
    assert any(e["event_type"] == "RETURN_INITIATED" for e in dossier["events"])
