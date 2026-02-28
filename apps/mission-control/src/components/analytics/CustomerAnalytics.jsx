import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getCustomerAnalytics } from "../../services/api";
import StatCard from "../dashboard/StatCard";

export default function CustomerAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getCustomerAnalytics().then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="page-loading">Loading...</div>;

  const customers = data.customers || [];
  const repeat = customers.filter((c) => c.is_repeat).length;
  const oneTime = customers.length - repeat;
  const pieData = [
    { name: "Repeat", value: repeat },
    { name: "One-time", value: oneTime },
  ];
  const COLORS = ["var(--accent)", "var(--muted)"];

  const totalOrders = customers.reduce((s, c) => s + c.total_orders, 0);
  const totalDelivered = customers.reduce((s, c) => s + c.delivered_orders, 0);
  const avgValues = customers.filter((c) => c.avg_order_value > 0);
  const avgOrderVal = avgValues.length > 0 ? Math.round(avgValues.reduce((s, c) => s + c.avg_order_value, 0) / avgValues.length) : 0;

  return (
    <div className="analytics-section">
      <div className="dashboard__stats">
        <StatCard label="Total Customers" value={customers.length} />
        <StatCard label="Repeat Rate" value={`${data.repeat_rate}%`} color="var(--accent)" />
        <StatCard label="Total Orders" value={totalOrders} />
        <StatCard label="Avg Order Value" value={`$${(avgOrderVal / 100).toFixed(2)}`} />
      </div>

      <div className="chart-container" style={{ marginTop: 16 }}>
        <h4 className="section-title">Customer Retention</h4>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="data-table-wrap" style={{ marginTop: 16 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Orders</th>
              <th>Delivered</th>
              <th>Avg Value</th>
              <th>Repeat</th>
            </tr>
          </thead>
          <tbody>
            {customers.slice(0, 30).map((c) => (
              <tr key={c.id}>
                <td>{c.name || c.id.slice(0, 12)}</td>
                <td>{c.total_orders}</td>
                <td>{c.delivered_orders}</td>
                <td>${(c.avg_order_value / 100).toFixed(2)}</td>
                <td>{c.is_repeat ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
