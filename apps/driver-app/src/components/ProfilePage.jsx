import { useState, useEffect, useRef } from "react";
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getVehicles,
  createVehicle,
  deleteVehicle,
  getVehicleDocuments,
  uploadVehicleDocument,
  getDriverDocuments,
  uploadDriverDocument,
} from "../services/api.js";

export default function ProfilePage({ driverId, onBack, onProfileUpdate }) {
  const [profile, setProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleDocs, setVehicleDocs] = useState({});
  const [driverDocs, setDriverDocs] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ make: "", model: "", year: "", color: "", license_plate: "" });
  const photoRef = useRef(null);

  useEffect(() => { loadAll(); }, [driverId]);

  async function loadAll() {
    try {
      const [p, v, dd] = await Promise.all([
        getProfile(driverId),
        getVehicles(driverId),
        getDriverDocuments(driverId),
      ]);
      setProfile(p);
      setForm({ name: p.name || "", email: p.email || "", phone: p.phone || "" });
      setVehicles(v.vehicles);
      setDriverDocs(dd.documents);
      // Load docs for each vehicle
      const docsMap = {};
      await Promise.all(
        v.vehicles.map(async (veh) => {
          const vd = await getVehicleDocuments(driverId, veh.id);
          docsMap[veh.id] = vd.documents;
        })
      );
      setVehicleDocs(docsMap);
    } catch (e) {
      console.error("Failed to load profile:", e);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const updated = await updateProfile(driverId, form);
      setProfile((prev) => ({ ...prev, ...updated }));
      onProfileUpdate?.(updated);
    } catch (e) {
      console.error("Save failed:", e);
    }
    setSaving(false);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Only JPEG and PNG files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Photo must be under 5MB");
      return;
    }
    try {
      const result = await uploadProfilePhoto(driverId, file);
      setProfile((prev) => ({ ...prev, photo_url: result.photo_url }));
      onProfileUpdate?.({ photo_url: result.photo_url });
    } catch (e) {
      console.error("Photo upload failed:", e);
    }
  }

  async function handleAddVehicle() {
    if (!vehicleForm.make || !vehicleForm.model) return;
    try {
      const data = { ...vehicleForm };
      if (data.year) data.year = parseInt(data.year, 10);
      else delete data.year;
      if (!data.color) delete data.color;
      if (!data.license_plate) delete data.license_plate;
      const v = await createVehicle(driverId, data);
      setVehicles((prev) => [...prev, v]);
      setVehicleForm({ make: "", model: "", year: "", color: "", license_plate: "" });
      setShowAddVehicle(false);
    } catch (e) {
      console.error("Add vehicle failed:", e);
    }
  }

  async function handleDeleteVehicle(vehicleId) {
    if (!confirm("Delete this vehicle and its documents?")) return;
    try {
      await deleteVehicle(driverId, vehicleId);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      setVehicleDocs((prev) => { const n = { ...prev }; delete n[vehicleId]; return n; });
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }

  async function handleVehicleDocUpload(vehicleId, docType, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const doc = await uploadVehicleDocument(driverId, vehicleId, docType, file);
      setVehicleDocs((prev) => ({
        ...prev,
        [vehicleId]: [...(prev[vehicleId] || []), doc],
      }));
    } catch (e) {
      console.error("Doc upload failed:", e);
    }
  }

  async function handleDriverDocUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const doc = await uploadDriverDocument(driverId, "LICENSE", file);
      setDriverDocs((prev) => [...prev, doc]);
    } catch (e) {
      console.error("License upload failed:", e);
    }
  }

  function getLatestDoc(docs, docType) {
    return docs?.filter((d) => d.doc_type === docType).slice(-1)[0] || null;
  }

  const statusBadge = (doc) => {
    if (!doc) return <span className="doc-badge pending">Not uploaded</span>;
    const cls = doc.status === "APPROVED" ? "approved" : doc.status === "REJECTED" ? "rejected" : "pending";
    return <span className={`doc-badge ${cls}`}>{doc.status}</span>;
  };

  return (
    <div className="profile-page">
      <div className="profile-top-bar">
        <button className="profile-back-btn" onClick={onBack}>&larr; Back</button>
        <h2 className="profile-title">My Profile</h2>
      </div>

      <div className="profile-scroll">
        {/* Photo */}
        <div className="profile-photo-section" onClick={() => photoRef.current?.click()}>
          {profile?.photo_url ? (
            <img src={profile.photo_url} alt="" className="profile-photo-img" />
          ) : (
            <div className="profile-photo-placeholder">Tap to add photo</div>
          )}
          <input
            ref={photoRef}
            type="file"
            accept="image/jpeg,image/png"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Form */}
        <div className="profile-form">
          <label className="profile-label">Name</label>
          <input
            className="profile-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Full name"
          />
          <label className="profile-label">Email</label>
          <input
            className="profile-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email address"
          />
          <label className="profile-label">Phone</label>
          <input
            className="profile-input"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Phone number"
          />
          <button className="btn btn-accept profile-save-btn" onClick={handleSaveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {/* Driver License */}
        <div className="profile-section">
          <h3 className="profile-section-title">Driver's License</h3>
          <div className="doc-upload-row">
            {statusBadge(getLatestDoc(driverDocs, "LICENSE"))}
            <label className="doc-upload-label">
              Upload
              <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleDriverDocUpload} />
            </label>
          </div>
        </div>

        {/* Vehicles */}
        <div className="profile-section">
          <div className="profile-section-header">
            <h3 className="profile-section-title">My Vehicles</h3>
            <button className="profile-add-btn" onClick={() => setShowAddVehicle(true)}>+ Add</button>
          </div>

          {showAddVehicle && (
            <div className="vehicle-add-form">
              <input className="profile-input" placeholder="Make *" value={vehicleForm.make}
                onChange={(e) => setVehicleForm((f) => ({ ...f, make: e.target.value }))} />
              <input className="profile-input" placeholder="Model *" value={vehicleForm.model}
                onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))} />
              <input className="profile-input" placeholder="Year" value={vehicleForm.year}
                onChange={(e) => setVehicleForm((f) => ({ ...f, year: e.target.value }))} />
              <input className="profile-input" placeholder="Color" value={vehicleForm.color}
                onChange={(e) => setVehicleForm((f) => ({ ...f, color: e.target.value }))} />
              <input className="profile-input" placeholder="License Plate" value={vehicleForm.license_plate}
                onChange={(e) => setVehicleForm((f) => ({ ...f, license_plate: e.target.value }))} />
              <div className="vehicle-add-actions">
                <button className="btn btn-accept" onClick={handleAddVehicle}>Save Vehicle</button>
                <button className="btn btn-reject" onClick={() => setShowAddVehicle(false)}>Cancel</button>
              </div>
            </div>
          )}

          {vehicles.map((v) => (
            <div key={v.id} className="vehicle-card">
              <div className="vehicle-card-header">
                <div className="vehicle-card-title">
                  {v.year ? `${v.year} ` : ""}{v.make} {v.model}
                  {v.color && <span className="vehicle-color"> ({v.color})</span>}
                </div>
                <button className="vehicle-delete-btn" onClick={() => handleDeleteVehicle(v.id)}>Delete</button>
              </div>
              {v.license_plate && <div className="vehicle-plate">{v.license_plate}</div>}

              <div className="vehicle-docs">
                {["INSURANCE", "REGISTRATION"].map((docType) => {
                  const doc = getLatestDoc(vehicleDocs[v.id] || [], docType);
                  return (
                    <div key={docType} className="doc-upload-row">
                      <span className="doc-type-label">{docType}</span>
                      {statusBadge(doc)}
                      <label className="doc-upload-label">
                        Upload
                        <input type="file" accept="image/*,application/pdf" style={{ display: "none" }}
                          onChange={(e) => handleVehicleDocUpload(v.id, docType, e)} />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {vehicles.length === 0 && !showAddVehicle && (
            <p className="profile-empty">No vehicles added yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
