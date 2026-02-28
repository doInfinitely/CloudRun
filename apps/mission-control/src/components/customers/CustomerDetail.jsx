import { useState, useEffect } from "react";
import { getCustomer } from "../../services/api";
import StatusBadge from "../common/StatusBadge";

export default function CustomerDetail({ customerId }) {
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (customerId) getCustomer(customerId).then(setCustomer).catch(console.error);
  }, [customerId]);

  if (!customerId) return <div className="detail-empty">Select a customer to view details</div>;
  if (!customer) return <div className="page-loading">Loading...</div>;

  const fmt = (c) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="customer-detail">
      <div className="trip-detail__header">
        <h3>{customer.name || customer.id}</h3>
        <StatusBadge status={customer.status} />
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4 className="section-title">Profile</h4>
          <div className="detail-row"><span>ID</span><span className="mono">{customer.id}</span></div>
          <div className="detail-row"><span>Email</span><span>{customer.email || "N/A"}</span></div>
          <div className="detail-row"><span>Phone</span><span>{customer.phone || "N/A"}</span></div>
          <div className="detail-row"><span>DOB</span><span>{customer.dob || "N/A"}</span></div>
          <div className="detail-row"><span>Created</span><span>{customer.created_at ? new Date(customer.created_at).toLocaleString() : "N/A"}</span></div>
        </div>

        {customer.addresses && customer.addresses.length > 0 && (
          <div className="detail-section">
            <h4 className="section-title">Addresses</h4>
            {customer.addresses.map((a) => (
              <div key={a.id} className="detail-row">
                <span>{a.address?.slice(0, 50)}</span>
                <span>{a.deliverable_flag ? "Deliverable" : "Not Deliverable"}</span>
              </div>
            ))}
          </div>
        )}

        {customer.verifications && customer.verifications.length > 0 && (
          <div className="detail-section">
            <h4 className="section-title">Age Verifications</h4>
            {customer.verifications.map((v) => (
              <div key={v.id} className="detail-row">
                <span>{v.method}</span>
                <StatusBadge status={v.status} small />
              </div>
            ))}
          </div>
        )}

        {customer.orders && customer.orders.length > 0 && (
          <div className="detail-section">
            <h4 className="section-title">Order History ({customer.orders.length})</h4>
            {customer.orders.map((o) => (
              <div key={o.id} className="detail-row">
                <span className="mono">{o.id.slice(0, 18)}</span>
                <span>
                  <StatusBadge status={o.status} small />{" "}
                  {fmt(o.total_cents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
