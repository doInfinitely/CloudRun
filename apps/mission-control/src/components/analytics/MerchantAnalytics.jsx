import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getMerchantAnalytics } from "../../services/api";

export default function MerchantAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getMerchantAnalytics().then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="page-loading">Loading...</div>;

  const merchants = (data.merchants || []).slice(0, 20);
  const fmt = (c) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="analytics-section">
      {merchants.length > 0 && (
        <>
          <div className="chart-container">
            <h4 className="section-title">Top Merchants by Revenue</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={merchants} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                <YAxis type="category" dataKey="legal_name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} width={120} />
                <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} formatter={(v) => fmt(v)} />
                <Bar dataKey="revenue" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h4 className="section-title">Order Volume by Merchant</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={merchants} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} />
                <YAxis type="category" dataKey="legal_name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} width={120} />
                <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="order_count" fill="var(--accent2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
