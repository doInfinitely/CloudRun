"""Batch dispatch loop -- VRP-style planning on a 10-20 minute horizon.

Runs every ~30 seconds.  Clusters pending jobs by geographic proximity,
plans a multi-stop route per driver using a nearest-neighbor heuristic,
and commits only the *next immediate* offer for each planned driver so
the FAST loop can keep reacting in real time.

When OR-Tools VRP is available the route ordering step delegates to
``ortools_wrapper.solve_vrp``; otherwise it uses the built-in greedy
nearest-neighbor solver.
"""
from __future__ import annotations

import logging
import math
from typing import Dict, List, Tuple

from packages.db.session import SessionLocal
from packages.dispatch.candidates import _haversine_m
from packages.dispatch.costs import compute_cost
from packages.dispatch.offers import create_offer
from packages.dispatch.ortools_wrapper import solve_vrp

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Geo-clustering helpers
# ---------------------------------------------------------------------------

_CLUSTER_RADIUS_M = 3000  # jobs within 3 km are grouped together


def _cluster_jobs(jobs: List[dict]) -> List[List[dict]]:
    """Simple greedy single-linkage clustering of jobs by pickup location.

    Returns a list of clusters; each cluster is a list of job dicts.
    Jobs without valid coordinates are placed in their own singleton cluster.
    """
    remaining = list(jobs)
    clusters: List[List[dict]] = []

    while remaining:
        seed = remaining.pop(0)
        slat, slng = seed.get("pickup_lat"), seed.get("pickup_lng")
        if slat is None or slng is None:
            clusters.append([seed])
            continue

        cluster = [seed]
        still_remaining: List[dict] = []
        for j in remaining:
            jlat, jlng = j.get("pickup_lat"), j.get("pickup_lng")
            if jlat is None or jlng is None:
                still_remaining.append(j)
                continue
            if _haversine_m(float(slat), float(slng), float(jlat), float(jlng)) <= _CLUSTER_RADIUS_M:
                cluster.append(j)
            else:
                still_remaining.append(j)
        remaining = still_remaining
        clusters.append(cluster)

    return clusters


# ---------------------------------------------------------------------------
# Nearest-neighbor route ordering
# ---------------------------------------------------------------------------

def _nn_order_stops(
    driver: dict,
    jobs: List[dict],
) -> List[dict]:
    """Order *jobs* using a nearest-neighbor heuristic starting from the
    driver's current location.  Returns the jobs list sorted in visit order.
    """
    if len(jobs) <= 1:
        return list(jobs)

    dlat = float(driver.get("lat", 0))
    dlng = float(driver.get("lng", 0))

    ordered: List[dict] = []
    pool = list(jobs)
    cur_lat, cur_lng = dlat, dlng

    while pool:
        best_idx = 0
        best_dist = float("inf")
        for i, j in enumerate(pool):
            jlat = float(j.get("pickup_lat", 0))
            jlng = float(j.get("pickup_lng", 0))
            d = _haversine_m(cur_lat, cur_lng, jlat, jlng)
            if d < best_dist:
                best_dist = d
                best_idx = i
        chosen = pool.pop(best_idx)
        ordered.append(chosen)
        cur_lat = float(chosen.get("pickup_lat", cur_lat))
        cur_lng = float(chosen.get("pickup_lng", cur_lng))

    return ordered


# ---------------------------------------------------------------------------
# Driver selection
# ---------------------------------------------------------------------------

def _pick_best_driver(
    snapshot: dict,
    drivers: List[dict],
    cluster: List[dict],
    assigned_driver_ids: set,
) -> dict | None:
    """Pick the best idle driver for a cluster of jobs.

    Uses the centroid of all pickup locations in the cluster and selects the
    nearest eligible idle driver that has not already been assigned.
    """
    if not drivers or not cluster:
        return None

    # Compute cluster centroid
    lats = [float(j["pickup_lat"]) for j in cluster if j.get("pickup_lat") is not None]
    lngs = [float(j["pickup_lng"]) for j in cluster if j.get("pickup_lng") is not None]
    if not lats or not lngs:
        return None
    c_lat = sum(lats) / len(lats)
    c_lng = sum(lngs) / len(lngs)

    params = snapshot.get("params", {}) or {}
    radius_m = int(params.get("radius_meters", 6000))
    tasks = snapshot.get("tasks", []) or []

    best: dict | None = None
    best_dist = float("inf")

    for d in drivers:
        if d["driver_id"] in assigned_driver_ids:
            continue
        if d.get("status") != "IDLE":
            continue
        elig = d.get("eligibility", {}) or {}
        if not (elig.get("insurance_verified") and elig.get("registration_verified")):
            continue
        dlat, dlng = d.get("lat"), d.get("lng")
        if dlat is None or dlng is None:
            continue
        # Skip drivers that already have an outstanding offer/task
        if any(
            t.get("offered_to_driver_id") == d["driver_id"]
            and t.get("status") in ("OFFERED", "ACCEPTED", "IN_PROGRESS")
            for t in tasks
        ):
            continue

        dist = _haversine_m(float(dlat), float(dlng), c_lat, c_lng)
        if dist > radius_m:
            continue
        if dist < best_dist:
            best_dist = dist
            best = d

    return best


# ---------------------------------------------------------------------------
# Build a time-matrix for solve_vrp
# ---------------------------------------------------------------------------

