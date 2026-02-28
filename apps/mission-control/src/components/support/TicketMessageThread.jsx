export default function TicketMessageThread({ messages }) {
  if (!messages || messages.length === 0) {
    return <p className="text-muted" style={{ fontSize: 13 }}>No messages yet</p>;
  }
  return (
    <div className="message-thread">
      {messages.map((m) => (
        <div key={m.id} className={`message-bubble ${m.sender_type === "admin" ? "message-bubble--admin" : "message-bubble--user"}`}>
          <div className="message-bubble__header">
            <span className="message-bubble__sender">{m.sender_type}:{m.sender_id?.slice(0, 12)}</span>
            <span className="message-bubble__time">{m.created_at ? new Date(m.created_at).toLocaleString() : ""}</span>
          </div>
          <div className="message-bubble__body">{m.body}</div>
        </div>
      ))}
    </div>
  );
}
