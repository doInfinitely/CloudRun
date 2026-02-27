import { useRef, useEffect } from "react";

const TILES_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

export default function DriverMap({
  leafletReady,
  position,
  heading,
  pickup,
  delivery,
  routeGeometry,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const deliveryMarkerRef = useRef(null);
  const polylineRef = useRef(null);

  // Init map
  useEffect(() => {
    if (!leafletReady || !containerRef.current || mapRef.current) return;
    const L = window.L;

    const map = L.map(containerRef.current, {
      center: [37.7749, -122.4194], // default SF
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(TILES_URL, {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [leafletReady]);

  // Update driver marker
  useEffect(() => {
    if (!mapRef.current || !position) return;
    const L = window.L;
    const { lat, lng } = position;

    if (!driverMarkerRef.current) {
      const icon = L.divIcon({
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: `<div class="driver-dot"></div>`,
      });
      driverMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(
        mapRef.current
      );
      mapRef.current.setView([lat, lng], 16);
    } else {
      driverMarkerRef.current.setLatLng([lat, lng]);
      mapRef.current.panTo([lat, lng]);
    }
  }, [position]);

  // Update pickup marker
  useEffect(() => {
    if (!mapRef.current) return;
    const L = window.L;

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    if (pickup) {
      const icon = L.divIcon({
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        html: `<div class="marker-pickup">🏪</div>`,
      });
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon }).addTo(
        mapRef.current
      );
    }
  }, [pickup]);

  // Update delivery marker
  useEffect(() => {
    if (!mapRef.current) return;
    const L = window.L;

    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.remove();
      deliveryMarkerRef.current = null;
    }

    if (delivery) {
      const icon = L.divIcon({
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        html: `<div class="marker-delivery">📍</div>`,
      });
      deliveryMarkerRef.current = L.marker([delivery.lat, delivery.lng], { icon }).addTo(
        mapRef.current
      );
    }
  }, [delivery]);

  // Update route polyline
  useEffect(() => {
    if (!mapRef.current) return;
    const L = window.L;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (routeGeometry && routeGeometry.length > 0) {
      polylineRef.current = L.polyline(routeGeometry, {
        color: "#3b82f6",
        weight: 5,
        opacity: 0.8,
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(polylineRef.current.getBounds(), {
        padding: [60, 60],
      });
    }
  }, [routeGeometry]);

  return <div ref={containerRef} className="driver-map" />;
}
