import StatusBadge from "../common/StatusBadge";

export default function MerchantList({ merchants, selectedId, onSelect }) {
  if (!merchants || merchants.length === 0) {
    return <div className="empty-state">No merchants found</div>;
  }
  return (
    <div className="entity-list">
      {merchants.map((m) => (
        <div
          key={m.id}
          className={`entity-card ${selectedId === m.id ? "entity-card--selected" : ""}`}
          onClick={() => onSelect(m.id)}
        >
          <div className="entity-card__header">
            <span className="entity-card__name">{m.legal_name}</span>
            <StatusBadge status={m.status} small />
          </div>
          <div className="entity-card__meta">
            <span>{m.business_type || "N/A"}</span>
            <span>{m.contact_email || ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
