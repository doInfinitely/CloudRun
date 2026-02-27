from __future__ import annotations
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Date, ForeignKey, JSON, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

# Minimal subset for MVP + tests

class Merchant(Base):
    __tablename__ = "merchants"
    id = Column(String, primary_key=True)
    legal_name = Column(String, nullable=False)
    ein = Column(String, nullable=True)
    status = Column(String, nullable=False, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    stores = relationship("Store", back_populates="merchant")

class Store(Base):
    __tablename__ = "stores"
    id = Column(String, primary_key=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False)
    name = Column(String, nullable=True)
    address = Column(Text, nullable=False)
    lat = Column(String, nullable=True)
    lng = Column(String, nullable=True)
    hours_json = Column(JSON, nullable=False, default=dict)
    geofence_json = Column(JSON, nullable=False, default=dict)
    status = Column(String, nullable=False, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    accepting_orders = Column(Boolean, nullable=False, default=True, server_default="true")

    merchant = relationship("Merchant", back_populates="stores")
    products = relationship("Product", back_populates="store", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price_cents = Column(Integer, nullable=False)
    category = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    is_available = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    store = relationship("Store", back_populates="products")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=True)
    dob = Column(Date, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    status = Column(String, nullable=False, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class CustomerAddress(Base):
    __tablename__ = "customer_addresses"
    id = Column(String, primary_key=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    address = Column(Text, nullable=False)
    lat = Column(String, nullable=True)
    lng = Column(String, nullable=True)
    deliverable_flag = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class CustomerAgeVerification(Base):
    __tablename__ = "customer_age_verifications"
    id = Column(String, primary_key=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    method = Column(String, nullable=False)
    vendor = Column(String, nullable=False)
    status = Column(String, nullable=False)  # PENDING/PASSED/FAILED
    proof_ref = Column(String, nullable=True)
    reason_code = Column(String, nullable=True)
    dob_year = Column(Integer, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    store_id = Column(String, ForeignKey("stores.id"), nullable=False)
    address_id = Column(String, ForeignKey("customer_addresses.id"), nullable=False)
    status = Column(String, nullable=False, default="CREATED")
    disclosure_version = Column(String, nullable=False)

    subtotal_cents = Column(Integer, nullable=False, default=0)
    tax_cents = Column(Integer, nullable=False, default=0)
    fees_cents = Column(Integer, nullable=False, default=0)
    tip_cents = Column(Integer, nullable=False, default=0)
    total_cents = Column(Integer, nullable=False, default=0)

    items_json = Column(JSON, nullable=True)
    payment_status = Column(String, nullable=False, default="UNPAID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class DeliveryTask(Base):
    __tablename__ = "delivery_tasks"
    id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    driver_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="UNASSIGNED")  # UNASSIGNED/OFFERED/ACCEPTED/IN_PROGRESS/COMPLETED/FAILED
    offered_to_driver_id = Column(String, nullable=True)
    offer_expires_at = Column(DateTime(timezone=True), nullable=True)
    route_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    key = Column(String, primary_key=True)
    route = Column(String, primary_key=False, nullable=False)
    request_hash = Column(String, nullable=False)
    status_code = Column(Integer, nullable=False)
    response_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class OrderEvent(Base):
    __tablename__ = "order_events"
    id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    ts = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actor_type = Column(String, nullable=False)
    actor_id = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    hash_prev = Column(String, nullable=True)
    hash_self = Column(String, nullable=False)


class Driver(Base):
    __tablename__ = "drivers"
    id = Column(String, primary_key=True)
    status = Column(String, nullable=False, default="OFFLINE")  # IDLE/ON_TASK/OFFLINE/PAUSED
    lat = Column(String, nullable=True)
    lng = Column(String, nullable=True)
    node_id = Column(String, nullable=True)
    zone_id = Column(String, nullable=True)
    # profile
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    # eligibility / compliance
    insurance_verified = Column(Boolean, nullable=False, default=False)
    registration_verified = Column(Boolean, nullable=False, default=False)
    vehicle_verified = Column(Boolean, nullable=False, default=False)
    background_clear = Column(Boolean, nullable=False, default=False)
    training_flags_json = Column(JSON, nullable=False, default=list)
    # rolling metrics (for p_accept heuristic)
    metrics_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    vehicles = relationship("DriverVehicle", back_populates="driver", cascade="all, delete-orphan")
    documents = relationship("DriverDocument", back_populates="driver", cascade="all, delete-orphan")

class OfferLog(Base):
    __tablename__ = "offer_logs"
    id = Column(String, primary_key=True)
    task_id = Column(String, nullable=False)
    order_id = Column(String, nullable=False)
    driver_id = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    features_json = Column(JSON, nullable=False, default=dict)
    outcome = Column(String, nullable=True)  # ACCEPTED/REJECTED/TIMEOUT/CANCELED
    outcome_ms = Column(Integer, nullable=True)
    response_latency_ms = Column(Integer, nullable=True)


class DriverVehicle(Base):
    __tablename__ = "driver_vehicles"
    id = Column(String, primary_key=True)
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=False)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    year = Column(Integer, nullable=True)
    color = Column(String, nullable=True)
    license_plate = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    driver = relationship("Driver", back_populates="vehicles")
    documents = relationship("DriverDocument", back_populates="vehicle", cascade="all, delete-orphan")


class DriverDocument(Base):
    __tablename__ = "driver_documents"
    id = Column(String, primary_key=True)
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=False)
    vehicle_id = Column(String, ForeignKey("driver_vehicles.id"), nullable=True)
    doc_type = Column(String, nullable=False)  # LICENSE/INSURANCE/REGISTRATION
    file_url = Column(String, nullable=False)
    status = Column(String, nullable=False, default="PENDING")  # PENDING/APPROVED/REJECTED
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    driver = relationship("Driver", back_populates="documents")
    vehicle = relationship("DriverVehicle", back_populates="documents")
