export default function CustomerList({ customers, selectedId, onSelect }) {
  if (!customers || customers.length === 0) {
    return <div className="empty-state">No customers found</div>;
  }
  return (
    <div className="entity-list">
      {customers.map((c) => (
        <div
          key={c.id}
          className={`entity-card ${selectedId === c.id ? "entity-card--selected" : ""}`}
          onClick={() => onSelect(c.id)}
        >
          <div className="entity-card__header">
            <span className="entity-card__name">{c.name || c.id.slice(0, 12)}</span>
          </div>
          <div className="entity-card__meta">
            <span>{c.email || ""}</span>
            <span>{c.phone || ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
