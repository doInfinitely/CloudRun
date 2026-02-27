from __future__ import annotations
from typing import Tuple, Dict
from packages.predictions.acceptance import p_accept

def compute_cost(snapshot: dict, driver: dict, job: dict, eta_pu_s: int, eta_drop_s: int) -> Tuple[int, Dict]:
    params = snapshot.get("params", {}) or {}
    W = (params.get("weights") or {})
    alpha = float(W.get("alpha_total_time", 1.0))
    beta  = float(W.get("beta_lateness", 25.0))
    gamma = float(W.get("gamma_deadhead", 1.0))
    rho   = float(W.get("rho_return_risk", 1.0))
    lam   = float(W.get("lambda_fairness", 0.0))
    mu    = float(W.get("mu_zone", 0.0))

    now_ms = int(snapshot.get("ts_ms", 0))
    ready_ms = int(job.get("ready_at_ms", now_ms))
    deadline_ms = int(job.get("deadline_ms", now_ms + 30_000))

    arrive_pu_ms = now_ms + eta_pu_s * 1000
    wait_pu_s = max(0.0, (ready_ms - arrive_pu_ms) / 1000.0)

    total_time_s = eta_pu_s + int(wait_pu_s) + eta_drop_s
    finish_ms = now_ms + total_time_s * 1000
    lateness_s = max(0.0, (finish_ms - deadline_ms) / 1000.0)

    p_fail, exp_return_s = 0.03, 600
    for r in ((snapshot.get("predictions", {}) or {}).get("id_fail_risk", []) or []):
        if r.get("driver_id") == driver.get("driver_id") and r.get("order_id") == job.get("order_id"):
            p_fail = float(r.get("p_fail", p_fail))
            exp_return_s = int(r.get("expected_return_cost_s", exp_return_s))
            break
    risk_pen = p_fail * exp_return_s

    fairness_pen = float((driver.get("metrics") or {}).get("fairness_penalty", 0.0))
    zone_pen = 1.0 if (driver.get("zone_id") and job.get("zone_id") and driver["zone_id"] != job["zone_id"]) else 0.0

    base = alpha*total_time_s + beta*lateness_s + gamma*eta_pu_s + rho*risk_pen + lam*fairness_pen + mu*zone_pen
    pacc = p_accept(driver, job, eta_pu_s=eta_pu_s, total_trip_s=total_time_s)
    cost = int(base / max(1e-3, pacc))
    return cost, {"total_time_s": total_time_s, "lateness_s": lateness_s, "p_accept": pacc, "risk_pen": risk_pen}
