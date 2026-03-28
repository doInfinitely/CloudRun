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

export function updateDriver(driverId, data) {
  return request("POST", `/drivers/${driverId}`, data);
}

export function getDriverTask(driverId) {
  return request("GET", `/drivers/${driverId}/task`);
}

export function acceptTask(taskId, driverId) {
  const idemKey = `accept-${taskId}-${Date.now()}`;
  return request("POST", `/tasks/${taskId}/accept?driver_id=${driverId}`, null, {
    "Idempotency-Key": idemKey,
  });
}

export function rejectTask(taskId, driverId) {
  return request("POST", `/tasks/${taskId}/reject?driver_id=${driverId}`, null);
}

export function startTask(taskId, driverId) {
  return request("POST", `/tasks/${taskId}/start?driver_id=${driverId}`, null);
}

export function completeTask(taskId, driverId) {
  return request("POST", `/tasks/${taskId}/complete?driver_id=${driverId}`, null);
}

export function doorstepIdCheck(orderId, sessionRef) {
  const idemKey = `doorstep-${orderId}-${Date.now()}`;
  return request("POST", `/orders/${orderId}/doorstep_id_check/submit`, { session_ref: sessionRef }, {
    "Idempotency-Key": idemKey,
  });
}

export function deliverConfirm(orderId, attestationRef, gps) {
  const idemKey = `deliver-${orderId}-${Date.now()}`;
  return request("POST", `/orders/${orderId}/deliver/confirm`, { attestation_ref: attestationRef, gps }, {
    "Idempotency-Key": idemKey,
  });
}

export function refuseOrder(orderId, reasonCode, gps, notes) {
  const body = { reason_code: reasonCode, gps };
  if (notes) body.notes = notes;
  return request("POST", `/orders/${orderId}/refuse`, body);
}

// Upload helper — sends FormData without Content-Type (browser sets multipart boundary)
async function uploadRequest(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
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

// Profile
export function getProfile(driverId) {
  return request("GET", `/drivers/${driverId}/profile`);
}

export function updateProfile(driverId, data) {
  return request("PUT", `/drivers/${driverId}/profile`, data);
}

export function uploadProfilePhoto(driverId, file) {
  const fd = new FormData();
  fd.append("file", file);
  return uploadRequest(`/drivers/${driverId}/profile/photo`, fd);
}

// Vehicles
export function getVehicles(driverId) {
  return request("GET", `/drivers/${driverId}/vehicles`);
}

export function createVehicle(driverId, data) {
  return request("POST", `/drivers/${driverId}/vehicles`, data);
}

export function deleteVehicle(driverId, vehicleId) {
  return request("DELETE", `/drivers/${driverId}/vehicles/${vehicleId}`);
}

// Vehicle documents
export function getVehicleDocuments(driverId, vehicleId) {
  return request("GET", `/drivers/${driverId}/vehicles/${vehicleId}/documents`);
}

export function uploadVehicleDocument(driverId, vehicleId, docType, file) {
  const fd = new FormData();
  fd.append("doc_type", docType);
  fd.append("file", file);
  return uploadRequest(`/drivers/${driverId}/vehicles/${vehicleId}/documents`, fd);
}

// Driver-level documents (license)
export function getDriverDocuments(driverId) {
  return request("GET", `/drivers/${driverId}/documents`);
}

export function uploadDriverDocument(driverId, docType, file) {
  const fd = new FormData();
  fd.append("doc_type", docType);
  fd.append("file", file);
  return uploadRequest(`/drivers/${driverId}/documents`, fd);
}

// Stripe Connect
export function createStripeAccount(driverId) {
  return request("POST", `/onboarding/driver/${driverId}/stripe/create-account`);
}

export function createStripeLink(driverId, returnUrl, refreshUrl) {
  return request("POST", `/onboarding/driver/${driverId}/stripe/create-link`, {
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
}

export function getStripeStatus(driverId) {
  return request("GET", `/onboarding/driver/${driverId}/stripe/status`);
}

export function completeOnboarding(driverId) {
  return request("POST", `/onboarding/driver/${driverId}/complete`);
}
