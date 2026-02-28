import { useState, useEffect, useCallback } from "react";
import { getStore, updateStore } from "../../services/api";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function StorePage({ merchantId, storeId }) {
  const [store, setStoreData] = useState(null);
  const [hours, setHours] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    const s = await getStore(merchantId, storeId);
    setStoreData(s);
    setHours(s.hours_json || {});
  }, [merchantId, storeId]);

  useEffect(() => { load(); }, [load]);

  if (!store) return <div className="page-loading">Loading store...</div>;

  const toggleAccepting = async () => {
    setSaving(true);
    await updateStore(merchantId, storeId, { accepting_orders: !store.accepting_orders });
    await load();
    setSaving(false);
  };

  const updateHour = (day, field, value) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...(prev[day] || {}), [field]: value },
    }));
  };

  const saveHours = async () => {
    setSaving(true);
    await updateStore(merchantId, storeId, { hours_json: hours });
    await load();
    setSaving(false);
  };

  return (
    <div className="store-page">
      <div className="store-page__info">
        <h3>{store.name || "Store"}</h3>
        <p className="text-muted">{store.address}</p>
      </div>

      <div className="store-page__toggle-section">
        <label className="toggle-label">Accepting Orders</label>
        <div className="toggle-wrap">
          <button
            className={`toggle-btn ${store.accepting_orders ? "toggle-btn--on" : "toggle-btn--off"}`}
            onClick={toggleAccepting}
            disabled={saving}
          >
            <span className="toggle-btn__knob" />
          </button>
          <span className={`toggle-status ${store.accepting_orders ? "toggle-status--on" : "toggle-status--off"}`}>
            {store.accepting_orders ? "OPEN" : "CLOSED"}
          </span>
        </div>
      </div>

      <div className="store-page__hours">
        <h3>Business Hours</h3>
        <div className="hours-grid">
          {DAYS.map((day) => (
            <div key={day} className="hours-row">
              <span className="hours-row__day">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
              <input
                type="time"
                className="input"
                value={hours[day]?.open || ""}
                onChange={(e) => updateHour(day, "open", e.target.value)}
              />
              <span className="hours-row__to">to</span>
              <input
                type="time"
                className="input"
                value={hours[day]?.close || ""}
                onChange={(e) => updateHour(day, "close", e.target.value)}
              />
            </div>
          ))}
        </div>
        <button className="btn btn--accent" onClick={saveHours} disabled={saving}>
          Save Hours
        </button>
      </div>
    </div>
  );
}
