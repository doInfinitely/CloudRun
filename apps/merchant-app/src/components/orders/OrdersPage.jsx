import { useState, useCallback } from "react";
import { getOrders } from "../../services/api";
import { usePolling } from "../../hooks/usePolling";
import OrderCard from "./OrderCard";
import OrderDetail from "./OrderDetail";

const TABS = [
  { key: "PENDING_MERCHANT", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "DELIVERED", label: "Completed" },
  { key: "CANCELED", label: "Cancelled" },
];

const ACTIVE_STATUSES = ["MERCHANT_ACCEPTED", "DISPATCHING", "PICKUP", "EN_ROUTE", "DOORSTEP_VERIFY"];

export default function OrdersPage({ merchantId, storeId }) {
  const [tab, setTab] = useState("PENDING_MERCHANT");
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!storeId) return;
    if (tab === "active") {
      // Fetch all active statuses
      const results = await Promise.all(
        ACTIVE_STATUSES.map((s) => getOrders(merchantId, storeId, { status: s, limit: 50 }))
      );
      const all = results.flatMap((r) => r.orders);
      all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(all);
    } else {
      const res = await getOrders(merchantId, storeId, { status: tab, limit: 50 });
      setOrders(res.orders);
    }
  }, [merchantId, storeId, tab]);

  const pollInterval = tab === "PENDING_MERCHANT" ? 5000 : 10000;
  usePolling(fetchOrders, pollInterval, [merchantId, storeId, tab]);

  return (
    <div className="orders-page">
      <div className="orders-page__tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? "tab-btn--active" : ""}`}
            onClick={() => { setTab(t.key); setSelectedId(null); }}
          >
            {t.label}
            {t.key === "PENDING_MERCHANT" && orders.length > 0 && tab === "PENDING_MERCHANT" && (
              <span className="tab-btn__badge">{orders.length}</span>
            )}
          </button>
        ))}
      </div>
      <div className="orders-page__body">
        <div className="orders-page__list">
          {orders.length === 0 ? (
            <div className="orders-empty">No orders</div>
          ) : (
            orders.map((o) => (
              <OrderCard key={o.id} order={o} selected={selectedId === o.id} onSelect={setSelectedId} />
            ))
          )}
        </div>
        <div className="orders-page__detail">
          <OrderDetail
            merchantId={merchantId}
            storeId={storeId}
            orderId={selectedId}
            onActionDone={fetchOrders}
          />
        </div>
      </div>
    </div>
  );
}
