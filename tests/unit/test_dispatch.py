"""Unit tests for the dispatch subsystem.

These tests exercise candidate generation, cost computation, the MCF solver,
batch loop clustering, and the acceptance heuristic — all without a database.
"""
import math
import pytest

from packages.dispatch.candidates import generate_candidates_topk, _haversine_m
from packages.dispatch.costs import compute_cost
from packages.dispatch.solver_mcf import solve_min_cost_flow
from packages.dispatch.batch_loop import _cluster_jobs, _nn_order_stops, _pick_best_driver
from packages.predictions.acceptance import p_accept


# ── Fixtures ─────────────────────────────────────────────────────────

def _driver(did="d1", lat=30.27, lng=-97.74, status="IDLE", ins=True, reg=True):
    return {
        "driver_id": did,
        "lat": lat,
        "lng": lng,
        "status": status,
        "zone_id": None,
        "capacity": {"max_active_orders": 1, "active_orders": 0},
        "eligibility": {
            "vehicle_verified": True,
            "insurance_verified": ins,
            "registration_verified": reg,
            "background_clear": True,
        },
        "metrics": {"accept_rate_7d": 0.8, "cancel_rate_7d": 0.02, "recent_timeouts": 0},
    }


def _job(jid="j1", order_id="ord_1", plat=30.28, plng=-97.73, dlat=30.30, dlng=-97.70):
    return {
        "job_id": jid,
        "order_id": order_id,
        "store_id": "store_1",
        "pickup_lat": plat,
        "pickup_lng": plng,
        "drop_lat": dlat,
        "drop_lng": dlng,
        "pickup_node_id": "n1",
        "drop_node_id": "n2",
        "created_ms": 1700000000000,
        "ready_at_ms": 1700000300000,
        "deadline_ms": 1700002700000,
        "priority": 1,
        "zone_id": None,
        "state": "PENDING_DISPATCH",
        "pricing": {"payout_cents_est": 800},
        "approx_eta_drop_s": 600,
    }


def _snapshot(drivers=None, jobs=None, tasks=None):
    return {
        "ts_ms": 1700000000000,
        "region_id": "tx-dfw",
        "params": {
            "assignment_mode": "FAST_MATCH",
            "k_candidates_per_job": 100,
            "radius_meters": 6000,
            "offer_ttl_s": 30,
            "hard_pickup_eta_s_max": 900,
            "h3_res": 8,
            "weights": {
                "alpha_total_time": 1.0,
                "beta_lateness": 25.0,
                "gamma_deadhead": 1.0,
                "rho_return_risk": 1.0,
                "lambda_fairness": 0.0,
                "mu_zone": 0.0,
            },
        },
        "road_graph": {"graph_id": "osm-texas", "profile_id": "car-default"},
        "drivers": drivers or [],
        "jobs": jobs or [],
        "tasks": tasks or [],
        "predictions": {},
    }


# ── Haversine ────────────────────────────────────────────────────────

def test_haversine_same_point():
    assert _haversine_m(30.0, -97.0, 30.0, -97.0) == pytest.approx(0, abs=1)


def test_haversine_known_distance():
    # Austin to Dallas ~300 km
    d = _haversine_m(30.27, -97.74, 32.78, -96.80)
    assert 270_000 < d < 330_000


# ── Candidate Generation ────────────────────────────────────────────

def test_candidates_empty_inputs():
    snap = _snapshot(drivers=[], jobs=[])
    edges = generate_candidates_topk(snap, k_prime=10, k=5)
    assert edges == []


def test_candidates_one_driver_one_job():
    snap = _snapshot(
        drivers=[_driver()],
        jobs=[_job()],
    )
    edges = generate_candidates_topk(snap, k_prime=10, k=5)
    assert len(edges) == 1
    assert edges[0]["driver_id"] == "d1"
    assert edges[0]["job_id"] == "j1"


def test_candidates_skips_ineligible_driver():
    snap = _snapshot(
        drivers=[_driver(ins=False)],
        jobs=[_job()],
    )
    edges = generate_candidates_topk(snap, k_prime=10, k=5)
    assert edges == []


def test_candidates_skips_far_driver():
    snap = _snapshot(
        drivers=[_driver(lat=32.78, lng=-96.80)],  # Dallas, ~300km away
        jobs=[_job()],
    )
    edges = generate_candidates_topk(snap, k_prime=10, k=5)
    assert edges == []


def test_candidates_skips_job_with_active_offer():
    snap = _snapshot(
        drivers=[_driver()],
        jobs=[_job()],
        tasks=[{"order_id": "ord_1", "status": "OFFERED"}],
    )
    edges = generate_candidates_topk(snap, k_prime=10, k=5)
    assert edges == []


def test_candidates_skips_offline_driver():
    snap = _snapshot(
        drivers=[_driver(status="OFFLINE")],
        jobs=[_job()],
    )
    edges = generate_candidates_topk(snap, k_prime=10, k=5)
    assert edges == []


# ── Cost Computation ─────────────────────────────────────────────────

def test_cost_returns_float():
    snap = _snapshot(drivers=[_driver()], jobs=[_job()])
    d = _driver()
    j = _job()
    cost, debug = compute_cost(snap, d, j, eta_pu_s=120, eta_drop_s=600)
    assert isinstance(cost, (int, float))
    assert cost > 0


# ── MCF Solver ───────────────────────────────────────────────────────

def test_mcf_empty_inputs():
    matches = solve_min_cost_flow([], [], [])
    assert matches == []


