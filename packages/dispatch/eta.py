from __future__ import annotations
from typing import List, Dict
from packages.router.router import Router

_router = Router()

def refine_edges_with_router(snapshot: dict, edges: List[Dict]) -> List[Dict]:
    """Replace approximate eta_pu_s / eta_drop_s using Router for top-K edges.

    Expects:
      - driver: lat/lng on snapshot['drivers']
      - job: pickup_lat/lng and drop_lat/lng on snapshot['jobs']
    """
    drv_by_id = {d["driver_id"]: d for d in (snapshot.get("drivers") or [])}
    job_by_id = {j["job_id"]: j for j in (snapshot.get("jobs") or [])}

    for e in edges:
        d = drv_by_id.get(e.get("driver_id"))
        j = job_by_id.get(e.get("job_id"))
        if not d or not j:
            continue
        dlat, dlng = d.get("lat"), d.get("lng")
        plat, plng = j.get("pickup_lat"), j.get("pickup_lng")
        dplat, dplng = j.get("drop_lat"), j.get("drop_lng")
        if None in (dlat, dlng, plat, plng, dplat, dplng):
            continue

        eta_pu = _router.route_time_latlng((float(dlat), float(dlng)), (float(plat), float(plng)))
        eta_drop = _router.route_time_latlng((float(plat), float(plng)), (float(dplat), float(dplng)))

        e["eta_pu_s"] = int(eta_pu)
        e["eta_drop_s"] = int(eta_drop)
        e["approx"] = False
    return edges
