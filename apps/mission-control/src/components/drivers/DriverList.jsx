import StatusBadge from "../common/StatusBadge";

export default function DriverList({ drivers, selectedId, onSelect }) {
  if (!drivers || drivers.length === 0) {
    return <div className="empty-state">No drivers found</div>;
  }
  return (
    <div className="entity-list">
      {drivers.map((d) => (
        <div
          key={d.id}
          className={`entity-card ${selectedId === d.id ? "entity-card--selected" : ""}`}
          onClick={() => onSelect(d.id)}
        >
          <div className="entity-card__header">
            <span className="entity-card__name">{d.name || d.id.slice(0, 12)}</span>
            <StatusBadge status={d.status} small />
          </div>
          <div className="entity-card__meta">
            <span>{d.phone || ""}</span>
            <span>
              {d.insurance_verified && d.background_clear ? "Verified" : "Unverified"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
