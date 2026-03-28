from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import requests
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from packages.db.session import get_db
from packages.db.models import BuildingCache

log = logging.getLogger(__name__)

router = APIRouter()

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
CACHE_TTL = timedelta(days=30)  # buildings rarely change


def _grid_key(lat: float, lng: float) -> str:
    """0.01° grid cell (~1.1 km)."""
    return f"{int(lat * 100)},{int(lng * 100)}"


def _fetch_overpass(lat: float, lng: float) -> list[dict]:
    delta = 0.015
    bbox = f"{lat - delta},{lng - delta},{lat + delta},{lng + delta}"
    query = f'[out:json][timeout:25];(way["building"]({bbox}););out body geom;'

    for attempt in range(3):
        try:
            resp = requests.post(
                OVERPASS_URL,
                data={"data": query},
                timeout=30,
            )
            if resp.status_code == 429:
                log.warning("Overpass 429, attempt %d", attempt)
                import time; time.sleep(3 * (attempt + 1))
                continue
            resp.raise_for_status()
            break
        except requests.RequestException:
            if attempt == 2:
                raise
    else:
        resp.raise_for_status()

    data = resp.json()
    buildings = []
    for el in data.get("elements", []):
        if el.get("type") != "way" or not el.get("geometry"):
            continue
        pts = [[round(g["lon"], 5), round(g["lat"], 5)] for g in el["geometry"]]
        if len(pts) < 3:
            continue
        entry: dict = {"p": pts}
        h = 0.0
        tags = el.get("tags", {})
        try:
            h = float(tags.get("height", 0))
        except (ValueError, TypeError):
            pass
        if h == 0:
            try:
                h = float(tags.get("building:levels", 0)) * 3
            except (ValueError, TypeError):
                pass
        if h > 0:
            entry["h"] = round(h)
        btype = tags.get("building", "yes")
        if btype != "yes":
            entry["t"] = btype
        buildings.append(entry)

    return buildings


@router.get("/buildings")
def get_buildings(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    db: Session = Depends(get_db),
):
    key = _grid_key(lat, lng)

    # Check DB cache
    cached = db.get(BuildingCache, key)
    if cached:
        age = datetime.now(timezone.utc) - cached.fetched_at.replace(tzinfo=timezone.utc)
        if age < CACHE_TTL:
            return {"buildings": cached.data_json, "cached": True}

    # Fetch from Overpass
    try:
        buildings = _fetch_overpass(lat, lng)
    except Exception as e:
        log.error("Overpass fetch failed: %s", e)
        # Return stale cache if available
        if cached:
            return {"buildings": cached.data_json, "cached": True}
        return {"buildings": [], "cached": False}

    # Upsert into DB
    if cached:
        cached.data_json = buildings
        cached.fetched_at = datetime.now(timezone.utc)
    else:
        cached = BuildingCache(grid_key=key, data_json=buildings)
        db.add(cached)
    db.commit()

    return {"buildings": buildings, "cached": False}
