"""OR-Tools VRP integration with nearest-neighbor fallback.

Provides ``solve_vrp`` which attempts to use the OR-Tools Constraint
Programming routing solver for vehicle routing.  If OR-Tools is not
installed or the solver fails, it falls back to a fast nearest-neighbor
heuristic so dispatch never blocks on a missing dependency.

The legacy ``compute_route_stub`` is retained for backward compatibility.
"""
from __future__ import annotations

import logging
import math
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Haversine (local copy to keep module self-contained)
# ---------------------------------------------------------------------------

def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ---------------------------------------------------------------------------
# Legacy stub (kept for backward compat)
# ---------------------------------------------------------------------------

def compute_route_stub(*, stops: list[dict]) -> dict:
    """Original stub retained for callers that still reference it."""
    return {"stops": stops, "engine": "stub", "distance_m": None, "eta_s": None}


# ---------------------------------------------------------------------------
# Nearest-neighbor fallback
# ---------------------------------------------------------------------------

def _nearest_neighbor_route(
    time_matrix: List[List[int]],
    depot: int = 0,
) -> List[int]:
    """Solve a single-vehicle TSP starting at *depot* using nearest-neighbor.

    ``time_matrix[i][j]`` is travel time (seconds) from node *i* to node *j*.
    Index 0 is typically the driver/depot location; indices 1..N are stops.

    Returns an ordered list of node indices (excluding the depot) representing
    the visit sequence.
    """
    n = len(time_matrix)
    if n <= 1:
        return []

    visited = {depot}
    route: List[int] = []
    current = depot

    while len(visited) < n:
        best_next = -1
        best_time = float("inf")
        for j in range(n):
            if j in visited:
                continue
            if time_matrix[current][j] < best_time:
                best_time = time_matrix[current][j]
                best_next = j
        if best_next == -1:
            break
        visited.add(best_next)
        route.append(best_next)
        current = best_next

    return route


def _solve_vrp_nn(
    drivers: List[dict],
    jobs: List[dict],
    time_matrix: List[List[int]],
) -> List[List[dict]]:
    """Nearest-neighbor VRP fallback for a single vehicle.

    Accepts multiple drivers for API symmetry but in practice the batch
    loop calls this with one driver per cluster.  For multi-driver cases,
    each driver gets jobs assigned greedily in nearest-neighbor order until
    all jobs are served.

    Returns: list of routes, one per driver.  Each route is an ordered list
    of job dicts.
    """
    if not drivers or not jobs:
        return []

    num_drivers = len(drivers)

    # Single-driver fast path (most common from batch_loop)
    if num_drivers == 1:
        order = _nearest_neighbor_route(time_matrix, depot=0)
        # order indices are 1-based into jobs (index 0 = driver)
        ordered_jobs = [jobs[idx - 1] for idx in order if 1 <= idx <= len(jobs)]
        return [ordered_jobs]

    # Multi-driver: round-robin nearest-neighbor
    # Build one combined matrix; depots are indices 0..num_drivers-1,
    # jobs are indices num_drivers..num_drivers+len(jobs)-1.
    # For simplicity, assign jobs greedily: each driver picks the nearest
    # unassigned job in turn.
    assigned: List[List[dict]] = [[] for _ in range(num_drivers)]
    job_taken = [False] * len(jobs)

    # Current position per driver (lat/lng)
    cur_pos = [
        (float(d.get("lat", 0)), float(d.get("lng", 0))) for d in drivers
    ]

    jobs_remaining = len(jobs)
    driver_turn = 0

    while jobs_remaining > 0:
        d_idx = driver_turn % num_drivers
        best_j = -1
        best_dist = float("inf")

        for j_idx, job in enumerate(jobs):
            if job_taken[j_idx]:
                continue
            jlat = float(job.get("pickup_lat", 0))
            jlng = float(job.get("pickup_lng", 0))
            dist = _haversine_m(cur_pos[d_idx][0], cur_pos[d_idx][1], jlat, jlng)
            if dist < best_dist:
                best_dist = dist
                best_j = j_idx

        if best_j == -1:
            break

        job_taken[best_j] = True
        assigned[d_idx].append(jobs[best_j])
        # Update driver position to the pickup location of the assigned job
        cur_pos[d_idx] = (
            float(jobs[best_j].get("pickup_lat", cur_pos[d_idx][0])),
            float(jobs[best_j].get("pickup_lng", cur_pos[d_idx][1])),
        )
        jobs_remaining -= 1
        driver_turn += 1

    return assigned


