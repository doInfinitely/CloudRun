import { useState, useCallback } from "react";
import { usePolling } from "../../hooks/usePolling";
import { getTickets } from "../../services/api";
import TicketInbox from "./TicketInbox";
import TicketDetail from "./TicketDetail";

const TABS = [
  { label: "All", value: "" },
  { label: "Open", value: "OPEN" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    return getTickets({ status: tab || undefined, limit: 100 }).then((r) => setTickets(r.tickets || []));
  }, [tab, refreshKey]);

  usePolling(load, 5000, [tab, refreshKey]);

  return (
    <div className="support-page">
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
          <TicketInbox tickets={tickets} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="split-view__detail">
          <TicketDetail ticketId={selectedId} onRefresh={() => setRefreshKey((k) => k + 1)} />
        </div>
      </div>
    </div>
  );
}
