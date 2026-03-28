// ═══════════════════════════════════════════════════
// CloudRun — Road & Building Mesh Builder (XY Plane)
// Ribbon geometry for thick roads, building footprints
// Adapted from TravelPal/shared/map-road-mesh.js
// ═══════════════════════════════════════════════════

import * as THREE from "three";

// ── Color Utilities ──

export function darkenColor(hex, factor) {
  const c = hex.replace("#", "");
  let r = parseInt(c.slice(0, 2), 16);
  let g = parseInt(c.slice(2, 4), 16);
  let b = parseInt(c.slice(4, 6), 16);
  if (factor >= 0) {
    r = Math.round(r * (1 - factor));
    g = Math.round(g * (1 - factor));
    b = Math.round(b * (1 - factor));
  } else {
    const f = -factor;
    r = Math.round(r + (255 - r) * f);
    g = Math.round(g + (255 - g) * f);
    b = Math.round(b + (255 - b) * f);
  }
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ── Ribbon Geometry (miter joins, XY plane) ──

/**
 * Build a triangle-strip ribbon from a polyline in XY plane.
 * Camera looks down Z, so perpendicular is in XY: (-dy, dx).
 * @param {THREE.Vector3[]} points - polyline vertices (z is the layer height)
 * @param {number} width - ribbon full width
 * @returns {THREE.BufferGeometry}
 */
export function buildRibbonGeometry(points, width) {
  const n = points.length;
  if (n < 2) return new THREE.BufferGeometry();

  const halfW = width / 2;
  const positions = new Float32Array(n * 2 * 3);
  const indices = [];

  for (let i = 0; i < n; i++) {
    const cur = points[i];

    // Compute direction vectors in XY
    let dx = 0, dy = 0;
    if (i === 0) {
      dx = points[1].x - cur.x;
      dy = points[1].y - cur.y;
    } else if (i === n - 1) {
      dx = cur.x - points[n - 2].x;
      dy = cur.y - points[n - 2].y;
    } else {
      const prevDx = cur.x - points[i - 1].x;
      const prevDy = cur.y - points[i - 1].y;
      const nextDx = points[i + 1].x - cur.x;
      const nextDy = points[i + 1].y - cur.y;

      const prevLen = Math.sqrt(prevDx * prevDx + prevDy * prevDy) || 1;
      const nextLen = Math.sqrt(nextDx * nextDx + nextDy * nextDy) || 1;

      dx = prevDx / prevLen + nextDx / nextLen;
      dy = prevDy / prevLen + nextDy / nextLen;
    }

    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= len;
    dy /= len;

    // Perpendicular in XY plane (rotate 90°)
    let nx = -dy;
    let ny = dx;

    // Miter for internal vertices
    if (i > 0 && i < n - 1) {
      const prevDx = cur.x - points[i - 1].x;
      const prevDy = cur.y - points[i - 1].y;
      const nextDx = points[i + 1].x - cur.x;
      const nextDy = points[i + 1].y - cur.y;

      const prevLen = Math.sqrt(prevDx * prevDx + prevDy * prevDy) || 1;
      const nextLen = Math.sqrt(nextDx * nextDx + nextDy * nextDy) || 1;

      const n1x = -prevDy / prevLen, n1y = prevDx / prevLen;
      const n2x = -nextDy / nextLen, n2y = nextDx / nextLen;

      let mx = n1x + n2x;
      let my = n1y + n2y;
      const mLen = Math.sqrt(mx * mx + my * my);
      if (mLen > 0.001) {
        mx /= mLen;
        my /= mLen;
        const dot = mx * n1x + my * n1y;
        const miterScale = dot > 0.001 ? 1 / dot : 1;
        const clamped = Math.min(miterScale, 2);
        nx = mx * clamped;
        ny = my * clamped;
      }
    }

    const z = cur.z;
    const base = i * 6;
    // Left vertex
    positions[base] = cur.x + nx * halfW;
    positions[base + 1] = cur.y + ny * halfW;
    positions[base + 2] = z;
    // Right vertex
    positions[base + 3] = cur.x - nx * halfW;
    positions[base + 4] = cur.y - ny * halfW;
    positions[base + 5] = z;

    if (i < n - 1) {
      const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

// ── Road width table ──

const HIGHWAY_WIDTHS = {
  motorway: 2.5, motorway_link: 1.8,
  trunk: 2.2, trunk_link: 1.6,
  primary: 1.8, primary_link: 1.2,
  secondary: 1.4, secondary_link: 1.0,
  tertiary: 1.0, tertiary_link: 0.8,
  residential: 0.6, living_street: 0.5,
  unclassified: 0.5, service: 0.4,
};

/**
 * Build 2 merged meshes (stroke + fill) for XY-plane roads.
 * @param {Array} roads - [{h, p: [[lon,lat]...]}]
 * @param {Object} options
 * @param {Object} options.colors - per-highway fill color map
 * @param {Function} options.lonToX
 * @param {Function} options.latToY
 * @returns {{ strokeMesh, fillMesh, dispose() }}
 */
export function buildRoadMeshes(roads, { colors, lonToX, latToY }) {
  const fillGeos = [];
  const strokeGeos = [];

  for (const way of roads) {
    const fillColor = colors[way.h] || colors.residential || "#334455";
    const strokeColor = darkenColor(fillColor, 0.3);
    const w = HIGHWAY_WIDTHS[way.h] || 0.5;

    const points = way.p.map(([lon, lat]) => new THREE.Vector3(lonToX(lon), -latToY(lat), 0));
    if (points.length < 2) continue;

    // Fill (z = 0.002)
    const fillPts = points.map(p => new THREE.Vector3(p.x, p.y, 0.002));
    const fillGeo = buildRibbonGeometry(fillPts, w);
    if (fillGeo.attributes.position) {
      fillGeos.push({ geo: fillGeo, color: fillColor });
    }

    // Stroke (z = 0, behind fill) — thin edge, not a wide border
    const strokePts = points.map(p => new THREE.Vector3(p.x, p.y, 0));
    const strokeGeo = buildRibbonGeometry(strokePts, w * 1.12);
    if (strokeGeo.attributes.position) {
      strokeGeos.push({ geo: strokeGeo, color: strokeColor });
    }
  }

  // Group by color for fewer draw calls
  const fillMesh = _mergeColoredMeshes(fillGeos);
  const strokeMesh = _mergeColoredMeshes(strokeGeos);
  strokeMesh.renderOrder = 1;
  fillMesh.renderOrder = 2;

  return {
    strokeMesh,
    fillMesh,
    dispose() {
      if (strokeMesh) { strokeMesh.geometry.dispose(); strokeMesh.material.dispose(); }
      if (fillMesh) { fillMesh.geometry.dispose(); fillMesh.material.dispose(); }
    },
  };
}

/**
 * Merge colored geometries into a single mesh with vertex colors.
 */
function _mergeColoredMeshes(entries) {
  if (entries.length === 0) {
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    return new THREE.Mesh(geo, mat);
  }

  let totalVerts = 0, totalIdx = 0;
  for (const { geo } of entries) {
    totalVerts += geo.attributes.position.count;
    totalIdx += geo.index ? geo.index.count : 0;
  }

  const mergedPos = new Float32Array(totalVerts * 3);
  const mergedCol = new Float32Array(totalVerts * 3);
  const mergedIdx = new Uint32Array(totalIdx);
  let vertOffset = 0, idxOffset = 0, baseVert = 0;

  const tmpColor = new THREE.Color();

  for (const { geo, color } of entries) {
    const pos = geo.attributes.position.array;
    mergedPos.set(pos, vertOffset);

    // Set vertex colors
    tmpColor.set(color);
    const vertCount = geo.attributes.position.count;
    for (let v = 0; v < vertCount; v++) {
      const ci = (baseVert + v) * 3;
      mergedCol[ci] = tmpColor.r;
      mergedCol[ci + 1] = tmpColor.g;
      mergedCol[ci + 2] = tmpColor.b;
    }

    vertOffset += pos.length;

    if (geo.index) {
      const idx = geo.index.array;
      for (let i = 0; i < idx.length; i++) {
        mergedIdx[idxOffset + i] = idx[i] + baseVert;
      }
      idxOffset += idx.length;
    }
    baseVert += vertCount;
    geo.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(mergedPos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(mergedCol, 3));
  if (totalIdx > 0) {
    geo.setIndex(new THREE.BufferAttribute(mergedIdx, 1));
  }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}

// ── Single-color merge (for buildings) ──

function _mergeMeshes(geos, color) {
  if (geos.length === 0) {
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    return new THREE.Mesh(geo, mat);
  }

  let totalVerts = 0, totalIdx = 0;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIdx += g.index ? g.index.count : 0;
  }

  const mergedPos = new Float32Array(totalVerts * 3);
  const mergedIdx = new Uint32Array(totalIdx);
  let vertOffset = 0, idxOffset = 0, baseVert = 0;

  for (const g of geos) {
    const pos = g.attributes.position.array;
    mergedPos.set(pos, vertOffset);
    vertOffset += pos.length;

    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) {
        mergedIdx[idxOffset + i] = idx[i] + baseVert;
      }
      idxOffset += idx.length;
    }
    baseVert += g.attributes.position.count;
    g.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(mergedPos, 3));
  if (totalIdx > 0) {
    geo.setIndex(new THREE.BufferAttribute(mergedIdx, 1));
  }
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}

// ── Building Mesh Builder (XY Plane) ──

/**
 * Triangulate a flat polygon in XY plane at given Z layer.
 * ShapeGeometry produces XY geometry natively — perfect for our XY-plane camera.
 */
function _triangulatePoly(worldPts, z) {
  if (worldPts.length < 3) return null;

  const ox = worldPts[0].x;
  const oy = worldPts[0].y;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 1; i < worldPts.length; i++) {
    shape.lineTo(worldPts[i].x - ox, worldPts[i].y - oy);
  }
  shape.closePath();

  try {
    const shapeGeo = new THREE.ShapeGeometry(shape);
    // ShapeGeometry is already in XY — just offset to world coords and set Z
    const pos = shapeGeo.attributes.position.array;
    const newPos = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      newPos[i] = pos[i] + ox;
      newPos[i + 1] = pos[i + 1] + oy;
      newPos[i + 2] = z;
    }
    shapeGeo.setAttribute("position", new THREE.BufferAttribute(newPos, 3));
    return shapeGeo;
  } catch {
    return null;
  }
}

