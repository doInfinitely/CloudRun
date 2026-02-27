const STATUS_LABELS = {
  CREATED: "Created",
  VERIFYING_AGE: "Verifying Age",
  PAYMENT_AUTH: "Payment",
  PENDING_MERCHANT: "Pending",
  MERCHANT_ACCEPTED: "Accepted",
  DISPATCHING: "Dispatching",
  PICKUP: "Pickup",
  EN_ROUTE: "En Route",
  DOORSTEP_VERIFY: "At Door",
  DELIVERED: "Delivered",
  REFUSED_RETURNING: "Returned",
  CANCELED: "Canceled",
};

export default function OrderStatusBadge({ status }) {
  const cls = (status || "").toLowerCase();
  return (
    <span className={`status-badge ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
