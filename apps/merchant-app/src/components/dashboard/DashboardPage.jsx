import { useState, useCallback } from "react";
import { getDashboard } from "../../services/api";
import { usePolling } from "../../hooks/usePolling";
import StatCard from "./StatCard";
import RecentActivity from "./RecentActivity";

function cents(c) {
  return "$" + (c / 100).toFixed(2);
}

export default function DashboardPage({ merchantId }) {
  const [data, setData] = useState(null);

  const fetch = useCallback(async () => {
    const d = await getDashboard(merchantId);
    setData(d);
  }, [merchantId]);

  usePolling(fetch, 10000, [merchantId]);

  if (!data) return <div className="page-loading">Loading dashboard...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard__stats">
        <StatCard label="Today's Orders" value={data.today_orders} />
        <StatCard label="Revenue" value={cents(data.today_revenue)} />
        <StatCard label="Pending" value={data.pending} />
        <StatCard label="Active" value={data.active} />
        <StatCard label="Completed" value={data.completed} />
      </div>
      <RecentActivity orders={data.recent} />
    </div>
  );
}
