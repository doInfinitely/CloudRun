import { useTheme } from "../../context/ThemeContext";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "grid" },
  { key: "orders", label: "Orders", icon: "list" },
  { key: "store", label: "Store", icon: "store" },
  { key: "menu", label: "Menu", icon: "utensils" },
  { key: "settings", label: "Settings", icon: "sliders" },
];

const ICONS = {
  grid: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  list: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  store: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 8v9h14V8M1 8l3-5h12l3 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 17v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  utensils: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 2v6a3 3 0 01-3 3v0a3 3 0 01-3-3V2M5 2v16M13 2c0 0 0 4 4 6l-2 2-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 10v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  sliders: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h2m4 0h8M3 10h8m4 0h2M3 15h4m4 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="9" cy="15" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
};

export default function Sidebar({ page, setPage, storeName, collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__brand" onClick={onToggle}>
        <span className="sidebar__logo">CR</span>
        {!collapsed && <span className="sidebar__title">CloudRun</span>}
      </div>
      {!collapsed && storeName && (
        <div className="sidebar__store">{storeName}</div>
      )}
      <nav className="sidebar__nav">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`sidebar__item ${page === n.key ? "sidebar__item--active" : ""}`}
            onClick={() => setPage(n.key)}
            title={n.label}
          >
            <span className="sidebar__icon">{ICONS[n.icon]}</span>
            {!collapsed && <span className="sidebar__label">{n.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
