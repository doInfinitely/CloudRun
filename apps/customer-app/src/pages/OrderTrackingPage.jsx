import { useState, useEffect } from "react";
import useOrderTracking from "../hooks/useOrderTracking.js";
import { getRoute } from "../services/routing.js";
import TrackingMap from "../components/TrackingMap.jsx";
import StatusTimeline from "../components/StatusTimeline.jsx";

const STATUS_INFO = {
  CREATED: { icon: "\uD83D\uDCE6", text: "Order placed" },
  VERIFYING_AGE: { icon: "\uD83D\uDD12", text: "Verifying age" },
  PAYMENT_AUTH: { icon: "\uD83D\uDCB3", text: "Processing payment" },
  PENDING_MERCHANT: { icon: "\u23F3", text: "Waiting for store" },
  MERCHANT_ACCEPTED: { icon: "\u2705", text: "Store accepted" },
  DISPATCHING: { icon: "\uD83D\uDD0D", text: "Finding a driver" },
  PICKUP: { icon: "\uD83C\uDFEA", text: "Driver picking up" },
  EN_ROUTE: { icon: "\uD83D\uDE97", text: "On the way" },
  DOORSTEP_VERIFY: { icon: "\uD83D\uDEAA", text: "Driver at your door" },
  DELIVERED: { icon: "\uD83C\uDF89", text: "Delivered!" },
  REFUSED_RETURNING: { icon: "\u274C", text: "Delivery refused" },
  CANCELED: { icon: "\u274C", text: "Canceled" },
};

export default function OrderTrackingPage({ orderId, onBack }) {
  const { tracking, error } = useOrderTracking(orderId);
  const [routeGeometry, setRouteGeometry] = useState(null);

  // Fetch route between store and delivery
  useEffect(() => {
    if (!tracking?.store || !tracking?.delivery) return;
    if (routeGeometry) return; // only fetch once

    const { lat: sLat, lng: sLng } = tracking.store;
    const { lat: dLat, lng: dLng } = tracking.delivery;
    if (!sLat || !sLng || !dLat || !dLng) return;

    getRoute(sLat, sLng, dLat, dLng)
      .then((route) => setRouteGeometry(route.geometry))
      .catch(() => {});
  }, [tracking?.store, tracking?.delivery]);

  if (!tracking) {
    return <div className="loading-screen">Loading tracking...</div>;
  }

  const status = tracking.status || "CREATED";
  const info = STATUS_INFO[status] || STATUS_INFO.CREATED;

  return (
    <div className="tracking-page">
      <TrackingMap
        store={tracking.store}
        delivery={tracking.delivery}
        driverPosition={tracking.driver}
        routeGeometry={routeGeometry}
      />

      <div className="tracking-panel">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button className="back-btn" onClick={onBack}>&#8592;</button>
          <div className="tracking-status-header" style={{ marginBottom: 0 }}>
            <span className="tracking-status-icon">{info.icon}</span>
            <div>
              <div className="tracking-status-text">{info.text}</div>
              {tracking.driver && (
                <div className="tracking-status-sub">
                  Driver: {tracking.driver.name || "Assigned"}
                </div>
              )}
            </div>
          </div>
        </div>

        <StatusTimeline currentStatus={status} />

        {tracking.driver && (
          <div className="driver-info">
            <div className="driver-avatar">&#128100;</div>
            <div>
              <div className="driver-name">{tracking.driver.name || "Driver"}</div>
              <div className="driver-label">Your delivery driver</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
