function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function cents(c) {
  return "$" + (c / 100).toFixed(2);
}

export default function OrderCard({ order, onSelect, selected }) {
  return (
    <div
      className={`order-card ${selected ? "order-card--selected" : ""}`}
      onClick={() => onSelect(order.id)}
    >
      <div className="order-card__header">
        <span className="order-card__id">{order.id.slice(0, 14)}</span>
        <span className="order-card__time">{formatTime(order.created_at)}</span>
      </div>
      <div className="order-card__footer">
        <span className={`order-card__status status--${order.status.toLowerCase()}`}>{order.status.replace(/_/g, " ")}</span>
        <span className="order-card__total">{cents(order.total_cents)}</span>
      </div>
    </div>
  );
}
