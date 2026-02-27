import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { lonToX, latToY, WORLD_SCALE, getRoadsNear } from "../services/roads.js";

// Car marker images (all face right in the source image)
import carImg1 from "../assets/car-markers/cloudrun_car_marker_masked_1.png";
import carImg2 from "../assets/car-markers/cloudrun_car_marker_masked_2.png";
import carImg3 from "../assets/car-markers/cloudrun_car_marker_masked_3.png";
import carImg4 from "../assets/car-markers/cloudrun_car_marker_masked_4.png";
import carImg5 from "../assets/car-markers/cloudrun_car_marker_masked_5.png";
import carImg6 from "../assets/car-markers/cloudrun_car_marker_masked_6.png";

const CAR_IMAGES = [carImg1, carImg2, carImg3, carImg4, carImg5, carImg6];
const DEFAULT_CAR_INDEX = 0; // blue car

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
const DRIVER_COLOR = "#3b82f6";

const DEFAULT_ZOOM = 16;
const MIN_ZOOM = 12;
const MAX_ZOOM = 19;

// ── Emoji marker canvas texture ──
function createMarkerTexture(emoji, bgColor, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Circle background
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Emoji
  ctx.font = `${size * 0.5}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── Text label texture ──
function createTextTexture(text, { fontSize = 48, color = "#8899aa", fontWeight = "600" } = {}) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const pad = fontSize * 0.3;
  canvas.width = Math.ceil(metrics.width + pad * 2);
  canvas.height = Math.ceil(fontSize * 1.5);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return { tex, aspect: canvas.width / canvas.height };
}

export default function DriverMap({
  position,
  heading,
  pickup,
  delivery,
  routeGeometry,
}) {
  const containerRef = useRef(null);
  const stateRef = useRef({
    renderer: null,
    scene: null,
    camera: null,
    zoom: DEFAULT_ZOOM,
    animId: null,
    // Groups
    roadGroup: null,
    routeGroup: null,
    labelGroup: null,
    markerGroup: null,
    // Driver mesh parts
    driverDot: null,
    driverRing: null,
    pulseRing: null,
    // Marker sprites
    pickupSprite: null,
    deliverySprite: null,
    // Tracking
    lastRoadFetchPos: null,
    mounted: true,
    // Pulse animation
    pulsePhase: 0,
    // Smooth camera
    targetX: null,
    targetY: null,
    targetRotation: 0,
    // User interaction tracking
    userZoomed: false,
  });

  // ── Frustum size from zoom ──
  const frustumFromZoom = useCallback((zoom) => {
    return WORLD_SCALE / Math.pow(2, zoom);
  }, []);

  // ── Update camera frustum ──
  const updateFrustum = useCallback(() => {
    const s = stateRef.current;
    if (!s.camera || !s.renderer) return;
    const frustum = frustumFromZoom(s.zoom);
    const aspect =
      s.renderer.domElement.width / s.renderer.domElement.height;
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

    // Reset state for StrictMode remount
    s.mounted = true;
    s.driverDot = null;
    s.driverRing = null;
    s.pulseRing = null;
    s.pickupSprite = null;
    s.deliverySprite = null;
    s.lastRoadFetchPos = null;
    s.targetX = null;
    s.targetY = null;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(CLEAR_COLOR);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    s.renderer = renderer;

    // Scene
    const scene = new THREE.Scene();
    s.scene = scene;

    // Orthographic camera (top-down, Y is up in Three.js)
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
    // Look straight down (camera at Z=10, looking at Z=0 plane)
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    s.camera = camera;

    // Groups for organized layering
    s.roadGroup = new THREE.Group();
    s.routeGroup = new THREE.Group();
    s.labelGroup = new THREE.Group();
    s.markerGroup = new THREE.Group();
    scene.add(s.roadGroup);
    scene.add(s.routeGroup);
    scene.add(s.labelGroup);
    scene.add(s.markerGroup);

    // Animation loop
    const animate = () => {
      if (!s.mounted) return;

      // Pulse animation
      s.pulsePhase += 0.03;
      if (s.pulseRing) {
        const scale = 1 + 0.8 * Math.sin(s.pulsePhase);
        s.pulseRing.scale.set(scale, scale, 1);
        s.pulseRing.material.opacity = 0.3 * (1 - Math.sin(s.pulsePhase) * 0.5);
      }

      // Keep labels readable regardless of camera rotation
      if (s.labelGroup) {
        const camRot = camera.rotation.z;
        for (const child of s.labelGroup.children) {
          if (child.userData.isPlaceLabel) {
            // Place labels stay horizontal on screen
            child.rotation.z = camRot;
          } else if (child.userData.baseAngle !== undefined) {
            // Street labels flip to avoid being upside-down
            const base = child.userData.baseAngle;
            let screenAngle = base - camRot;
            screenAngle = ((screenAngle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
            child.rotation.z = (screenAngle > Math.PI / 2 || screenAngle < -Math.PI / 2)
              ? base + Math.PI
              : base;
          }
        }
      }

      // Smooth camera follow (move camera, not scene)
      if (s.targetX !== null && s.targetY !== null) {
        const dx = s.targetX - camera.position.x;
        const dy = s.targetY - camera.position.y;
        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
          camera.position.x += dx * 0.1;
          camera.position.y += dy * 0.1;
        }
      }

      renderer.render(scene, camera);
      s.animId = requestAnimationFrame(animate);
    };
    s.animId = requestAnimationFrame(animate);

    // Resize handler
    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      updateFrustum();
    };
    window.addEventListener("resize", onResize);

    // Zoom: mouse wheel
    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      s.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoom + delta));
      s.userZoomed = true;
      updateFrustum();
    };
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // Zoom: pinch (touch) + double-tap to reset
    let lastPinchDist = null;
    let wasPinching = false;
    let lastTapTime = 0;

    const resetView = () => {
      s.zoom = DEFAULT_ZOOM;
      s.userZoomed = false;
      updateFrustum();
      if (s.targetX !== null) {
        camera.position.x = s.targetX;
        camera.position.y = s.targetY;
      }
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        wasPinching = true;
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
        s.userZoomed = true;
        updateFrustum();
        lastPinchDist = dist;
      }
    };
    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        if (!wasPinching) {
          const now = Date.now();
          if (now - lastTapTime < 300) {
            resetView();
          }
          lastTapTime = now;
        }
        wasPinching = false;
      }
      lastPinchDist = null;
    };

    // Double-click for desktop
    const onDblClick = (e) => {
      e.preventDefault();
      resetView();
    };

    renderer.domElement.addEventListener("touchstart", onTouchStart, {
      passive: true,
    });
    renderer.domElement.addEventListener("touchmove", onTouchMove, {
      passive: false,
    });
    renderer.domElement.addEventListener("touchend", onTouchEnd, {
      passive: true,
    });
    renderer.domElement.addEventListener("dblclick", onDblClick);

    return () => {
      s.mounted = false;
      cancelAnimationFrame(s.animId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      renderer.domElement.removeEventListener("dblclick", onDblClick);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [frustumFromZoom, updateFrustum]);

  // ── Render roads into the roadGroup ──
  const renderRoads = useCallback((roads) => {
    const s = stateRef.current;
    if (!s.roadGroup) return;

    // Dispose old road meshes
    while (s.roadGroup.children.length > 0) {
      const child = s.roadGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      s.roadGroup.remove(child);
    }

    for (const road of roads) {
      const color = ROAD_COLORS[road.h] || ROAD_COLORS.residential;
      const points = road.p.map(
        ([lon, lat]) => new THREE.Vector3(lonToX(lon), -latToY(lat), 0)
      );
      if (points.length < 2) continue;

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color,
        linewidth: ROAD_WIDTHS[road.h] || 0.5,
      });
      const line = new THREE.Line(geometry, material);
      s.roadGroup.add(line);
    }
  }, []);

  // ── Render street + place labels ──
  const renderLabels = useCallback((roads, places) => {
    const s = stateRef.current;
    if (!s.labelGroup) return;

    // Dispose old labels
    while (s.labelGroup.children.length > 0) {
      const child = s.labelGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        child.material.map?.dispose();
        child.material.dispose();
      }
      s.labelGroup.remove(child);
    }

    // Street name labels
    const LABEL_ROADS = new Set([
      "motorway", "trunk", "primary", "secondary",
      "tertiary", "residential", "living_street", "unclassified",
    ]);
    const seen = new Set();

    for (const road of roads) {
      if (!road.n || !LABEL_ROADS.has(road.h)) continue;
      if (seen.has(road.n)) continue;
      seen.add(road.n);

      const pts = road.p.map(
        ([lon, lat]) => new THREE.Vector3(lonToX(lon), -latToY(lat), 0)
      );
      if (pts.length < 2) continue;

      const mid = Math.floor(pts.length / 2);
      const p1 = pts[Math.max(0, mid - 1)];
      const p2 = pts[Math.min(pts.length - 1, mid + 1)];
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      const h = 0.25;
      const { tex, aspect } = createTextTexture(road.n, {
        fontSize: 48,
        color: "#7799bb",
      });
      const geo = new THREE.PlaneGeometry(h * aspect, h);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pts[mid].x, pts[mid].y, 0.005);
      mesh.rotation.z = angle;
      mesh.userData.baseAngle = angle;
      s.labelGroup.add(mesh);
    }

    // Place labels (city, town, village, suburb, etc.)
    const PLACE_CONFIG = {
      city:          { height: 0.8,  fontSize: 72, color: "#bbccdd", fontWeight: "700" },
      town:          { height: 0.6,  fontSize: 64, color: "#aabbcc", fontWeight: "700" },
      village:       { height: 0.45, fontSize: 56, color: "#99aabb", fontWeight: "600" },
      suburb:        { height: 0.4,  fontSize: 48, color: "#8899aa", fontWeight: "600" },
      hamlet:        { height: 0.35, fontSize: 48, color: "#8899aa", fontWeight: "600" },
      neighbourhood: { height: 0.3,  fontSize: 40, color: "#778899", fontWeight: "600" },
    };

    for (const place of places) {
      const config = PLACE_CONFIG[place.type] || PLACE_CONFIG.suburb;
      const { tex, aspect } = createTextTexture(place.name, config);
      const geo = new THREE.PlaneGeometry(config.height * aspect, config.height);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(lonToX(place.lon), -latToY(place.lat), 0.015);
      mesh.userData.isPlaceLabel = true;
      s.labelGroup.add(mesh);
    }
  }, []);

  // ── Load roads when position changes ──
  useEffect(() => {
    if (!position) return;
    const s = stateRef.current;
    if (!s.scene) return;

    let cancelled = false;

    const fetchAndRender = async (attempt = 0) => {
      const data = await getRoadsNear(position.lat, position.lng);
      if (cancelled || !s.mounted) return;

      const roads = data?.roads || [];
      const places = data?.places || [];

      if (roads.length === 0) {
        // Retry once after a short delay (handles StrictMode race where
        // the first fetch is in-flight and second gets empty cached result)
        if (attempt === 0 && s.roadGroup.children.length === 0) {
          setTimeout(() => {
            if (!cancelled && s.mounted) fetchAndRender(1);
          }, 2000);
        }
        return;
      }

      // Skip re-render if roads are already drawn and position barely moved
      if (s.lastRoadFetchPos && s.roadGroup.children.length > 0) {
        const dx = position.lat - s.lastRoadFetchPos[0];
        const dy = position.lng - s.lastRoadFetchPos[1];
        if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return;
      }

      renderRoads(roads);
      renderLabels(roads, places);
      s.lastRoadFetchPos = [position.lat, position.lng];
    };

    fetchAndRender();

    return () => {
      cancelled = true;
    };
  }, [position, renderRoads, renderLabels]);

  // ── Route polyline ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene) return;

    // Dispose old route
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

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: ROUTE_COLOR,
      linewidth: 2,
    });
    const line = new THREE.Line(geometry, material);
    s.routeGroup.add(line);

    // Fit camera to route bounds — only when user hasn't manually zoomed
    if (points.length > 0 && s.camera && !s.userZoomed) {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const p of points) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rangeX = maxX - minX;
      const rangeY = maxY - minY;
      const range = Math.max(rangeX, rangeY) * 1.5;

      // Compute zoom from range
      if (range > 0) {
        const newZoom = Math.log2(WORLD_SCALE / range);
        s.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        updateFrustum();
      }

      s.camera.position.x = cx;
      s.camera.position.y = cy;
      s.targetX = cx;
      s.targetY = cy;
    }
  }, [routeGeometry, updateFrustum]);

  // ── Driver marker ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene || !position) return;

    const wx = lonToX(position.lng);
    const wy = -latToY(position.lat);

    // Marker size relative to frustum, capped so it doesn't get huge when zoomed out
    const frustum = frustumFromZoom(s.zoom);
    const markerSize = Math.min(frustum * 0.008, frustumFromZoom(16) * 0.008);

    if (!s.driverDot) {
      // Blue dot
      const dotGeo = new THREE.CircleGeometry(markerSize * 0.6, 32);
      const dotMat = new THREE.MeshBasicMaterial({ color: DRIVER_COLOR });
      s.driverDot = new THREE.Mesh(dotGeo, dotMat);
      s.driverDot.position.set(wx, wy, 0.02);
      s.markerGroup.add(s.driverDot);

      // White ring
      const ringGeo = new THREE.RingGeometry(
        markerSize * 0.6,
        markerSize * 0.8,
        32
      );
      const ringMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
      s.driverRing = new THREE.Mesh(ringGeo, ringMat);
      s.driverRing.position.set(wx, wy, 0.02);
      s.markerGroup.add(s.driverRing);

      // Pulse ring
      const pulseGeo = new THREE.RingGeometry(
        markerSize * 0.8,
        markerSize * 1.1,
        32
      );
      const pulseMat = new THREE.MeshBasicMaterial({
        color: DRIVER_COLOR,
        transparent: true,
        opacity: 0.3,
      });
      s.pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
      s.pulseRing.position.set(wx, wy, 0.019);
      s.markerGroup.add(s.pulseRing);
    } else {
      // Update positions
      s.driverDot.position.x = wx;
      s.driverDot.position.y = wy;
      s.driverRing.position.x = wx;
      s.driverRing.position.y = wy;
      s.pulseRing.position.x = wx;
      s.pulseRing.position.y = wy;

      // Resize for zoom
      const dotGeo = new THREE.CircleGeometry(markerSize * 0.6, 32);
      s.driverDot.geometry.dispose();
      s.driverDot.geometry = dotGeo;

      const ringGeo = new THREE.RingGeometry(
        markerSize * 0.6,
        markerSize * 0.8,
        32
      );
      s.driverRing.geometry.dispose();
      s.driverRing.geometry = ringGeo;

      const pulseGeo = new THREE.RingGeometry(
        markerSize * 0.8,
        markerSize * 1.1,
        32
      );
      s.pulseRing.geometry.dispose();
      s.pulseRing.geometry = pulseGeo;
    }

    // Camera follow — snap on first position, lerp after
    if (s.targetX === null) {
      s.camera.position.x = wx;
      s.camera.position.y = wy;
    }
    s.targetX = wx;
    s.targetY = wy;
  }, [position, frustumFromZoom]);

  // ── Heading rotation ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.camera || heading == null) return;
    // Only rotate when speed > ~1m/s (heading is unreliable when stationary)
    if (position?.speed != null && position.speed < 1) return;
    // Rotate camera around its viewing axis (Z) so forward = up
    s.camera.rotation.z = (-heading * Math.PI) / 180;
  }, [heading, position?.speed]);

  // ── Pickup marker ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene) return;

    if (s.pickupSprite) {
      s.pickupSprite.material.map?.dispose();
      s.pickupSprite.material.dispose();
      s.markerGroup.remove(s.pickupSprite);
      s.pickupSprite = null;
    }

    if (pickup) {
      const tex = createMarkerTexture("🏪", "#22c55e");
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      const wx = lonToX(pickup.lng);
      const wy = -latToY(pickup.lat);
      sprite.position.set(wx, wy, 0.02);
      const frustum = frustumFromZoom(s.zoom);
      const sz = Math.min(frustum * 0.012, frustumFromZoom(16) * 0.012);
      sprite.scale.set(sz, sz, 1);
      s.markerGroup.add(sprite);
      s.pickupSprite = sprite;
    }
  }, [pickup, frustumFromZoom]);

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
      const tex = createMarkerTexture("📍", "#ef4444");
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

  return <div ref={containerRef} className="driver-map" />;
}