def _build_time_matrix(driver: dict, jobs: List[dict]) -> List[List[int]]:
    """Build a simple time matrix for [driver, job0, job1, ...].

    Index 0 = driver location.
    Index 1..N = job pickup locations.
    Uses haversine distance with a road-factor speed model (same as Router
    MVP) to produce travel-time seconds.
    """
    mph = 35.0
    road_factor = 1.25
    mps = (mph * 1609.34) / 3600.0

    locs: List[Tuple[float, float]] = []
    locs.append((float(driver.get("lat", 0)), float(driver.get("lng", 0))))
    for j in jobs:
        locs.append((float(j.get("pickup_lat", 0)), float(j.get("pickup_lng", 0))))

    n = len(locs)
    matrix: List[List[int]] = []
    for i in range(n):
        row: List[int] = []
        for j_idx in range(n):
            if i == j_idx:
                row.append(0)
            else:
                d = _haversine_m(locs[i][0], locs[i][1], locs[j_idx][0], locs[j_idx][1])
                t = int((d / mps) * road_factor)
                row.append(max(5, min(t, 3600)))
        matrix.append(row)
    return matrix


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_batch_tick(snapshot: dict) -> dict:
    """Run one iteration of the BATCH dispatch loop.

    Returns a summary dict with counts of clusters processed, routes planned,
    and offers committed.
    """
    drivers = snapshot.get("drivers", []) or []
    jobs = snapshot.get("jobs", []) or []
    tasks = snapshot.get("tasks", []) or []
    params = snapshot.get("params", {}) or {}

    # Filter to jobs that are truly pending dispatch and don't already have
    # an outstanding offer or active task.
    active_order_ids = {
        t["order_id"]
        for t in tasks
        if t.get("status") in ("OFFERED", "ACCEPTED", "IN_PROGRESS")
    }
    pending_jobs = [
        j for j in jobs
        if j.get("state") in ("PENDING_DISPATCH", "MERCHANT_ACCEPTED", "DISPATCHING")
        and j.get("order_id") not in active_order_ids
    ]

    if not pending_jobs:
        logger.debug("batch_tick: no pending jobs")
        return {"clusters": 0, "routes_planned": 0, "offers_created": 0}

    idle_drivers = [d for d in drivers if d.get("status") == "IDLE"]
    if not idle_drivers:
        logger.debug("batch_tick: no idle drivers")
        return {"clusters": 0, "routes_planned": 0, "offers_created": 0}

    # Step 1: Cluster jobs by geographic proximity
    clusters = _cluster_jobs(pending_jobs)
    logger.info("batch_tick: %d pending jobs -> %d clusters", len(pending_jobs), len(clusters))

    # Step 2: For each cluster, assign a driver and plan a route
    planned_routes: List[dict] = []
    assigned_driver_ids: set = set()

    for cluster in clusters:
        driver = _pick_best_driver(snapshot, idle_drivers, cluster, assigned_driver_ids)
        if driver is None:
            continue

        # Build time-matrix and try VRP solver; falls back to NN internally
        time_matrix = _build_time_matrix(driver, cluster)
        vrp_routes = solve_vrp(
            drivers=[driver],
            jobs=cluster,
            time_matrix=time_matrix,
        )

        if vrp_routes and vrp_routes[0]:
            ordered_jobs = vrp_routes[0]
        else:
            # Fallback: nearest-neighbor ordering
            ordered_jobs = _nn_order_stops(driver, cluster)

        assigned_driver_ids.add(driver["driver_id"])
        planned_routes.append({
            "driver_id": driver["driver_id"],
            "ordered_jobs": ordered_jobs,
        })

    # Step 3: Commit only the *next immediate* offer per driver
    offers_created = 0
    db = SessionLocal()
    try:
        for route in planned_routes:
            if not route["ordered_jobs"]:
                continue

            first_job = route["ordered_jobs"][0]
            driver_id = route["driver_id"]

            # Compute cost for logging/debugging
            drv = next((d for d in drivers if d["driver_id"] == driver_id), None)
            if drv is None:
                continue

            # Approximate ETAs for the first job
            dlat, dlng = drv.get("lat"), drv.get("lng")
            plat, plng = first_job.get("pickup_lat"), first_job.get("pickup_lng")
            if None in (dlat, dlng, plat, plng):
                continue

            mph = 35.0
            road_factor = 1.25
            mps = (mph * 1609.34) / 3600.0
            pickup_dist = _haversine_m(float(dlat), float(dlng), float(plat), float(plng))
            eta_pu_s = max(5, int((pickup_dist / mps) * road_factor))
            eta_drop_s = int(first_job.get("approx_eta_drop_s", 600))

            offer_ttl_s = int(params.get("offer_ttl_s", 30))

            try:
                task = create_offer(
                    db,
                    snapshot=snapshot,
                    order_id=first_job["order_id"],
                    driver_id=driver_id,
                    offer_ttl_s=offer_ttl_s,
                    edge_debug={
                        "source": "batch_loop",
                        "cluster_size": len(route["ordered_jobs"]),
                        "eta_pu_s": eta_pu_s,
                        "eta_drop_s": eta_drop_s,
                    },
                )
                offers_created += 1
                logger.info(
                    "batch_tick: created offer task=%s driver=%s order=%s (cluster of %d)",
                    task.id, driver_id, first_job["order_id"], len(route["ordered_jobs"]),
                )
            except Exception:
                logger.exception(
                    "batch_tick: failed to create offer for driver=%s order=%s",
                    driver_id, first_job.get("order_id"),
                )

        db.commit()
    except Exception:
        db.rollback()
        logger.exception("batch_tick: commit failed, rolling back")
        raise
    finally:
        db.close()

    result = {
        "clusters": len(clusters),
        "routes_planned": len(planned_routes),
        "offers_created": offers_created,
    }
    logger.info("batch_tick result: %s", result)
    return result
