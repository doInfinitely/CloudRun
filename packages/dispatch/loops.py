from __future__ import annotations
from packages.dispatch.candidates import generate_candidates_topk
from packages.dispatch.eta import refine_edges_with_router
from packages.dispatch.costs import compute_cost
from packages.dispatch.solver_mcf import solve_min_cost_flow
from packages.dispatch.offers import create_offer
from packages.db.session import SessionLocal

def run_fast_tick(snapshot: dict) -> dict:
    drivers = snapshot.get("drivers", []) or []
    jobs = snapshot.get("jobs", []) or []

    edges = generate_candidates_topk(
        snapshot,
        k_prime=int((snapshot.get("params", {}) or {}).get("k_candidates_per_job", 100)),
        k=20,
    )

    # Replace approximate ETAs with router-derived ETAs for these top-K edges
    edges = refine_edges_with_router(snapshot, edges)

    job_by_id = {j["job_id"]: j for j in jobs}
    drv_by_id = {d["driver_id"]: d for d in drivers}

    for e in edges:
        d = drv_by_id.get(e["driver_id"])
        j = job_by_id.get(e["job_id"])
        if not d or not j:
            continue
        c, dbg = compute_cost(snapshot, d, j, e["eta_pu_s"], e["eta_drop_s"])
        e["cost"] = c
        e["debug"] = dbg

    matches = solve_min_cost_flow(drivers, jobs, edges)

    offers = []
    db = SessionLocal()
    try:
        for m in matches:
            job = job_by_id.get(m["job_id"])
            if not job:
                continue
            task = create_offer(
                db,
                snapshot=snapshot,
                order_id=job["order_id"],
                driver_id=m["driver_id"],
                offer_ttl_s=int((snapshot.get("params", {}) or {}).get("offer_ttl_s", 30)),
                edge_debug=(next((e.get("debug") for e in edges if e.get("driver_id")==m["driver_id"] and e.get("job_id")==m["job_id"]), None)),
            )
            offers.append({"task_id": task.id, "order_id": job["order_id"], "driver_id": m["driver_id"], "cost": m.get("cost")})
        db.commit()
    finally:
        db.close()

    return {"offers": offers, "edges_considered": len(edges), "matches": len(matches)}