/**
 * Extrude a building polygon into a 3D block (XY base, Z = height).
 * ExtrudeGeometry extrudes along Z natively — which is exactly "up" for our camera.
 */
function _extrudeBuilding(worldPts, height) {
  if (worldPts.length < 3) return null;

  // Strip duplicate closing vertex (OSM polygons repeat first point)
  let pts = worldPts;
  const last = pts[pts.length - 1];
  const first = pts[0];
  if (Math.abs(last.x - first.x) < 0.001 && Math.abs(last.y - first.y) < 0.001) {
    pts = pts.slice(0, -1);
  }
  if (pts.length < 3) return null;

  const ox = pts[0].x;
  const oy = pts[0].y;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x - ox, pts[i].y - oy);
  }
  shape.closePath();

  try {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    // ExtrudeGeometry: shape in XY, extrusion along Z — exactly what we need.
    // Just add world offset and a base Z so buildings sit above roads.
    const pos = geo.attributes.position.array;
    const newPos = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      newPos[i] = pos[i] + ox;
      newPos[i + 1] = pos[i + 1] + oy;
      newPos[i + 2] = pos[i + 2] + 0.003; // base offset above road layer
    }
    geo.setAttribute("position", new THREE.BufferAttribute(newPos, 3));
    geo.computeVertexNormals();
    return geo;
  } catch (e) {
    console.warn("_extrudeBuilding error:", e.message);
    return null;
  }
}