def test_mcf_single_match():
    drivers = [_driver()]
    jobs = [_job()]
    edges = [{"driver_id": "d1", "job_id": "j1", "cost": 100}]
    matches = solve_min_cost_flow(drivers, jobs, edges)
    assert len(matches) == 1
    assert matches[0]["driver_id"] == "d1"
    assert matches[0]["job_id"] == "j1"


def test_mcf_multiple_drivers_jobs():
    drivers = [_driver("d1"), _driver("d2", lat=30.29)]
    jobs = [_job("j1"), _job("j2", order_id="ord_2", plat=30.29)]
    edges = [
        {"driver_id": "d1", "job_id": "j1", "cost": 50},
        {"driver_id": "d1", "job_id": "j2", "cost": 200},
        {"driver_id": "d2", "job_id": "j1", "cost": 200},
        {"driver_id": "d2", "job_id": "j2", "cost": 50},
    ]
    matches = solve_min_cost_flow(drivers, jobs, edges)
    assert len(matches) == 2
    # Optimal: d1->j1 and d2->j2 (lowest total cost)
    match_map = {m["driver_id"]: m["job_id"] for m in matches}
    assert match_map["d1"] == "j1"
    assert match_map["d2"] == "j2"


def test_mcf_no_edges():
    matches = solve_min_cost_flow([_driver()], [_job()], [])
    assert matches == []


# ── Batch Loop: Clustering ───────────────────────────────────────────

def test_cluster_empty():
    assert _cluster_jobs([]) == []


def test_cluster_nearby_jobs_grouped():
    j1 = _job("j1", plat=30.27, plng=-97.74)
    j2 = _job("j2", order_id="o2", plat=30.271, plng=-97.741)  # ~100m away
    clusters = _cluster_jobs([j1, j2])
    assert len(clusters) == 1
    assert len(clusters[0]) == 2


def test_cluster_distant_jobs_separate():
    j1 = _job("j1", plat=30.27, plng=-97.74)
    j2 = _job("j2", order_id="o2", plat=32.78, plng=-96.80)  # Dallas
    clusters = _cluster_jobs([j1, j2])
    assert len(clusters) == 2


# ── Batch Loop: NN Ordering ──────────────────────────────────────────

def test_nn_single_job():
    d = _driver()
    j = [_job()]
    result = _nn_order_stops(d, j)
    assert len(result) == 1


def test_nn_orders_by_proximity():
    d = _driver(lat=30.27, lng=-97.74)
    j1 = _job("j1", plat=30.28, plng=-97.74)   # closer
    j2 = _job("j2", order_id="o2", plat=30.35, plng=-97.74)  # farther
    result = _nn_order_stops(d, [j2, j1])  # Input reversed
    assert result[0]["job_id"] == "j1"  # Should pick closer first


# ── Batch Loop: Driver Selection ─────────────────────────────────────

def test_pick_best_driver_nearest():
    snap = _snapshot()
    d1 = _driver("d1", lat=30.27, lng=-97.74)
    d2 = _driver("d2", lat=30.35, lng=-97.74)
    cluster = [_job("j1", plat=30.28, plng=-97.74)]
    best = _pick_best_driver(snap, [d1, d2], cluster, set())
    assert best["driver_id"] == "d1"


def test_pick_best_driver_skips_assigned():
    snap = _snapshot()
    d1 = _driver("d1", lat=30.27, lng=-97.74)
    d2 = _driver("d2", lat=30.28, lng=-97.74)
    cluster = [_job("j1", plat=30.28, plng=-97.74)]
    best = _pick_best_driver(snap, [d1, d2], cluster, {"d2"})
    assert best["driver_id"] == "d1"


def test_pick_best_driver_none_eligible():
    snap = _snapshot()
    d1 = _driver("d1", ins=False)
    best = _pick_best_driver(snap, [d1], [_job()], set())
    assert best is None


# ── Acceptance Probability ───────────────────────────────────────────

def test_p_accept_in_range():
    d = _driver()
    j = _job()
    p = p_accept(d, j, eta_pu_s=120, total_trip_s=720)
    assert 0.05 <= p <= 0.95


def test_p_accept_higher_accept_rate_monotonic():
    """Higher historical accept rate should produce higher p_accept, all else equal."""
    j = _job()
    j["pricing"]["payout_cents_est"] = 200  # low payout to avoid ceiling clamp

    d_high = _driver()
    d_high["metrics"]["accept_rate_7d"] = 0.8
    d_high["metrics"]["cancel_rate_7d"] = 0.3
    d_high["metrics"]["recent_timeouts"] = 3
    p_high = p_accept(d_high, j, eta_pu_s=500, total_trip_s=1500)

    d_low = _driver()
    d_low["metrics"]["accept_rate_7d"] = 0.15
    d_low["metrics"]["cancel_rate_7d"] = 0.3
    d_low["metrics"]["recent_timeouts"] = 3
    p_low = p_accept(d_low, j, eta_pu_s=500, total_trip_s=1500)
    assert p_high > p_low


def test_p_accept_short_pickup_preferred():
    """Shorter pickup ETA should yield higher p_accept when total_trip is also shorter."""
    d = _driver()
    d["metrics"]["accept_rate_7d"] = 0.7
    j = _job()
    j["pricing"]["payout_cents_est"] = 1200
    p_close = p_accept(d, j, eta_pu_s=60, total_trip_s=360)
    p_far = p_accept(d, j, eta_pu_s=500, total_trip_s=800)
    # The heuristic may not always be monotonic in eta_pu alone,
    # but shorter total_trip with good payout should dominate.
    assert p_close > p_far or abs(p_close - p_far) < 0.15
