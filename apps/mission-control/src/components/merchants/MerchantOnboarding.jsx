import { useState } from "react";
import { createMerchant } from "../../services/api";

export default function MerchantOnboarding({ onCreated }) {
  const [form, setForm] = useState({ legal_name: "", ein: "", contact_email: "", contact_phone: "", business_type: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.legal_name.trim()) return;
    setSaving(true);
    try {
      await createMerchant(form);
      setForm({ legal_name: "", ein: "", contact_email: "", contact_phone: "", business_type: "" });
      onCreated?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="onboarding-form" onSubmit={handleSubmit}>
      <h3>Add New Merchant</h3>
      <label className="form-label">
        Legal Name *
        <input className="input" value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} required />
      </label>
      <label className="form-label">
        EIN
        <input className="input" value={form.ein} onChange={(e) => setForm({ ...form, ein: e.target.value })} />
      </label>
      <label className="form-label">
        Email
        <input className="input" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
      </label>
      <label className="form-label">
        Phone
        <input className="input" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
      </label>
      <label className="form-label">
        Business Type
        <input className="input" value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} placeholder="e.g. Vape Shop, Dispensary" />
      </label>
      <button className="btn btn--accent" type="submit" disabled={saving}>
        {saving ? "Creating..." : "Create Merchant"}
      </button>
    </form>
  );
}
