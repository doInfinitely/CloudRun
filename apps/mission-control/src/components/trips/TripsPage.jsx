import { useState } from "react";
import { usePolling } from "../../hooks/usePolling";
import { getOrders } from "../../services/api";
import TripList from "./TripList";
import TripDetail from "./TripDetail";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Canceled", value: "CANCELED" },
];

const ACTIVE_STATUSES = ["PENDING_MERCHANT", "MERCHANT_ACCEPTED", "DISPATCHING", "PICKUP", "EN_ROUTE", "DOORSTEP_VERIFY"];

export default function TripsPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  usePolling(() => {
    return getOrders({ limit: 100 }).then((r) => setOrders(r.orders || []));
  }, 5000);

  let filtered = orders;
  if (filter === "active") {
    filtered = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  } else if (filter) {
    filtered = orders.filter((o) => o.status === filter);
  }

  return (
    <div className="trips-page">
      <div className="trips-page__tabs">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`tab-btn ${filter === f.value ? "tab-btn--active" : ""}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="trips-page__body">
        <div className="trips-page__list">
          <TripList orders={filtered} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="trips-page__detail">
          <TripDetail orderId={selectedId} />
        </div>
      </div>
    </div>
  );
}
