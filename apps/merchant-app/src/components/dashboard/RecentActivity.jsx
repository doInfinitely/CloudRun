function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function cents(c) {
  return "$" + (c / 100).toFixed(2);
}

export default function RecentActivity({ orders }) {
  if (!orders || orders.length === 0) {
    return <div className="recent-empty">No recent orders</div>;
  }
  return (
    <div className="recent-activity">
      <h3 className="recent-activity__title">Recent Activity</h3>
      <div className="recent-activity__list">
        {orders.map((o) => (
          <div key={o.id} className="recent-activity__item">
            <span className="recent-activity__id">{o.id.slice(0, 12)}...</span>
            <span className={`recent-activity__status status--${o.status.toLowerCase()}`}>{o.status}</span>
            <span className="recent-activity__amount">{cents(o.total_cents)}</span>
            <span className="recent-activity__time">{formatTime(o.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
