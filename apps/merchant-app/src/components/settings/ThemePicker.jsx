import { useTheme } from "../../context/ThemeContext";

export default function ThemePicker() {
  const { themeIndex, setThemeIndex, palettes } = useTheme();

  return (
    <div className="theme-picker">
      <h3>Color Theme</h3>
      <div className="theme-picker__grid">
        {palettes.map((p, i) => (
          <button
            key={i}
            className={`theme-swatch ${themeIndex === i ? "theme-swatch--active" : ""}`}
            onClick={() => setThemeIndex(i)}
            title={p.name}
          >
            <div className="theme-swatch__colors">
              <span style={{ background: p.accent }} />
              <span style={{ background: p.accent2 }} />
              <span style={{ background: p.accentGlow }} />
              <span style={{ background: p.bg }} />
            </div>
            <div className="theme-swatch__name">{p.name}</div>
            {themeIndex === i && <div className="theme-swatch__check">&#10003;</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
