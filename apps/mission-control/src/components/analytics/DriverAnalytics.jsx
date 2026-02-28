import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getDriverAnalytics } from "../../services/api";

export default function DriverAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getDriverAnalytics().then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="page-loading">Loading...</div>;

  const drivers = (data.drivers || []).slice(0, 20);

  return (
    <div className="analytics-section">
      {drivers.length > 0 && (
        <>
          <div className="chart-container">
            <h4 className="section-title">Top Drivers by Completed Deliveries</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={drivers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} width={100} tickFormatter={(v) => v || "Unknown"} />
                <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="completed_deliveries" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h4 className="section-title">Acceptance Rates</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={drivers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} width={100} tickFormatter={(v) => v || "Unknown"} />
                <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} formatter={(v) => `${v}%`} />
                <Bar dataKey="acceptance_rate" fill="var(--success)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="data-table-wrap" style={{ marginTop: 16 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Offers</th>
              <th>Accepted</th>
              <th>Rate</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id}>
                <td>{d.name || d.id.slice(0, 12)}</td>
                <td>{d.total_offers}</td>
                <td>{d.accepted}</td>
                <td>{d.acceptance_rate}%</td>
                <td>{d.completed_deliveries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
