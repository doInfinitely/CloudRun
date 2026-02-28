export default function ActivityFeed({ events }) {
  if (!events || events.length === 0) {
    return <div className="activity-feed"><p className="text-muted">No recent activity</p></div>;
  }
  return (
    <div className="activity-feed">
      <h4 className="activity-feed__title">Recent Events</h4>
      <div className="activity-feed__list">
        {events.map((e) => (
          <div key={e.id} className="activity-feed__item">
            <span className="activity-feed__type">{e.event_type}</span>
            <span className="activity-feed__order">{e.order_id?.slice(0, 16)}</span>
            <span className="activity-feed__actor">{e.actor_type}</span>
            <span className="activity-feed__time">{e.ts ? new Date(e.ts).toLocaleTimeString() : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
