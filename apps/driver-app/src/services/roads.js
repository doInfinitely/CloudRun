// ── Web Mercator projection (matches TravelPal/PhantomNav) ──
export const WORLD_SCALE = 1000000;

export function lonToX(lng) {
  return ((lng + 180) / 360) * WORLD_SCALE;
}

export function latToY(lat) {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    WORLD_SCALE
  );
}

// ── Overpass API road loader ──

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const HIGHWAY_TYPES = [
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
  "residential",
  "living_street",
  "unclassified",
  "service",
];

const HIGHWAY_REGEX = HIGHWAY_TYPES.join("|");

// Cache: keyed by grid cell (0.01° ≈ 1.1km), 10 min TTL
const _cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

// Throttle: minimum 1.5s between Overpass requests
let _lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 1500;

// Last fetch center for 500m refetch threshold
let _lastCenter = null;

function gridKey(lat, lng) {
  return `${Math.floor(lat / 0.01)},${Math.floor(lng / 0.01)}`;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch roads near a position from Overpass API.
 * Returns array of { h: highway_type, p: [[lon,lat],...], n: name }
 * Skips fetch if driver hasn't moved >500m from last fetch center.
 */
export async function getRoadsNear(lat, lng, radiusDeg = 0.015) {
  // Skip if driver hasn't moved far enough
  if (
    _lastCenter &&
    haversineM(lat, lng, _lastCenter[0], _lastCenter[1]) < 500
  ) {
    const key = gridKey(lat, lng);
    const cached = _cache.get(key);
    if (cached && Date.now() - cached.t < CACHE_TTL) {
      return cached.data;
    }
  }

  const key = gridKey(lat, lng);
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.t < CACHE_TTL) {
    return cached.data;
  }

  // Throttle
  const now = Date.now();
  const wait = MIN_FETCH_INTERVAL - (now - _lastFetchTime);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }

  const bbox = [
    lat - radiusDeg,
    lng - radiusDeg,
    lat + radiusDeg,
    lng + radiusDeg,
  ];

  const query = `[out:json][timeout:30];(way["highway"~"^(${HIGHWAY_REGEX})$"](${bbox.join(",")}););out body;>;out skel qt;`;

  _lastFetchTime = Date.now();

  const resp = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });

  if (!resp.ok) {
    console.warn("[roads] Overpass returned", resp.status);
    return cached?.data || [];
  }

  const json = await resp.json();

  // Build node lookup
  const nodes = new Map();
  for (const el of json.elements) {
    if (el.type === "node") {
      nodes.set(el.id, [el.lon, el.lat]);
    }
  }

  // Resolve ways → coordinate arrays
  const roads = [];
  for (const el of json.elements) {
    if (el.type !== "way" || !el.tags?.highway) continue;
    const coords = el.nodes
      ?.map((nid) => nodes.get(nid))
      .filter(Boolean);
    if (!coords || coords.length < 2) continue;
    roads.push({
      h: el.tags.highway,
      p: coords,
      n: el.tags.name || "",
    });
  }

  _cache.set(key, { data: roads, t: Date.now() });
  _lastCenter = [lat, lng];

  return roads;
}
