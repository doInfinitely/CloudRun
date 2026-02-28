import { useState } from "react";
import { usePolling } from "../../hooks/usePolling";
import { getDashboard } from "../../services/api";
import StatCard from "./StatCard";
import MiniChart from "./MiniChart";
import ActivityFeed from "./ActivityFeed";

export default function DashboardPage() {
  const [data, setData] = useState(null);

  usePolling(() => getDashboard().then(setData), 10000);

  if (!data) return <div className="page-loading">Loading dashboard...</div>;

  const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="dashboard-page">
      <div className="dashboard__stats">
        <StatCard label="Orders Today" value={data.total_orders_today} />
        <StatCard label="Active Orders" value={data.active_orders} color="var(--accent)" />
        <StatCard label="Today Revenue" value={fmt(data.today_revenue)} color="var(--success)" />
        <StatCard label="Active Drivers" value={data.active_drivers} />
        <StatCard label="Merchants" value={data.total_merchants} />
        <StatCard label="Pending Tickets" value={data.pending_tickets} color="var(--warning)" />
      </div>
      <div className="dashboard__body">
        <div className="dashboard__chart">
          <MiniChart data={data.hourly_volume || []} title="Hourly Order Volume" />
        </div>
        <div className="dashboard__feed">
          <ActivityFeed events={data.recent_events || []} />
        </div>
      </div>
    </div>
  );
}
