const STATUS_COLORS = {
  // Orders
  CREATED: "var(--muted)", VERIFYING_AGE: "var(--muted)", PAYMENT_AUTH: "var(--muted)",
  PENDING_MERCHANT: "var(--warning)", MERCHANT_ACCEPTED: "var(--accent2)",
  DISPATCHING: "var(--accent)", PICKUP: "var(--accent)", EN_ROUTE: "var(--accent)",
  DOORSTEP_VERIFY: "var(--accent-glow)", DELIVERED: "var(--success)",
  REFUSED_RETURNING: "var(--danger)", CANCELED: "var(--danger)",
  // Tickets
  OPEN: "var(--warning)", IN_PROGRESS: "var(--accent)", RESOLVED: "var(--success)", CLOSED: "var(--muted)",
  // Merchants
  PENDING: "var(--warning)", APPROVED: "var(--success)", ACTIVE: "var(--success)", SUSPENDED: "var(--danger)",
  // Priority
  LOW: "var(--muted)", MEDIUM: "var(--accent2)", HIGH: "var(--warning)", URGENT: "var(--danger)",
  // Drivers
  IDLE: "var(--success)", ON_TASK: "var(--accent)", OFFLINE: "var(--muted)", PAUSED: "var(--warning)",
  // Docs
  REJECTED: "var(--danger)",
};

export default function StatusBadge({ status, small }) {
  const color = STATUS_COLORS[status] || "var(--muted)";
  return (
    <span
      className="status-badge"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        padding: small ? "2px 6px" : "3px 10px",
        borderRadius: 12,
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}
