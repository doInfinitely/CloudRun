import StatusBadge from "../common/StatusBadge";

export default function TicketInbox({ tickets, selectedId, onSelect }) {
  if (!tickets || tickets.length === 0) {
    return <div className="empty-state">No tickets found</div>;
  }
  return (
    <div className="ticket-inbox">
      {tickets.map((t) => (
        <div
          key={t.id}
          className={`ticket-card ${selectedId === t.id ? "ticket-card--selected" : ""}`}
          onClick={() => onSelect(t.id)}
        >
          <div className="ticket-card__header">
            <span className="ticket-card__subject">{t.subject}</span>
            <StatusBadge status={t.priority} small />
          </div>
          <div className="ticket-card__meta">
            <StatusBadge status={t.status} small />
            <span>{t.requester_type}:{t.requester_id?.slice(0, 10)}</span>
            <span>{t.updated_at ? new Date(t.updated_at).toLocaleString() : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
