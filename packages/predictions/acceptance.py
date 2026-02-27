from __future__ import annotations
import math

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))

def p_accept(driver: dict, job: dict, *, eta_pu_s: int, total_trip_s: int) -> float:
    m = driver.get("metrics", {}) or {}
    accept_rate = float(m.get("accept_rate_7d", 0.6))
    cancel_rate = float(m.get("cancel_rate_7d", 0.05))
    recent_timeouts = int(m.get("recent_timeouts", 0))

    payout_cents = int((job.get("pricing") or {}).get("payout_cents_est", 1000))
    eta_pu_min = eta_pu_s / 60.0

    ar = clamp(accept_rate, 0.05, 0.95)
    logit_ar = math.log(ar / (1 - ar))

    b0,b1,b2,b3,b4,b5,b6 = -0.2,1.2,0.15,0.02,0.8,0.6,1.0
    value_per_min = (payout_cents / max(1, total_trip_s)) * 60.0
    z = b0 + b1*logit_ar - b2*eta_pu_min + b3*(payout_cents/100.0) + b4*value_per_min - b5*recent_timeouts - b6*cancel_rate
    return clamp(sigmoid(z), 0.05, 0.95)
