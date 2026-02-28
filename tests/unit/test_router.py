"""Unit tests for the haversine router."""
import os
import pytest

# Force haversine mode for tests
os.environ["ROUTER_MODE"] = "HAVERSINE"

from packages.router.router import Router, _haversine_m


def test_haversine_zero_distance():
    assert _haversine_m(30.0, -97.0, 30.0, -97.0) == pytest.approx(0, abs=1)


def test_haversine_known():
    # NYC to LA ~3940 km
    d = _haversine_m(40.71, -74.01, 34.05, -118.24)
    assert 3_900_000 < d < 4_000_000


def test_router_returns_seconds():
    r = Router()
    t = r.route_time_latlng((30.27, -97.74), (30.30, -97.70))
    assert isinstance(t, int)
    assert t > 0


def test_router_caches():
    r = Router()
    t1 = r.route_time_latlng((30.27, -97.74), (30.30, -97.70))
    t2 = r.route_time_latlng((30.27, -97.74), (30.30, -97.70))
    assert t1 == t2


def test_router_same_point_clamps_to_min():
    r = Router()
    t = r.route_time_latlng((30.27, -97.74), (30.27, -97.74))
    assert t >= 5  # minimum clamp


def test_router_batch_matrix():
    r = Router()
    points = [(30.27, -97.74), (30.30, -97.70), (30.35, -97.65)]
    matrix = r.batch_matrix(points)
    assert len(matrix) == 3
    for row in matrix:
        assert len(row) == 3
    # Diagonal should be zero
    for i in range(3):
        assert matrix[i][i] == 0
    # Off-diagonal should be positive
    assert matrix[0][1] > 0
    assert matrix[1][0] > 0
