import { useState } from "react";
import { usePolling } from "../../hooks/usePolling";
import { getDrivers } from "../../services/api";
import DriverList from "./DriverList";
import DriverDetail from "./DriverDetail";

const TABS = [
  { label: "All", value: "" },
  { label: "Idle", value: "IDLE" },
  { label: "On Task", value: "ON_TASK" },
  { label: "Offline", value: "OFFLINE" },
];

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [tab, setTab] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  usePolling(() => {
    return getDrivers({ status: tab || undefined, limit: 100 }).then((r) => setDrivers(r.drivers || []));
  }, 10000, [tab]);

  return (
    <div className="drivers-page">
      <div className="page-toolbar">
        <div className="page-toolbar__tabs">
          {TABS.map((t) => (
            <button key={t.value} className={`tab-btn ${tab === t.value ? "tab-btn--active" : ""}`} onClick={() => { setTab(t.value); setSelectedId(null); }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="split-view">
        <div className="split-view__list">
          <DriverList drivers={drivers} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="split-view__detail">
          <DriverDetail driverId={selectedId} />
        </div>
      </div>
    </div>
  );
}
