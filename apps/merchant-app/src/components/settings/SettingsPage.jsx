import { useState } from "react";
import ThemePicker from "./ThemePicker";

export default function SettingsPage() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("cloudrun_merchant_sound") !== "false";
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("cloudrun_merchant_sound", next);
  };

  return (
    <div className="settings-page">
      <ThemePicker />
      <div className="settings-section">
        <h3>Notifications</h3>
        <label className="form-check">
          <input type="checkbox" checked={soundEnabled} onChange={toggleSound} />
          Notification sounds
        </label>
      </div>
    </div>
  );
}
