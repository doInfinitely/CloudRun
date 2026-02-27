from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Dict

@dataclass(frozen=True)
class Edge:
    driver_id: str
    job_id: str
    eta_pu_s: int
    eta_drop_s: int
    approx: bool = False
    cost: Optional[int] = None
    debug: Optional[Dict] = None
