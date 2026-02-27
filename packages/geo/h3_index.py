from __future__ import annotations
from typing import Iterable, List, Tuple, Dict, Optional

def h3_ring_cells(lat: float, lng: float, res: int, k: int) -> List[str]:
    """Return H3 cells in k-ring around (lat,lng). Requires `h3` package.

    If h3 isn't installed, raise ImportError so caller can fallback.
    """
    import h3  # type: ignore
    origin = h3.latlng_to_cell(lat, lng, res)
    cells = list(h3.grid_disk(origin, k))
    return cells

def h3_cell(lat: float, lng: float, res: int) -> str:
    import h3  # type: ignore
    return h3.latlng_to_cell(lat, lng, res)

class DriverH3Index:
    """Lightweight in-memory index. Rebuild each tick for MVP."""
    def __init__(self, *, res: int = 8):
        self.res = res
        self.map: Dict[str, List[dict]] = {}

    def build(self, drivers: Iterable[dict]) -> None:
        self.map.clear()
        for d in drivers:
            lat = d.get("lat"); lng = d.get("lng")
            if lat is None or lng is None:
                continue
            try:
                cell = h3_cell(float(lat), float(lng), self.res)
            except Exception:
                continue
            self.map.setdefault(cell, []).append(d)

    def query_ring(self, lat: float, lng: float, k: int) -> List[dict]:
        cells = h3_ring_cells(lat, lng, self.res, k)
        out: List[dict] = []
        for c in cells:
            out.extend(self.map.get(c, []))
        return out