/**
 * Build mesh for building footprints (XY plane).
 * @param {Array} buildings - [{p: [[lon,lat]...], h?: height, t?: type}]
 * @param {Object} options
 * @param {string} options.fillColor
 * @param {string} [options.outlineColor]
 * @param {"flat"|"extruded"} [options.mode="flat"]
 * @param {Function} options.lonToX
 * @param {Function} options.latToY
 * @returns {{ mesh, outlineMesh, light?, dispose() }}
 */
export function buildBuildingMesh(buildings, { fillColor, outlineColor, mode = "flat", lonToX, latToY }) {
  if (!buildings || buildings.length === 0) {
    return { mesh: null, outlineMesh: null, light: null, dispose() {} };
  }

  outlineColor = outlineColor || darkenColor(fillColor, 0.3);
  const fillGeos = [];
  const outlineGeos = [];

  for (const b of buildings) {
    if (!b.p || b.p.length < 3) continue;

    const worldPts = b.p.map(([lon, lat]) => ({
      x: lonToX(lon),
      y: -latToY(lat),
    }));

    if (mode === "extruded") {
      const height = b.h || 8;
      const worldHeight = height * 0.02;
      const geo = _extrudeBuilding(worldPts, worldHeight);
      if (geo) fillGeos.push(geo);

      // Outline at base
      const outlinePts = worldPts.map(p => new THREE.Vector3(p.x, p.y, 0.004));
      if (outlinePts.length > 0) outlinePts.push(outlinePts[0].clone());
      const outGeo = buildRibbonGeometry(outlinePts, 0.12);
      if (outGeo.attributes.position) outlineGeos.push(outGeo);
    } else {
      // Flat mode
      const geo = _triangulatePoly(worldPts, 0.001);
      if (geo) fillGeos.push(geo);

      // Outline ribbon
      const outlinePts = worldPts.map(p => new THREE.Vector3(p.x, p.y, 0.0015));
      if (outlinePts.length > 0) outlinePts.push(outlinePts[0].clone());
      const outGeo = buildRibbonGeometry(outlinePts, 0.06);
      if (outGeo.attributes.position) outlineGeos.push(outGeo);
    }
  }

  const mesh = fillGeos.length > 0 ? _mergeMeshes(fillGeos, fillColor) : null;
  const outlineMesh = outlineGeos.length > 0 ? _mergeMeshes(outlineGeos, outlineColor) : null;

  // Extruded mode: use Lambert material for 3D shading
  let light = null;
  if (mesh && mode === "extruded") {
    mesh.material.dispose();
    mesh.material = new THREE.MeshLambertMaterial({ color: darkenColor(fillColor, -0.25), side: THREE.DoubleSide });
    mesh.renderOrder = 5;
    light = new THREE.Group();
    light.add(new THREE.AmbientLight(0xffffff, 1.5));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 5, 10); // Z is "up" in XY plane
    light.add(dir);
  }

  return {
    mesh,
    outlineMesh,
    light,
    dispose() {
      if (mesh) { mesh.geometry.dispose(); mesh.material.dispose(); }
      if (outlineMesh) { outlineMesh.geometry.dispose(); outlineMesh.material.dispose(); }
    },
  };
}
