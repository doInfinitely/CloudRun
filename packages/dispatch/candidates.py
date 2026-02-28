from __future__ import annotations
from typing import List, Dict
import math

def _haversine_m(lat1, lon1, lat2, lon2) -> float:
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))

def generate_candidates_topk(snapshot: dict, *, k_prime: int = 100, k: int = 20) -> List[Dict]:
    """Top-K candidate generation.

    Strategy:
    1) Prefer H3 ring query if `h3` is installed (fast, scalable).
    2) Fallback to haversine scan (MVP / dev).

    Requires jobs/drivers have lat/lng fields (pickup_lat/lng and driver lat/lng).
    """
    params = snapshot.get("params", {}) or {}
    radius_m = int(params.get("radius_meters", 6000))
    hard_eta_pu_max = int(params.get("hard_pickup_eta_s_max", 900))

    drivers = snapshot.get("drivers", []) or []
    jobs = snapshot.get("jobs", []) or []
    tasks = snapshot.get("tasks", []) or []

    vmax_mps = 20.0
    road_factor = 1.35

    # Try H3 index
    h3_index = None
    try:
        from packages.geo.h3_index import DriverH3Index
        h3_index = DriverH3Index(res=int(params.get("h3_res", 8)))
        h3_index.build(drivers)
    except Exception:
        h3_index = None

    edges: List[Dict] = []
    for job in jobs:
        if job.get("state") not in ("PENDING_DISPATCH", "MERCHANT_ACCEPTED", "DISPATCHING"):
            continue
        if any(t.get("order_id") == job.get("order_id") and t.get("status") in ("OFFERED","ACCEPTED","IN_PROGRESS") for t in tasks):
            continue

        jlat, jlng = job.get("pickup_lat"), job.get("pickup_lng")
        if jlat is None or jlng is None:
            continue
        jlat = float(jlat); jlng = float(jlng)

        candidate_drivers = []
        if h3_index is not None and h3_index._h3_available:
            # Expand rings until we have enough candidates (k_prime) or we hit ring cap
            for ring in range(0, 6):
                candidate_drivers = h3_index.query_ring(jlat, jlng, ring)
                if len(candidate_drivers) >= k_prime or ring == 5:
                    break
        if not candidate_drivers:
            candidate_drivers = drivers

        scored = []
        for d in candidate_drivers:
            if d.get("status") != "IDLE":
                continue
            elig = d.get("eligibility", {}) or {}
            if not (elig.get("insurance_verified") and elig.get("registration_verified")):
                continue
            dlat, dlng = d.get("lat"), d.get("lng")
            if dlat is None or dlng is None:
                continue
            dist = _haversine_m(float(dlat), float(dlng), jlat, jlng)
            if dist > radius_m:
                continue
            approx_eta = int(road_factor * (dist / vmax_mps))
            if approx_eta > hard_eta_pu_max:
                continue
            scored.append((approx_eta, d))

        scored.sort(key=lambda x: x[0])
        for approx_eta, d in scored[:k_prime][:k]:
            edges.append({
                "driver_id": d["driver_id"],
                "job_id": job["job_id"],
                "eta_pu_s": int(approx_eta),
                "eta_drop_s": int(job.get("approx_eta_drop_s", 600)),
                "approx": True,
            })
    return edges
