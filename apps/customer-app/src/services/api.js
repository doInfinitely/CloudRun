import { getToken, clearAuth } from "./auth";

const BASE = "/v1";

async function request(method, path, body, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 401) {
    clearAuth();
    window.location.reload();
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// Auth
export function login(email, password) {
  return request("POST", "/auth/login", { email, password });
}

export function signup(data) {
  return request("POST", "/auth/signup", data);
}

export function validateToken() {
  return request("GET", "/auth/me");
}

// Stores
export function getStores() {
  return request("GET", "/stores");
}

export function getStore(storeId) {
  return request("GET", `/stores/${storeId}`);
}

// Customer
export function upsertCustomer(data) {
  return request("POST", "/customers", data);
}

export function getCustomer(customerId) {
  return request("GET", `/customers/${customerId}`);
}

export function addAddress(customerId, data) {
  return request("POST", `/customers/${customerId}/addresses`, data);
}

export function getAddresses(customerId) {
  return request("GET", `/customers/${customerId}/addresses`);
}

export function getOrderHistory(customerId) {
  return request("GET", `/customers/${customerId}/orders`);
}

// Orders
export function createOrder(data) {
  return request("POST", "/orders", data);
}

export function getOrder(orderId) {
  return request("GET", `/orders/${orderId}`);
}

export function verifyAge(orderId, sessionRef) {
  const idemKey = `age-${orderId}-${Date.now()}`;
  return request("POST", `/orders/${orderId}/verify_age`, { session_ref: sessionRef }, {
    "Idempotency-Key": idemKey,
  });
}

export function authorizePayment(orderId, paymentMethodId) {
  const idemKey = `pay-${orderId}-${Date.now()}`;
  return request("POST", `/orders/${orderId}/payment/authorize`, { payment_method_id: paymentMethodId }, {
    "Idempotency-Key": idemKey,
  });
}

export function getOrderTracking(orderId) {
  return request("GET", `/orders/${orderId}/tracking`);
}

export function completeOnboarding(customerId) {
  return request("POST", `/onboarding/customer/${customerId}/complete`);
}
