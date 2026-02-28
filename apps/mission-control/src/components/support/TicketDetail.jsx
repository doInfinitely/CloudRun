import { useState, useEffect } from "react";
import { getTicket, updateTicket, postTicketMessage } from "../../services/api";
import StatusBadge from "../common/StatusBadge";
import TicketMessageThread from "./TicketMessageThread";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function TicketDetail({ ticketId, onRefresh }) {
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = () => {
    if (ticketId) getTicket(ticketId).then(setTicket).catch(console.error);
  };
  useEffect(load, [ticketId]);

  if (!ticketId) return <div className="detail-empty">Select a ticket to view details</div>;
  if (!ticket) return <div className="page-loading">Loading...</div>;

  const handleStatusChange = async (status) => {
    await updateTicket(ticket.id, { status });
    load();
    onRefresh?.();
  };

  const handlePriorityChange = async (priority) => {
    await updateTicket(ticket.id, { priority });
    load();
    onRefresh?.();
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await postTicketMessage(ticket.id, reply);
      setReply("");
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ticket-detail">
      <div className="trip-detail__header">
        <h3>{ticket.subject}</h3>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="ticket-detail__meta">
        <span>{ticket.requester_type}:{ticket.requester_id}</span>
        {ticket.order_id && <span>Order: {ticket.order_id.slice(0, 18)}</span>}
        {ticket.category && <span>Category: {ticket.category}</span>}
        <span>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : ""}</span>
      </div>

      <div className="ticket-detail__controls">
        <label className="form-label" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          Status:
          <select className="input" style={{ width: "auto" }} value={ticket.status} onChange={(e) => handleStatusChange(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="form-label" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          Priority:
          <select className="input" style={{ width: "auto" }} value={ticket.priority} onChange={(e) => handlePriorityChange(e.target.value)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>

      <div className="ticket-detail__messages">
        <h4 className="section-title">Messages</h4>
        <TicketMessageThread messages={ticket.messages} />
      </div>

      <form className="ticket-detail__reply" onSubmit={handleReply}>
        <textarea
          className="input input--textarea"
          placeholder="Type a reply..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
        />
        <button className="btn btn--accent" type="submit" disabled={sending || !reply.trim()}>
          {sending ? "Sending..." : "Send Reply"}
        </button>
      </form>
    </div>
  );
}
