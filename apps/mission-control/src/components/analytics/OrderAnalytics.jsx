import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getOrderAnalytics } from "../../services/api";
import DateRangePicker from "./DateRangePicker";
import StatCard from "../dashboard/StatCard";

export default function OrderAnalytics() {
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    getOrderAnalytics({ start_date: startDate || undefined, end_date: endDate || undefined })
      .then(setData)
      .catch(console.error);
  }, [startDate, endDate]);

  if (!data) return <div className="page-loading">Loading analytics...</div>;

  const fmt = (c) => `$${(c / 100).toFixed(2)}`;
  const trends = data.trends || [];

  return (
    <div className="analytics-section">
      <DateRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />

      <div className="dashboard__stats" style={{ marginTop: 16 }}>
        <StatCard label="Total Orders" value={data.summary?.total_orders || 0} />
        <StatCard label="Delivered" value={data.summary?.delivered || 0} color="var(--success)" />
        <StatCard label="Total Revenue" value={fmt(data.summary?.total_revenue || 0)} color="var(--accent)" />
        <StatCard label="Avg Order Value" value={fmt(data.summary?.avg_order_value || 0)} />
      </div>

      {trends.length > 0 && (
        <>
          <div className="chart-container">
            <h4 className="section-title">Order Volume</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="period" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} width={40} />
                <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="orders" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h4 className="section-title">Revenue Trend</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="period" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} width={60} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmt(v)} />
                <Line type="monotone" dataKey="revenue" stroke="var(--success)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
