import StatusBadge from "../common/StatusBadge";

export default function TripList({ orders, selectedId, onSelect }) {
  if (!orders || orders.length === 0) {
    return <div className="empty-state">No orders found</div>;
  }
  return (
    <div className="trip-list">
      {orders.map((o) => (
        <div
          key={o.id}
          className={`trip-card ${selectedId === o.id ? "trip-card--selected" : ""}`}
          onClick={() => onSelect(o.id)}
        >
          <div className="trip-card__header">
            <span className="trip-card__id">{o.id.slice(0, 18)}</span>
            <StatusBadge status={o.status} small />
          </div>
          <div className="trip-card__footer">
            <span className="trip-card__store">{o.store_name || o.store_id?.slice(0, 12)}</span>
            <span className="trip-card__total">${((o.total_cents || 0) / 100).toFixed(2)}</span>
          </div>
          <div className="trip-card__time">{o.created_at ? new Date(o.created_at).toLocaleString() : ""}</div>
        </div>
      ))}
    </div>
  );
}
