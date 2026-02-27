import { useState, useEffect } from "react";
import { getOrder, orderAction } from "../../services/api";

function cents(c) {
  return "$" + (c / 100).toFixed(2);
}

export default function OrderDetail({ merchantId, storeId, orderId, onActionDone }) {
  const [detail, setDetail] = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    getOrder(merchantId, storeId, orderId).then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => { cancelled = true; };
  }, [merchantId, storeId, orderId]);

  if (!orderId) return <div className="order-detail__empty">Select an order</div>;
  if (!detail) return <div className="order-detail__empty">Loading...</div>;

  const handleAction = async (action) => {
    setActing(true);
    try {
      await orderAction(merchantId, storeId, orderId, action);
      const updated = await getOrder(merchantId, storeId, orderId);
      setDetail(updated);
      onActionDone?.();
    } catch (e) {
      alert(e.message);
    }
    setActing(false);
  };

  const isPending = detail.status === "PENDING_MERCHANT";

  return (
    <div className="order-detail">
      <h3 className="order-detail__title">Order {detail.id.slice(0, 14)}</h3>
      <div className={`order-detail__status status--${detail.status.toLowerCase()}`}>
        {detail.status.replace(/_/g, " ")}
      </div>

      {isPending && (
        <div className="order-detail__actions">
          <button className="btn btn--success" disabled={acting} onClick={() => handleAction("accept")}>
            Accept
          </button>
          <button className="btn btn--danger" disabled={acting} onClick={() => handleAction("reject")}>
            Reject
          </button>
        </div>
      )}

      <div className="order-detail__section">
        <h4>Items</h4>
        {detail.items_json && detail.items_json.length > 0 ? (
          <ul className="order-detail__items">
            {detail.items_json.map((item, i) => (
              <li key={i} className="order-detail__item">
                <span>{item.name || item.product_id}</span>
                <span>x{item.quantity}</span>
                <span>{cents(item.line_total_cents || item.price_cents * item.quantity)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No items data</p>
        )}
      </div>

      <div className="order-detail__section">
        <h4>Totals</h4>
        <div className="order-detail__row"><span>Subtotal</span><span>{cents(detail.subtotal_cents)}</span></div>
        <div className="order-detail__row"><span>Tax</span><span>{cents(detail.tax_cents)}</span></div>
        <div className="order-detail__row"><span>Fees</span><span>{cents(detail.fees_cents)}</span></div>
        <div className="order-detail__row"><span>Tip</span><span>{cents(detail.tip_cents)}</span></div>
        <div className="order-detail__row order-detail__row--total"><span>Total</span><span>{cents(detail.total_cents)}</span></div>
      </div>

      {detail.delivery_task && (
        <div className="order-detail__section">
          <h4>Delivery</h4>
          <div className="order-detail__row"><span>Task</span><span>{detail.delivery_task.status}</span></div>
          {detail.driver && (
            <>
              <div className="order-detail__row"><span>Driver</span><span>{detail.driver.name || detail.driver.id}</span></div>
              <div className="order-detail__row"><span>Driver Status</span><span>{detail.driver.status}</span></div>
            </>
          )}
        </div>
      )}

      <div className="order-detail__section">
        <div className="order-detail__row"><span>Payment</span><span>{detail.payment_status}</span></div>
        <div className="order-detail__row"><span>Created</span><span>{detail.created_at ? new Date(detail.created_at).toLocaleString() : ""}</span></div>
      </div>
    </div>
  );
}
