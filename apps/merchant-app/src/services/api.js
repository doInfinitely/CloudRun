const BASE = "/v1";

async function request(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
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

export async function uploadProductImage(merchantId, storeId, productId, file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/merchants/${merchantId}/stores/${storeId}/products/${productId}/image`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}
