import { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { lonToX, latToY, WORLD_SCALE, getRoadsNear, getBuildingsNear } from "../services/roads.js";
import { buildRoadMeshes, buildRibbonGeometry, buildBuildingMesh } from "../services/road-mesh.js";

// ── Road color tiers ──
const ROAD_COLORS = {
  motorway: "#8899aa",
  motorway_link: "#8899aa",
  trunk: "#778899",
  trunk_link: "#7788aa",
  primary: "#667788",
  primary_link: "#667788",
  secondary: "#556677",
  secondary_link: "#556677",
  tertiary: "#445566",
  tertiary_link: "#445566",
  residential: "#334455",
  living_street: "#334455",
  unclassified: "#334455",
  service: "#2a3a4a",
};

const ROAD_WIDTHS = {
  motorway: 2.5,
  motorway_link: 1.8,
  trunk: 2.2,
  trunk_link: 1.6,
  primary: 1.8,
  primary_link: 1.2,
  secondary: 1.4,
  secondary_link: 1.0,
  tertiary: 1.0,
  tertiary_link: 0.8,
  residential: 0.6,
  living_street: 0.5,
  unclassified: 0.5,
  service: 0.4,
};

const CLEAR_COLOR = "#0a0e17";
const ROUTE_COLOR = "#3b82f6";

const DEFAULT_ZOOM = 14;
const MIN_ZOOM = 12;
const MAX_ZOOM = 19;

// ── Emoji marker canvas texture ──
function createMarkerTexture(emoji, bgColor, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.font = `${size * 0.5}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function TrackingMap({ store, delivery, driverPosition, routeGeometry }) {
  const containerRef = useRef(null);
  const [buildings3D, setBuildings3D] = useState(false);
  const buildings3DRef = useRef(buildings3D);
  buildings3DRef.current = buildings3D;
  const stateRef = useRef({
    renderer: null,
    scene: null,
    camera: null,
    zoom: DEFAULT_ZOOM,
    animId: null,
    roadGroup: null,
    roadMeshes: null,
    buildingGroup: null,
    buildingMesh: null,
    routeGroup: null,
    markerGroup: null,
    storeSprite: null,
    deliverySprite: null,
    driverSprite: null,
    lastRoadFetchPos: null,
    mounted: true,
    pulsePhase: 0,
  });

  const frustumFromZoom = useCallback((zoom) => {
    return WORLD_SCALE / Math.pow(2, zoom);
  }, []);

  const updateFrustum = useCallback(() => {
    const s = stateRef.current;
    if (!s.camera || !s.renderer) return;
    const frustum = frustumFromZoom(s.zoom);
    const aspect = s.renderer.domElement.width / s.renderer.domElement.height;
    s.camera.left = (-frustum * aspect) / 2;
    s.camera.right = (frustum * aspect) / 2;
    s.camera.top = frustum / 2;
    s.camera.bottom = -frustum / 2;
    s.camera.updateProjectionMatrix();
  }, [frustumFromZoom]);

  // ── Scene setup ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const s = stateRef.current;

    s.mounted = true;
    s.storeSprite = null;
    s.deliverySprite = null;
    s.driverSprite = null;
    s.lastRoadFetchPos = null;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(CLEAR_COLOR);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    s.scene = scene;

    const frustum = frustumFromZoom(s.zoom);
    const aspect = el.clientWidth / el.clientHeight;
    const camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      100
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    s.camera = camera;

    s.roadGroup = new THREE.Group();
    s.buildingGroup = new THREE.Group();
    s.routeGroup = new THREE.Group();
    s.markerGroup = new THREE.Group();
    scene.add(s.roadGroup);
    scene.add(s.buildingGroup);
    scene.add(s.routeGroup);
    scene.add(s.markerGroup);

    const animate = () => {
      if (!s.mounted) return;

      // Pulse animation for driver
      s.pulsePhase += 0.03;

      renderer.render(scene, camera);
      s.animId = requestAnimationFrame(animate);
    };
    s.animId = requestAnimationFrame(animate);

    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      updateFrustum();
    };
    window.addEventListener("resize", onResize);

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      s.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoom + delta));
      updateFrustum();
    };
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    let lastPinchDist = null;
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2 && lastPinchDist !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = (dist - lastPinchDist) * 0.01;
        s.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoom + delta));
        updateFrustum();
        lastPinchDist = dist;
      }
    };
    const onTouchEnd = () => { lastPinchDist = null; };
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      s.mounted = false;
      cancelAnimationFrame(s.animId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [frustumFromZoom, updateFrustum]);

  // ── Load roads around store/delivery center ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene || !store) return;

    let cancelled = false;
    const centerLat = store.lat;
    const centerLng = store.lng;

    (async () => {
      const data = await getRoadsNear(centerLat, centerLng, 0.02);
      if (cancelled || !s.mounted) return;

      const roadArr = data?.roads || [];
      if (roadArr.length === 0) return;

      // Dispose old road meshes
      if (s.roadMeshes) {
        s.roadMeshes.dispose();
        if (s.roadMeshes.strokeMesh.parent) s.roadGroup.remove(s.roadMeshes.strokeMesh);
        if (s.roadMeshes.fillMesh.parent) s.roadGroup.remove(s.roadMeshes.fillMesh);
        s.roadMeshes = null;
      }
      while (s.roadGroup.children.length > 0) {
        const child = s.roadGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        s.roadGroup.remove(child);
      }

      s.roadMeshes = buildRoadMeshes(roadArr, {
        colors: ROAD_COLORS,
        lonToX,
        latToY,
      });
      s.roadGroup.add(s.roadMeshes.strokeMesh);
      s.roadGroup.add(s.roadMeshes.fillMesh);

      s.lastRoadFetchPos = [centerLat, centerLng];

      // Fetch buildings (delayed to avoid Overpass rate limiting)
      setTimeout(async () => {
        if (cancelled || !s.mounted) return;
        const buildings = await getBuildingsNear(centerLat, centerLng);
        if (cancelled || !s.mounted || !buildings?.length) return;
        s._buildingData = buildings;
        _renderBuildings(s);
      }, 1500);
    })();

    return () => { cancelled = true; };
  }, [store]);

  // ── Rebuild buildings when 2D/3D toggle changes ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s?.scene || !s._buildingData?.length) return;
    _renderBuildings(s);
  }, [buildings3D]);

  function _renderBuildings(s) {
    if (s.buildingMesh) {
      s.buildingMesh.dispose();
      if (s.buildingMesh.mesh?.parent) s.buildingGroup.remove(s.buildingMesh.mesh);
      if (s.buildingMesh.outlineMesh?.parent) s.buildingGroup.remove(s.buildingMesh.outlineMesh);
      if (s.buildingMesh.light?.parent) s.scene.remove(s.buildingMesh.light);
      s.buildingMesh = null;
    }

    const mode = buildings3DRef.current ? "extruded" : "flat";
    s.buildingMesh = buildBuildingMesh(s._buildingData, {
      fillColor: "#1a2233",
      outlineColor: "#2a3a55",
      mode,
      lonToX,
      latToY,
    });
    if (s.buildingMesh.mesh) s.buildingGroup.add(s.buildingMesh.mesh);
    if (s.buildingMesh.outlineMesh) s.buildingGroup.add(s.buildingMesh.outlineMesh);
    if (s.buildingMesh.light) s.scene.add(s.buildingMesh.light);
  }

  // ── Route polyline ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene) return;

    while (s.routeGroup.children.length > 0) {
      const child = s.routeGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      s.routeGroup.remove(child);
    }

    if (!routeGeometry || routeGeometry.length < 2) return;

    const points = routeGeometry.map(
      ([lat, lng]) => new THREE.Vector3(lonToX(lng), -latToY(lat), 0.01)
    );

    const routeGeo = buildRibbonGeometry(points, 1.2);
    const routeMat = new THREE.MeshBasicMaterial({
      color: ROUTE_COLOR,
      side: THREE.DoubleSide,
    });
    const routeMesh = new THREE.Mesh(routeGeo, routeMat);
    routeMesh.renderOrder = 3;
    s.routeGroup.add(routeMesh);
  }, [routeGeometry]);

  // ── Fit camera to bounds of store + delivery + driver ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.camera || !store) return;

    const coords = [];
    if (store) coords.push({ lat: store.lat, lng: store.lng });
    if (delivery) coords.push({ lat: delivery.lat, lng: delivery.lng });
    if (driverPosition) coords.push({ lat: driverPosition.lat, lng: driverPosition.lng });

    if (coords.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of coords) {
      const wx = lonToX(c.lng);
      const wy = -latToY(c.lat);
      minX = Math.min(minX, wx);
      maxX = Math.max(maxX, wx);
      minY = Math.min(minY, wy);
      maxY = Math.max(maxY, wy);
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const range = Math.max(rangeX, rangeY) * 2;

    if (range > 0) {
      const newZoom = Math.log2(WORLD_SCALE / range);
      s.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM - 1, newZoom));
      updateFrustum();
    }

    s.camera.position.x = cx;
    s.camera.position.y = cy;
  }, [store, delivery, driverPosition, updateFrustum]);

  // ── Store marker ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene) return;

    if (s.storeSprite) {
      s.storeSprite.material.map?.dispose();
      s.storeSprite.material.dispose();
      s.markerGroup.remove(s.storeSprite);
      s.storeSprite = null;
    }

    if (store) {
      const tex = createMarkerTexture("\uD83C\uDFEA", "#22c55e");
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      const wx = lonToX(store.lng);
      const wy = -latToY(store.lat);
      sprite.position.set(wx, wy, 0.02);
      const frustum = frustumFromZoom(s.zoom);
      const sz = Math.min(frustum * 0.012, frustumFromZoom(16) * 0.012);
      sprite.scale.set(sz, sz, 1);
      s.markerGroup.add(sprite);
      s.storeSprite = sprite;
    }
  }, [store, frustumFromZoom]);

  // ── Delivery marker ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene) return;

    if (s.deliverySprite) {
      s.deliverySprite.material.map?.dispose();
      s.deliverySprite.material.dispose();
      s.markerGroup.remove(s.deliverySprite);
      s.deliverySprite = null;
    }

    if (delivery) {
      const tex = createMarkerTexture("\uD83D\uDCCD", "#ef4444");
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      const wx = lonToX(delivery.lng);
      const wy = -latToY(delivery.lat);
      sprite.position.set(wx, wy, 0.02);
      const frustum = frustumFromZoom(s.zoom);
      const sz = Math.min(frustum * 0.012, frustumFromZoom(16) * 0.012);
      sprite.scale.set(sz, sz, 1);
      s.markerGroup.add(sprite);
      s.deliverySprite = sprite;
    }
  }, [delivery, frustumFromZoom]);

  // ── Driver marker (car sprite) ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene) return;

    if (s.driverSprite) {
      s.driverSprite.material.map?.dispose();
      s.driverSprite.material.dispose();
      s.markerGroup.remove(s.driverSprite);
      s.driverSprite = null;
    }

    if (driverPosition) {
      const tex = createMarkerTexture("\uD83D\uDE97", "#3b82f6");
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      const wx = lonToX(driverPosition.lng);
      const wy = -latToY(driverPosition.lat);
      sprite.position.set(wx, wy, 0.03);
      const frustum = frustumFromZoom(s.zoom);
      const sz = Math.min(frustum * 0.014, frustumFromZoom(16) * 0.014);
      sprite.scale.set(sz, sz, 1);
      s.markerGroup.add(sprite);
      s.driverSprite = sprite;
    }
  }, [driverPosition, frustumFromZoom]);

  return (
    <div className="tracking-map-container">
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <button
        onClick={() => setBuildings3D(v => !v)}
        style={{
          position: "absolute", top: 12, right: 12, zIndex: 20,
          background: "#0a0e17CC",
          border: "1px solid #3b82f666",
          borderRadius: 6, padding: "5px 10px", cursor: "pointer",
          color: buildings3D ? "#3b82f6" : "#8899aa",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 12, fontWeight: 700, letterSpacing: 1, lineHeight: 1,
          backdropFilter: "blur(4px)",
        }}
      >{buildings3D ? "3D" : "2D"}</button>
    </div>
  );
}
