from __future__ import annotations
import time
from packages.dispatch.loops import run_fast_tick

def build_dispatch_snapshot_stub(region_id: str) -> dict:
    now_ms = int(time.time() * 1000)
    return {
        "ts_ms": now_ms,
        "region_id": region_id,
        "params": {
            "k_candidates_per_job": 100,
            "radius_meters": 6000,
            "offer_ttl_s": 30,
            "hard_pickup_eta_s_max": 900,
            "weights": {"alpha_total_time":1.0,"beta_lateness":25.0,"gamma_deadhead":1.0,"rho_return_risk":1.0}
        },
        "drivers": [],
        "jobs": [],
        "tasks": [],
        "predictions": {}
    }

if __name__ == "__main__":
    out = run_fast_tick(build_dispatch_snapshot_stub("tx-dfw"))
    print(out)
