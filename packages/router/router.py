from __future__ import annotations
import os
import math
from typing import Optional, Tuple
from packages.router.cache import TTLCache

def _haversine_m(lat1, lon1, lat2, lon2) -> float:
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))

class Router:
    """Routing interface.

    MVP default uses a haversine-based travel time approximation. Replace this
    with your real road-graph router without changing dispatch code.

    Use `route_time_latlng()` for now. A node-based API can be layered later.
    """
    def __init__(self, *, ttl_s: int = 30, max_items: int = 50_000):
        self.mode = os.getenv("ROUTER_MODE", "HAVERSINE").upper()
        self.cache = TTLCache(max_items=max_items, ttl_s=ttl_s)

    def route_time_latlng(self, a: Tuple[float,float], b: Tuple[float,float]) -> int:
        key = ("t", round(a[0], 6), round(a[1], 6), round(b[0], 6), round(b[1], 6), self.mode)
        cached = self.cache.get(key)
        if cached is not None:
            return int(cached)

        lat1, lon1 = a
        lat2, lon2 = b
        dist_m = _haversine_m(lat1, lon1, lat2, lon2)

        # Very simple speed model by mode. Replace with real router.
        if self.mode == "HAVERSINE":
            # assume 35 mph average, with a road factor
            mph = 35.0
            road_factor = 1.25
            mps = (mph * 1609.34) / 3600.0
            t_s = int((dist_m / mps) * road_factor)
        else:
            # fallback
            t_s = int(dist_m / 10.0)

        # clamp to sane range
        t_s = max(5, min(t_s, 60 * 60))
        self.cache.set(key, t_s)
        return t_s
