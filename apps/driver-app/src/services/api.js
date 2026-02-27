const BASE = "/v1";

async function request(method, path, body, extraHeaders = {}) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
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
