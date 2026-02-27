from __future__ import annotations
from typing import List

def solve_min_cost_flow(drivers: List[dict], jobs: List[dict], edges: List[dict]) -> List[dict]:
    try:
        from ortools.graph.python import min_cost_flow
    except Exception:
        used_d, used_j, out = set(), set(), []
        for e in sorted([e for e in edges if e.get("cost") is not None], key=lambda x: x["cost"]):
            if e["driver_id"] in used_d or e["job_id"] in used_j:
                continue
            out.append({"driver_id": e["driver_id"], "job_id": e["job_id"], "cost": e["cost"]})
            used_d.add(e["driver_id"]); used_j.add(e["job_id"])
        return out

    idle = [d for d in drivers if d.get("status") == "IDLE"]
    drv_ids = [d["driver_id"] for d in idle]
    job_ids = [j["job_id"] for j in jobs]
    drv_index = {did:i for i,did in enumerate(drv_ids)}
    job_index = {jid:i for i,jid in enumerate(job_ids)}
    Nd, Nj = len(drv_ids), len(job_ids)
    source = 0
    sink = Nd + Nj + 1
    def n_driver(i): return 1 + i
    def n_job(j): return 1 + Nd + j

    mcf = min_cost_flow.SimpleMinCostFlow()
    for d in idle:
        mcf.add_arc_with_capacity_and_unit_cost(source, n_driver(drv_index[d["driver_id"]]), 1, 0)

    for e in edges:
        did, jid, c = e.get("driver_id"), e.get("job_id"), e.get("cost")
        if c is None or did not in drv_index or jid not in job_index:
            continue
        mcf.add_arc_with_capacity_and_unit_cost(n_driver(drv_index[did]), n_job(job_index[jid]), 1, int(c))

    for jid, j in job_index.items():
        mcf.add_arc_with_capacity_and_unit_cost(n_job(j), sink, 1, 0)

    F = min(len(idle), Nj)
    mcf.set_node_supply(source, F)
    mcf.set_node_supply(sink, -F)

    if mcf.solve() != mcf.OPTIMAL:
        return []

    matches = []
    for a in range(mcf.num_arcs()):
        if mcf.flow(a) <= 0:
            continue
        tail, head = mcf.tail(a), mcf.head(a)
        if 1 <= tail <= Nd and (1+Nd) <= head <= (Nd+Nj):
            matches.append({"driver_id": drv_ids[tail-1], "job_id": job_ids[head-(1+Nd)], "cost": mcf.unit_cost(a)})
    return matches
