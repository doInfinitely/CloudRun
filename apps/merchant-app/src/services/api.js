import { getToken, clearAuth } from "./auth";

const BASE = "/v1";

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
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

export function demoMerchant() {
  return request("POST", "/auth/demo/merchant");
}

// Dashboard
export function getDashboard(merchantId) {
  return request("GET", `/merchants/${merchantId}/dashboard`);
}

// Stores
export function getStores(merchantId) {
  return request("GET", `/merchants/${merchantId}/stores`);
}

export function getStore(merchantId, storeId) {
  return request("GET", `/merchants/${merchantId}/stores/${storeId}`);
}

export function updateStore(merchantId, storeId, data) {
  return request("PUT", `/merchants/${merchantId}/stores/${storeId}`, data);
}

// Orders
export function getOrders(merchantId, storeId, { status, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", limit);
  params.set("offset", offset);
  return request("GET", `/merchants/${merchantId}/stores/${storeId}/orders?${params}`);
}

export function getOrder(merchantId, storeId, orderId) {
  return request("GET", `/merchants/${merchantId}/stores/${storeId}/orders/${orderId}`);
}

export function orderAction(merchantId, storeId, orderId, action) {
  return request("POST", `/merchants/${merchantId}/stores/${storeId}/orders/${orderId}/action`, { action });
}

// Products
export function getProducts(merchantId, storeId) {
  return request("GET", `/merchants/${merchantId}/stores/${storeId}/products`);
}

export function createProduct(merchantId, storeId, data) {
  return request("POST", `/merchants/${merchantId}/stores/${storeId}/products`, data);
}

export function updateProduct(merchantId, storeId, productId, data) {
  return request("PUT", `/merchants/${merchantId}/stores/${storeId}/products/${productId}`, data);
}

export function deleteProduct(merchantId, storeId, productId) {
  return request("DELETE", `/merchants/${merchantId}/stores/${storeId}/products/${productId}`);
}

// Merchant profile
export function updateMerchantProfile(merchantId, data) {
  return request("PUT", `/merchants/${merchantId}/profile`, data);
}

export function createMerchantStore(merchantId, data) {
  return request("POST", `/merchants/${merchantId}/stores`, data);
}

// Stripe Connect
export function createStripeAccount(merchantId) {
  return request("POST", `/onboarding/merchant/${merchantId}/stripe/create-account`);
}

export function createStripeLink(merchantId, returnUrl, refreshUrl) {
  return request("POST", `/onboarding/merchant/${merchantId}/stripe/create-link`, {
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
}

export function getStripeStatus(merchantId) {
  return request("GET", `/onboarding/merchant/${merchantId}/stripe/status`);
}

export function completeOnboarding(merchantId) {
  return request("POST", `/onboarding/merchant/${merchantId}/complete`);
}

export async function uploadProductImage(merchantId, storeId, productId, file) {
  const fd = new FormData();
  fd.append("file", file);
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/merchants/${merchantId}/stores/${storeId}/products/${productId}/image`, {
    method: "POST",
    headers,
    body: fd,
  });
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
