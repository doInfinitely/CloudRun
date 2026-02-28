import { useState, useEffect } from "react";
import { getDriver } from "../../services/api";
import StatusBadge from "../common/StatusBadge";
import DocumentReview from "./DocumentReview";

export default function DriverDetail({ driverId }) {
  const [driver, setDriver] = useState(null);

  const load = () => {
    if (driverId) getDriver(driverId).then(setDriver).catch(console.error);
  };
  useEffect(load, [driverId]);

  if (!driverId) return <div className="detail-empty">Select a driver to view details</div>;
  if (!driver) return <div className="page-loading">Loading...</div>;

  return (
    <div className="driver-detail">
      <div className="trip-detail__header">
        <h3>{driver.name || driver.id}</h3>
        <StatusBadge status={driver.status} />
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4 className="section-title">Profile</h4>
          <div className="detail-row"><span>ID</span><span className="mono">{driver.id}</span></div>
          <div className="detail-row"><span>Email</span><span>{driver.email || "N/A"}</span></div>
          <div className="detail-row"><span>Phone</span><span>{driver.phone || "N/A"}</span></div>
          <div className="detail-row"><span>Created</span><span>{driver.created_at ? new Date(driver.created_at).toLocaleString() : "N/A"}</span></div>
        </div>

        <div className="detail-section">
          <h4 className="section-title">Verification</h4>
          <div className="detail-row"><span>Insurance</span><span>{driver.insurance_verified ? "Verified" : "No"}</span></div>
          <div className="detail-row"><span>Registration</span><span>{driver.registration_verified ? "Verified" : "No"}</span></div>
          <div className="detail-row"><span>Vehicle</span><span>{driver.vehicle_verified ? "Verified" : "No"}</span></div>
          <div className="detail-row"><span>Background</span><span>{driver.background_clear ? "Clear" : "No"}</span></div>
        </div>

        <div className="detail-section">
          <h4 className="section-title">Performance</h4>
          <div className="detail-row"><span>Deliveries</span><span>{driver.delivery_count}</span></div>
          <div className="detail-row"><span>Completed</span><span>{driver.completed_deliveries}</span></div>
          <div className="detail-row"><span>Total Offers</span><span>{driver.total_offers}</span></div>
          <div className="detail-row"><span>Acceptance Rate</span><span>{driver.acceptance_rate}%</span></div>
        </div>

        {driver.vehicles && driver.vehicles.length > 0 && (
          <div className="detail-section">
            <h4 className="section-title">Vehicles</h4>
            {driver.vehicles.map((v) => (
              <div key={v.id} className="detail-row">
                <span>{v.year} {v.make} {v.model}</span>
                <span>{v.color} &middot; {v.license_plate || "N/A"}</span>
              </div>
            ))}
          </div>
        )}

        <div className="detail-section">
          <h4 className="section-title">Documents</h4>
          <DocumentReview driverId={driver.id} documents={driver.documents} onRefresh={load} />
        </div>
      </div>
    </div>
  );
}
