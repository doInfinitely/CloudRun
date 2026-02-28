import { useState, useEffect } from "react";
import { getMerchant, reviewMerchant, updateMerchantStatus } from "../../services/api";
import StatusBadge from "../common/StatusBadge";
import ConfirmModal from "../common/ConfirmModal";

export default function MerchantDetail({ merchantId, onRefresh }) {
  const [merchant, setMerchant] = useState(null);
  const [modal, setModal] = useState(null);

  const load = () => {
    if (merchantId) getMerchant(merchantId).then(setMerchant).catch(console.error);
  };
  useEffect(load, [merchantId]);

  if (!merchantId) return <div className="detail-empty">Select a merchant to view details</div>;
  if (!merchant) return <div className="page-loading">Loading...</div>;

  const fmt = (c) => `$${(c / 100).toFixed(2)}`;

  const handleAction = async () => {
    try {
      if (modal.type === "approve") {
        await reviewMerchant(merchant.id, "approve");
      } else if (modal.type === "reject") {
        await reviewMerchant(merchant.id, "reject");
      } else if (modal.type === "suspend") {
        await updateMerchantStatus(merchant.id, "SUSPENDED");
      } else if (modal.type === "activate") {
        await updateMerchantStatus(merchant.id, "ACTIVE");
      }
      setModal(null);
      load();
      onRefresh?.();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="merchant-detail">
      <div className="trip-detail__header">
        <h3>{merchant.legal_name}</h3>
        <StatusBadge status={merchant.status} />
      </div>

      <div className="trip-detail__actions">
        {merchant.status === "PENDING" && (
          <>
            <button className="btn btn--success btn--small" onClick={() => setModal({ type: "approve", title: "Approve Merchant", msg: `Approve ${merchant.legal_name}?` })}>Approve</button>
            <button className="btn btn--danger btn--small" onClick={() => setModal({ type: "reject", title: "Reject Merchant", msg: `Reject ${merchant.legal_name}?` })}>Reject</button>
          </>
        )}
        {(merchant.status === "ACTIVE" || merchant.status === "APPROVED") && (
          <button className="btn btn--danger-outline btn--small" onClick={() => setModal({ type: "suspend", title: "Suspend Merchant", msg: `Suspend ${merchant.legal_name}?` })}>Suspend</button>
        )}
        {merchant.status === "SUSPENDED" && (
          <button className="btn btn--success btn--small" onClick={() => setModal({ type: "activate", title: "Activate Merchant", msg: `Re-activate ${merchant.legal_name}?` })}>Activate</button>
        )}
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4 className="section-title">Business Info</h4>
          <div className="detail-row"><span>ID</span><span className="mono">{merchant.id}</span></div>
          <div className="detail-row"><span>EIN</span><span>{merchant.ein || "N/A"}</span></div>
          <div className="detail-row"><span>Type</span><span>{merchant.business_type || "N/A"}</span></div>
          <div className="detail-row"><span>Email</span><span>{merchant.contact_email || "N/A"}</span></div>
          <div className="detail-row"><span>Phone</span><span>{merchant.contact_phone || "N/A"}</span></div>
          <div className="detail-row"><span>Created</span><span>{merchant.created_at ? new Date(merchant.created_at).toLocaleString() : "N/A"}</span></div>
        </div>

        <div className="detail-section">
          <h4 className="section-title">Stats</h4>
          <div className="detail-row"><span>Stores</span><span>{merchant.stores?.length || 0}</span></div>
          <div className="detail-row"><span>Products</span><span>{merchant.product_count}</span></div>
          <div className="detail-row"><span>Orders</span><span>{merchant.order_count}</span></div>
          <div className="detail-row"><span>Revenue</span><span>{fmt(merchant.total_revenue || 0)}</span></div>
        </div>

        {merchant.application_notes && (
          <div className="detail-section">
            <h4 className="section-title">Application Notes</h4>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>{merchant.application_notes}</p>
          </div>
        )}

        {merchant.reviewed_by && (
          <div className="detail-section">
            <h4 className="section-title">Review</h4>
            <div className="detail-row"><span>Reviewed By</span><span>{merchant.reviewed_by}</span></div>
            <div className="detail-row"><span>Reviewed At</span><span>{merchant.reviewed_at ? new Date(merchant.reviewed_at).toLocaleString() : "N/A"}</span></div>
          </div>
        )}

        {merchant.stores && merchant.stores.length > 0 && (
          <div className="detail-section">
            <h4 className="section-title">Stores</h4>
            {merchant.stores.map((s) => (
              <div key={s.id} className="detail-row">
                <span>{s.name || s.id}</span>
                <span>{s.address?.slice(0, 40)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ConfirmModal
          title={modal.title}
          message={modal.msg}
          confirmLabel={modal.type === "suspend" || modal.type === "reject" ? "Confirm" : "Approve"}
          danger={modal.type === "suspend" || modal.type === "reject"}
          onConfirm={handleAction}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
