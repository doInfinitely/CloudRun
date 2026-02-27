const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export function decodePolyline(encoded) {
  const coords = [];
  let idx = 0;
  let lat = 0;
  let lng = 0;

  while (idx < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(idx++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(idx++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

export async function getRoute(fromLat, fromLng, toLat, toLng) {
  const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=polyline&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(`OSRM: ${data.code || "no route found"}`);
  }

  const route = data.routes[0];
  const leg = route.legs[0];

  return {
    geometry: decodePolyline(route.geometry),
    distance: route.distance,
    duration: route.duration,
    steps: leg.steps.map((s) => ({
      maneuver: s.maneuver,
      distance: s.distance,
      duration: s.duration,
      name: s.name || "",
      instruction: s.maneuver.type,
      modifier: s.maneuver.modifier || "",
      location: [s.maneuver.location[1], s.maneuver.location[0]], // [lat, lng]
    })),
  };
}
