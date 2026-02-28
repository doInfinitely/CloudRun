import { useState, useCallback } from "react";
import { usePolling } from "../../hooks/usePolling";
import { getMerchants } from "../../services/api";
import MerchantList from "./MerchantList";
import MerchantDetail from "./MerchantDetail";
import MerchantOnboarding from "./MerchantOnboarding";

const TABS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState([]);
  const [tab, setTab] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    return getMerchants({ status: tab || undefined, limit: 100 }).then((r) => setMerchants(r.merchants || []));
  }, [tab, refreshKey]);

  usePolling(load, 10000, [tab, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="merchants-page">
      <div className="page-toolbar">
        <div className="page-toolbar__tabs">
          {TABS.map((t) => (
            <button key={t.value} className={`tab-btn ${tab === t.value ? "tab-btn--active" : ""}`} onClick={() => { setTab(t.value); setSelectedId(null); }}>
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn btn--accent btn--small" onClick={() => setShowOnboarding(!showOnboarding)}>
          {showOnboarding ? "Hide Form" : "+ Add Merchant"}
        </button>
      </div>

      {showOnboarding && <MerchantOnboarding onCreated={() => { setShowOnboarding(false); refresh(); }} />}

      <div className="split-view">
        <div className="split-view__list">
          <MerchantList merchants={merchants} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="split-view__detail">
          <MerchantDetail merchantId={selectedId} onRefresh={refresh} />
        </div>
      </div>
    </div>
  );
}
