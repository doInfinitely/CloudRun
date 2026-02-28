export default function EmptyState({ icon = "---", title, subtitle }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <div className="empty-state__title">{title || "Nothing here yet"}</div>
      {subtitle && <div className="empty-state__subtitle">{subtitle}</div>}
    </div>
  );
}
