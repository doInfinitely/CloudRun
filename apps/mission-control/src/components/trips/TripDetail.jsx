import { useState, useEffect } from "react";
import { getOrder, orderAction } from "../../services/api";
import StatusBadge from "../common/StatusBadge";
import ConfirmModal from "../common/ConfirmModal";
import TripTimeline from "./TripTimeline";

export default function TripDetail({ orderId }) {
  const [order, setOrder] = useState(null);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    if (orderId) getOrder(orderId).then(setOrder).catch(console.error);
  }, [orderId]);

  if (!orderId) return <div className="detail-empty">Select a trip to view details</div>;
  if (!order) return <div className="page-loading">Loading...</div>;

  const fmt = (c) => `$${(c / 100).toFixed(2)}`;

  const handleCancel = async () => {
    try {
      await orderAction(order.id, "cancel");
      setShowCancel(false);
      getOrder(orderId).then(setOrder);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="trip-detail">
      <div className="trip-detail__header">
        <h3>{order.id}</h3>
        <StatusBadge status={order.status} />
      </div>

      <div className="trip-detail__actions">
        {order.status !== "DELIVERED" && order.status !== "CANCELED" && (
          <button className="btn btn--danger btn--small" onClick={() => setShowCancel(true)}>Cancel Order</button>
        )}
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4 className="section-title">Order Info</h4>
          <div className="detail-row"><span>Total</span><span>{fmt(order.total_cents)}</span></div>
          <div className="detail-row"><span>Subtotal</span><span>{fmt(order.subtotal_cents)}</span></div>
          <div className="detail-row"><span>Tax</span><span>{fmt(order.tax_cents)}</span></div>
          <div className="detail-row"><span>Fees</span><span>{fmt(order.fees_cents)}</span></div>
          <div className="detail-row"><span>Tip</span><span>{fmt(order.tip_cents)}</span></div>
          <div className="detail-row"><span>Payment</span><span>{order.payment_status}</span></div>
          <div className="detail-row"><span>Created</span><span>{order.created_at ? new Date(order.created_at).toLocaleString() : "N/A"}</span></div>
        </div>

        {order.store && (
          <div className="detail-section">
            <h4 className="section-title">Store</h4>
            <div className="detail-row"><span>Name</span><span>{order.store.name}</span></div>
            <div className="detail-row"><span>Address</span><span>{order.store.address}</span></div>
          </div>
        )}

        {order.customer && (
          <div className="detail-section">
            <h4 className="section-title">Customer</h4>
            <div className="detail-row"><span>Name</span><span>{order.customer.name || "N/A"}</span></div>
            <div className="detail-row"><span>Email</span><span>{order.customer.email || "N/A"}</span></div>
            <div className="detail-row"><span>Phone</span><span>{order.customer.phone || "N/A"}</span></div>
          </div>
        )}

        {order.driver && (
          <div className="detail-section">
            <h4 className="section-title">Driver</h4>
            <div className="detail-row"><span>Name</span><span>{order.driver.name || "N/A"}</span></div>
            <div className="detail-row"><span>Phone</span><span>{order.driver.phone || "N/A"}</span></div>
            <div className="detail-row"><span>Status</span><span><StatusBadge status={order.driver.status} small /></span></div>
          </div>
        )}

        {order.items_json && order.items_json.length > 0 && (
          <div className="detail-section">
            <h4 className="section-title">Items</h4>
            {order.items_json.map((item, i) => (
              <div key={i} className="detail-row">
                <span>{item.product_name || item.product_id}</span>
                <span>x{item.quantity} &middot; {fmt(item.line_total || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <TripTimeline events={order.events} />

      {showCancel && (
        <ConfirmModal
          title="Cancel Order"
          message={`Are you sure you want to cancel order ${order.id}?`}
          confirmLabel="Cancel Order"
          danger
          onConfirm={handleCancel}
          onCancel={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}
