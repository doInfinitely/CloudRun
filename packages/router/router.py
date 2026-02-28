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

    MVP default uses a haversine-based travel time approximation.
    Set ROUTER_MODE=OSRM for real road-graph routing via OSRM.
    """
    def __init__(self, *, ttl_s: int = 30, max_items: int = 50_000):
        self.mode = os.getenv("ROUTER_MODE", "HAVERSINE").upper()
        self.cache = TTLCache(max_items=max_items, ttl_s=ttl_s)
        self._osrm = None
        if self.mode == "OSRM":
            from packages.router.osrm import OSRMRouter
            self._osrm = OSRMRouter(ttl_s=ttl_s, max_items=max_items)

    def route_time_latlng(self, a: Tuple[float,float], b: Tuple[float,float]) -> int:
        if self._osrm is not None:
            return self._osrm.route_time_latlng(a, b)

        key = ("t", round(a[0], 6), round(a[1], 6), round(b[0], 6), round(b[1], 6), self.mode)
        cached = self.cache.get(key)
        if cached is not None:
            return int(cached)

        lat1, lon1 = a
        lat2, lon2 = b
        dist_m = _haversine_m(lat1, lon1, lat2, lon2)

        # assume 35 mph average, with a road factor
        mph = 35.0
        road_factor = 1.25
        mps = (mph * 1609.34) / 3600.0
        t_s = int((dist_m / mps) * road_factor)

        # clamp to sane range
        t_s = max(5, min(t_s, 60 * 60))
        self.cache.set(key, t_s)
        return t_s

    def batch_matrix(self, points: list) -> list:
        """NxN travel time matrix. Delegates to OSRM if available."""
        if self._osrm is not None:
            return self._osrm.batch_matrix(points)
        # Haversine fallback
        n = len(points)
        matrix = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i != j:
                    matrix[i][j] = self.route_time_latlng(points[i], points[j])
        return matrix
