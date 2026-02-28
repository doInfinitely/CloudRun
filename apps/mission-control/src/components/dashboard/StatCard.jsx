export default function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card__value" style={color ? { color } : undefined}>{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}
