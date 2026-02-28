export default function TopBar({ title, onMenuClick }) {
  return (
    <header className="topbar">
      <button className="topbar__menu" onClick={onMenuClick}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <h1 className="topbar__title">{title}</h1>
      <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>Admin</div>
    </header>
  );
}
