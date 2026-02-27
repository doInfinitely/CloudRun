export default function TopBar({ title, onMenuClick }) {
  return (
    <header className="topbar">
      <button className="topbar__menu" onClick={onMenuClick}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      <h1 className="topbar__title">{title}</h1>
    </header>
  );
}
