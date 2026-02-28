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
  if (res.headers.get("content-type")?.includes("text/csv")) {
    return res;
  }
  return res.json();
}

// Dashboard
export function getDashboard() {
  return request("GET", "/admin/dashboard");
}

// Orders
export function getOrders({ status, merchant_id, driver_id, limit = 50, offset = 0 } = {}) {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  if (merchant_id) p.set("merchant_id", merchant_id);
  if (driver_id) p.set("driver_id", driver_id);
  p.set("limit", limit);
  p.set("offset", offset);
  return request("GET", `/admin/orders?${p}`);
}

export function getOrder(id) {
  return request("GET", `/admin/orders/${id}`);
}

export function orderAction(id, action, driverId) {
  return request("POST", `/admin/orders/${id}/action`, { action, driver_id: driverId });
}

// Merchants
export function getMerchants({ status, limit = 50, offset = 0 } = {}) {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  p.set("limit", limit);
  p.set("offset", offset);
  return request("GET", `/admin/merchants?${p}`);
}

export function getMerchant(id) {
  return request("GET", `/admin/merchants/${id}`);
}

export function createMerchant(data) {
  return request("POST", "/admin/merchants", data);
}

export function applyMerchant(data) {
  return request("POST", "/admin/merchants/apply", data);
}

export function reviewMerchant(id, action, notes) {
  return request("POST", `/admin/merchants/${id}/review`, { action, notes });
}

export function updateMerchantStatus(id, status) {
  return request("PUT", `/admin/merchants/${id}/status?status=${status}`);
}

// Drivers
export function getDrivers({ status, limit = 50, offset = 0 } = {}) {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  p.set("limit", limit);
  p.set("offset", offset);
  return request("GET", `/admin/drivers?${p}`);
}

export function getDriver(id) {
  return request("GET", `/admin/drivers/${id}`);
}

export function reviewDocument(driverId, docId, action, notes) {
  return request("POST", `/admin/drivers/${driverId}/documents/${docId}/review`, { action, notes });
}

// Customers
export function getCustomers({ limit = 50, offset = 0 } = {}) {
  const p = new URLSearchParams();
  p.set("limit", limit);
  p.set("offset", offset);
  return request("GET", `/admin/customers?${p}`);
}

export function getCustomer(id) {
  return request("GET", `/admin/customers/${id}`);
}

// Tickets
export function getTickets({ status, priority, assigned_to, limit = 50, offset = 0 } = {}) {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  if (priority) p.set("priority", priority);
  if (assigned_to) p.set("assigned_to", assigned_to);
  p.set("limit", limit);
  p.set("offset", offset);
  return request("GET", `/admin/tickets?${p}`);
}

export function getTicket(id) {
  return request("GET", `/admin/tickets/${id}`);
}

export function updateTicket(id, data) {
  return request("PUT", `/admin/tickets/${id}`, data);
}

export function postTicketMessage(id, body) {
  return request("POST", `/admin/tickets/${id}/messages`, {
    sender_type: "admin",
    sender_id: "admin_001",
    body,
  });
}

// Analytics
export function getOrderAnalytics({ start_date, end_date, granularity } = {}) {
  const p = new URLSearchParams();
  if (start_date) p.set("start_date", start_date);
  if (end_date) p.set("end_date", end_date);
  if (granularity) p.set("granularity", granularity);
  return request("GET", `/admin/analytics/orders?${p}`);
}

export function getDriverAnalytics() {
  return request("GET", "/admin/analytics/drivers");
}

export function getMerchantAnalytics() {
  return request("GET", "/admin/analytics/merchants");
}

export function getCustomerAnalytics() {
  return request("GET", "/admin/analytics/customers");
}

export function exportCSV(dataset) {
  return `${BASE}/admin/analytics/export?dataset=${dataset}`;
}
