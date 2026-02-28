"""OSRM (Open Source Routing Machine) integration.

Set ROUTER_MODE=OSRM and optionally OSRM_BASE_URL to activate.
Defaults to the public OSRM demo server for development.
"""
from __future__ import annotations

import logging
import os
from typing import List, Optional, Tuple

from packages.router.cache import TTLCache

log = logging.getLogger(__name__)

OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org")
PROFILE = "car"


class OSRMRouter:
    """OSRM-backed router providing travel times and polylines."""

    def __init__(self, *, ttl_s: int = 60, max_items: int = 50_000):
        self.cache = TTLCache(max_items=max_items, ttl_s=ttl_s)
        self.base = OSRM_BASE_URL.rstrip("/")

    def route_time_latlng(self, a: Tuple[float, float], b: Tuple[float, float]) -> int:
        """Travel time in seconds between two lat/lng points."""
        key = ("osrm_t", round(a[0], 5), round(a[1], 5), round(b[0], 5), round(b[1], 5))
        cached = self.cache.get(key)
        if cached is not None:
            return int(cached)

        result = self._route(a, b)
        t_s = int(result["duration"]) if result else self._haversine_fallback(a, b)
        self.cache.set(key, t_s)
        return t_s

    def route_path_latlng(
        self, a: Tuple[float, float], b: Tuple[float, float]
    ) -> Optional[str]:
        """Encoded polyline between two lat/lng points."""
        result = self._route(a, b)
        if result:
            return result.get("geometry")
        return None

    def batch_matrix(
        self, points: List[Tuple[float, float]]
    ) -> List[List[int]]:
        """NxN travel time matrix via OSRM table service."""
        if not points:
            return []
        key = ("osrm_matrix", tuple((round(p[0], 5), round(p[1], 5)) for p in points))
        cached = self.cache.get(key)
        if cached is not None:
            return cached

        import requests

        coords = ";".join(f"{p[1]},{p[0]}" for p in points)  # OSRM uses lng,lat
        url = f"{self.base}/table/v1/{PROFILE}/{coords}"
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            if data.get("code") == "Ok":
                matrix = [
                    [max(1, int(cell)) if cell is not None else 9999 for cell in row]
                    for row in data["durations"]
                ]
                self.cache.set(key, matrix)
                return matrix
        except Exception as e:
            log.error("OSRM batch_matrix failed: %s", e)

        # Fallback: compute pairwise haversine
        n = len(points)
        matrix = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i != j:
                    matrix[i][j] = self._haversine_fallback(points[i], points[j])
        return matrix

    def _route(self, a: Tuple[float, float], b: Tuple[float, float]) -> Optional[dict]:
        """Call OSRM route service."""
        import requests

        coords = f"{a[1]},{a[0]};{b[1]},{b[0]}"  # OSRM uses lng,lat
        url = f"{self.base}/route/v1/{PROFILE}/{coords}?overview=full"
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if data.get("code") == "Ok" and data.get("routes"):
                return data["routes"][0]
        except Exception as e:
            log.error("OSRM route failed: %s", e)
        return None

    @staticmethod
    def _haversine_fallback(a: Tuple[float, float], b: Tuple[float, float]) -> int:
        """Fallback haversine estimate when OSRM is unavailable."""
        import math

        R = 6371000.0
        p1, p2 = math.radians(a[0]), math.radians(b[0])
        dphi = math.radians(b[0] - a[0])
        dl = math.radians(b[1] - a[1])
        h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        dist_m = 2 * R * math.asin(math.sqrt(h))
        mph = 35.0
        mps = (mph * 1609.34) / 3600.0
        return max(5, int(dist_m / mps * 1.25))
