"""OR-Tools integration placeholder.

In MVP tests we don't run OR-Tools. Keep a single entrypoint function so
your team can swap in batching + routing later without touching OMS.
"""

def compute_route_stub(*, stops: list[dict]) -> dict:
    return {"stops": stops, "engine": "stub", "distance_m": None, "eta_s": None}