# ---------------------------------------------------------------------------
# OR-Tools VRP solver
# ---------------------------------------------------------------------------

def _solve_vrp_ortools(
    drivers: List[dict],
    jobs: List[dict],
    time_matrix: List[List[int]],
) -> Optional[List[List[dict]]]:
    """Attempt to solve the VRP using OR-Tools RoutingModel.

    Returns None if OR-Tools is not available or the solver fails, so the
    caller can fall back to nearest-neighbor.

    The time_matrix layout is:
      - For single-driver: index 0 = driver, indices 1..N = jobs.
      - For multi-driver: indices 0..D-1 = drivers, indices D..D+J-1 = jobs.
    """
    try:
        from ortools.constraint_solver import routing_enums_pb2, pywrapcp
    except ImportError:
        logger.debug("OR-Tools not installed; falling back to nearest-neighbor")
        return None

    num_vehicles = len(drivers)
    num_locations = len(time_matrix)

    if num_locations < 2:
        return [[] for _ in range(num_vehicles)]

    # Determine depot indices
    if num_vehicles == 1:
        depot = 0
        manager = pywrapcp.RoutingIndexManager(num_locations, num_vehicles, depot)
    else:
        # Multi-vehicle: each driver is its own depot
        starts = list(range(num_vehicles))
        # All vehicles return to their own start (no explicit end depot needed;
        # use the same start index as end for open routes).
        ends = list(range(num_vehicles))
        manager = pywrapcp.RoutingIndexManager(num_locations, num_vehicles, starts, ends)

    routing = pywrapcp.RoutingModel(manager)

    # Transit callback
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return time_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add time dimension to track cumulative travel time
    max_time = 20 * 60  # 20-minute horizon in seconds
    routing.AddDimension(
        transit_callback_index,
        30,         # allow waiting time (slack) of up to 30 s
        max_time,   # vehicle maximum travel time
        True,       # start cumul to zero
        "Time",
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    # Minimize total time across all vehicles
    for i in range(num_vehicles):
        routing.AddVariableMinimizedByFinalizer(
            time_dimension.CumulVar(routing.End(i))
        )

    # Search parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    # Time limit: keep it short so we don't block the worker
    search_parameters.time_limit.seconds = 2

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        logger.warning("OR-Tools VRP solver returned no solution")
        return None

    # Extract routes
    routes: List[List[dict]] = []
    job_offset = 0 if num_vehicles == 1 else num_vehicles

    for vehicle_id in range(num_vehicles):
        route_jobs: List[dict] = []
        index = routing.Start(vehicle_id)
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            # Map node back to a job
            if num_vehicles == 1:
                if node >= 1 and node <= len(jobs):
                    route_jobs.append(jobs[node - 1])
            else:
                if node >= num_vehicles and (node - num_vehicles) < len(jobs):
                    route_jobs.append(jobs[node - num_vehicles])
            index = solution.Value(routing.NextVar(index))
        routes.append(route_jobs)

    return routes


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def solve_vrp(
    drivers: List[dict],
    jobs: List[dict],
    time_matrix: List[List[int]],
) -> List[List[dict]]:
    """Solve a Vehicle Routing Problem for the given drivers and jobs.

    Parameters
    ----------
    drivers : list[dict]
        Driver dicts with at least ``driver_id``, ``lat``, ``lng``.
    jobs : list[dict]
        Job dicts with at least ``job_id``, ``pickup_lat``, ``pickup_lng``.
    time_matrix : list[list[int]]
        Square matrix of travel times in seconds.  Layout depends on
        the number of drivers:
        - 1 driver:  index 0 = driver, 1..N = jobs
        - M drivers: indices 0..M-1 = drivers, M..M+N-1 = jobs

    Returns
    -------
    list[list[dict]]
        One route per driver.  Each route is an ordered list of job dicts.
    """
    if not drivers or not jobs:
        return []

    # Try OR-Tools first
    result = _solve_vrp_ortools(drivers, jobs, time_matrix)
    if result is not None:
        logger.info("solve_vrp: used OR-Tools (%d routes)", len(result))
        return result

    # Fallback to nearest-neighbor
    result = _solve_vrp_nn(drivers, jobs, time_matrix)
    logger.info("solve_vrp: used nearest-neighbor fallback (%d routes)", len(result))
    return result
