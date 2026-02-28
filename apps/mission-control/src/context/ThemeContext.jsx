import { createContext, useContext, useState, useEffect } from "react";

const PALETTES = [
  {
    name: "Electric Cyan",
    bg: "#0B0E17",
    surface: "#121729",
    surface2: "#1A2038",
    text: "#E8ECF4",
    muted: "#6B7A99",
    border: "#232B45",
    accent: "#00E5FF",
    accent2: "#2D7DFF",
    accentGlow: "#7AF3FF",
    warning: "#FFB020",
    danger: "#FF4D6A",
    success: "#00D68F",
  },
  {
    name: "Electric Lime",
    bg: "#0B0E17",
    surface: "#121729",
    surface2: "#1A2038",
    text: "#E8ECF4",
    muted: "#6B7A99",
    border: "#232B45",
    accent: "#B6FF00",
    accent2: "#26D07C",
    accentGlow: "#E2FF7A",
    warning: "#FFB020",
    danger: "#FF4D6A",
    success: "#00D68F",
  },
  {
    name: "Electric Magenta",
    bg: "#0B0E17",
    surface: "#121729",
    surface2: "#1A2038",
    text: "#E8ECF4",
    muted: "#6B7A99",
    border: "#232B45",
    accent: "#FF3DF2",
    accent2: "#7A5CFF",
    accentGlow: "#FF9AF7",
    warning: "#FFB020",
    danger: "#FF4D6A",
    success: "#00D68F",
  },
  {
    name: "Navy Teal",
    bg: "#0A1628",
    surface: "#0F1F3D",
    surface2: "#162A4A",
    text: "#E8ECF4",
    muted: "#6B7A99",
    border: "#1E3558",
    accent: "#D6E3FF",
    accent2: "#18C7C7",
    accentGlow: "#00A7B3",
    warning: "#FFB020",
    danger: "#FF4D6A",
    success: "#00D68F",
  },
  {
    name: "Warm Gold",
    bg: "#1A1714",
    surface: "#242019",
    surface2: "#2E2920",
    text: "#F0E8D8",
    muted: "#8A7E6B",
    border: "#3A3428",
    accent: "#F4C34F",
    accent2: "#D9A441",
    accentGlow: "#FFE2A3",
    warning: "#FFB020",
    danger: "#FF4D6A",
    success: "#00D68F",
  },
];

const STORAGE_KEY = "cloudrun_mission_control_theme";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeIndex, setThemeIndex] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const idx = saved !== null ? parseInt(saved, 10) : 0;
    return idx >= 0 && idx < PALETTES.length ? idx : 0;
  });

  const palette = PALETTES[themeIndex];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bg", palette.bg);
    root.style.setProperty("--surface", palette.surface);
    root.style.setProperty("--surface2", palette.surface2);
    root.style.setProperty("--text", palette.text);
    root.style.setProperty("--muted", palette.muted);
    root.style.setProperty("--border", palette.border);
    root.style.setProperty("--accent", palette.accent);
    root.style.setProperty("--accent2", palette.accent2);
    root.style.setProperty("--accent-glow", palette.accentGlow);
    root.style.setProperty("--warning", palette.warning);
    root.style.setProperty("--danger", palette.danger);
    root.style.setProperty("--success", palette.success);
    localStorage.setItem(STORAGE_KEY, themeIndex);
  }, [themeIndex, palette]);

  return (
    <ThemeContext.Provider value={{ themeIndex, setThemeIndex, palette, palettes: PALETTES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
