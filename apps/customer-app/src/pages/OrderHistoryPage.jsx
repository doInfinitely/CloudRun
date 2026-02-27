import { useState, useEffect } from "react";
import { getOrderHistory } from "../services/api.js";
import { formatPrice, formatDate } from "../utils/format.js";
import OrderStatusBadge from "../components/OrderStatusBadge.jsx";

export default function OrderHistoryPage({ customerId, onTrackOrder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrderHistory(customerId)
      .then((data) => {
        setOrders(data.orders || data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [customerId]);

  const isActive = (status) => {
    return !["DELIVERED", "CANCELED", "REFUSED_RETURNING"].includes(status);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
      </div>
      {loading ? (
        <div className="loading-screen">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128230;</div>
          <div>No orders yet</div>
        </div>
      ) : (
        <div className="order-history-list">
          {orders.map((order) => (
            <div
              key={order.id}
              className="order-history-card"
              onClick={() => {
                if (isActive(order.status)) {
                  onTrackOrder(order.id);
                }
              }}
            >
              <div className="order-history-top">
                <span className="order-history-store">
                  {order.store_name || "Store"}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="order-history-bottom">
                <span>{formatDate(order.created_at)}</span>
                <span>{formatPrice(order.total_cents)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
