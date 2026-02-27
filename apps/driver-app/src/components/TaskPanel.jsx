import { formatDistance, formatDuration } from "../utils/geo.js";

export default function TaskPanel({
  phase,
  task,
  route,
  onAccept,
  onReject,
  onPickedUp,
  onDelivered,
  onVerifyId,
  onConfirmDelivery,
  onRefuse,
}) {
  if (phase === "IDLE") {
    return (
      <div className="task-panel">
        <div className="task-panel-content">
          <div className="task-panel-status">Waiting for task...</div>
        </div>
      </div>
    );
  }

  if (phase === "OFFER_RECEIVED" && task) {
    return (
      <div className="task-panel offer">
        <div className="task-panel-content">
          <div className="task-panel-title">New Delivery Offer</div>
          {task.pickup && (
            <div className="task-panel-detail">
              <span className="detail-label">Pickup:</span>{" "}
              {task.pickup.name || task.pickup.address}
            </div>
          )}
          {task.delivery && (
            <div className="task-panel-detail">
              <span className="detail-label">Deliver to:</span>{" "}
              {task.delivery.address}
            </div>
          )}
          <div className="task-panel-actions">
            <button className="btn btn-reject" onClick={onReject}>
              Reject
            </button>
            <button className="btn btn-accept" onClick={onAccept}>
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (
    (phase === "NAVIGATING_TO_PICKUP" || phase === "NAVIGATING_TO_DELIVERY") &&
    route
  ) {
    const dest =
      phase === "NAVIGATING_TO_PICKUP" ? "pickup" : "delivery";
    return (
      <div className="task-panel">
        <div className="task-panel-content">
          <div className="task-panel-title">
            En route to {dest}
          </div>
          <div className="task-panel-detail">
            <span className="detail-label">Distance:</span>{" "}
            {formatDistance(route.distance)}
          </div>
          <div className="task-panel-detail">
            <span className="detail-label">ETA:</span>{" "}
            {formatDuration(route.duration)}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "AT_PICKUP") {
    return (
      <div className="task-panel at-location">
        <div className="task-panel-content">
          <div className="task-panel-title">At Pickup Location</div>
          <div className="task-panel-detail">
            {task?.pickup?.name || "Store"}
          </div>
          <div className="task-panel-actions">
            <button className="btn btn-pickup" onClick={onPickedUp}>
              Confirm Picked Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "AT_DELIVERY") {
    return (
      <div className="task-panel at-location">
        <div className="task-panel-content">
          <div className="task-panel-title">At Delivery Location</div>
          <div className="task-panel-detail">
            {task?.delivery?.address || "Customer"}
          </div>
          <div className="task-panel-compliance-note">
            Customer ID verification required
          </div>
          <div className="task-panel-actions">
            <button className="btn btn-refuse" onClick={() => onRefuse("NO_ID")}>
              No ID
            </button>
            <button className="btn btn-verify" onClick={onVerifyId}>
              Verify Customer ID
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "VERIFYING_ID") {
    return (
      <div className="task-panel verifying">
        <div className="task-panel-content">
          <div className="task-panel-title">Verifying Customer ID...</div>
          <div className="task-panel-spinner" />
        </div>
      </div>
    );
  }

  if (phase === "ID_VERIFIED") {
    return (
      <div className="task-panel at-location">
        <div className="task-panel-content">
          <div className="task-panel-title">At Delivery Location</div>
          <div className="task-panel-verified-badge">
            Customer identity confirmed
          </div>
          <div className="task-panel-actions">
            <button className="btn btn-deliver" onClick={onConfirmDelivery}>
              Confirm Delivery
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "RETURNING_TO_STORE") {
    return (
      <div className="task-panel returning">
        <div className="task-panel-content">
          <div className="task-panel-title">Returning to Store</div>
          <div className="task-panel-detail">
            {task?.pickup?.name || "Store"}
          </div>
          {route && (
            <>
              <div className="task-panel-detail">
                <span className="detail-label">Distance:</span>{" "}
                {formatDistance(route.distance)}
              </div>
              <div className="task-panel-detail">
                <span className="detail-label">ETA:</span>{" "}
                {formatDuration(route.duration)}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
