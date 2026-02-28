export default function TripTimeline({ events }) {
  if (!events || events.length === 0) return null;
  return (
    <div className="trip-timeline">
      <h4 className="section-title">Event Timeline</h4>
      <div className="trip-timeline__list">
        {events.map((e, i) => (
          <div key={e.id} className="trip-timeline__item">
            <div className="trip-timeline__dot" />
            {i < events.length - 1 && <div className="trip-timeline__line" />}
            <div className="trip-timeline__content">
              <span className="trip-timeline__type">{e.event_type}</span>
              <span className="trip-timeline__meta">{e.actor_type} &middot; {e.ts ? new Date(e.ts).toLocaleString() : ""}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
