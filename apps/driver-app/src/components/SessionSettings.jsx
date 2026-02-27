import { useState } from "react";
import { updateDriver } from "../services/api.js";

export default function SessionSettings({ driverId, profile, onBack, onStatusChange }) {
  const isOnline = profile?.status === "IDLE" || profile?.status === "ON_TASK";
  const [autoAccept, setAutoAccept] = useState(
    () => localStorage.getItem("cloudrun_auto_accept") === "true"
  );
  const [sound, setSound] = useState(
    () => localStorage.getItem("cloudrun_sound") !== "false"
  );

  const handleToggleOnline = async () => {
    const newStatus = isOnline ? "OFFLINE" : "IDLE";
    try {
      await updateDriver(driverId, { status: newStatus });
      onStatusChange?.(newStatus);
    } catch (e) {
      console.error("Status toggle failed:", e);
    }
  };

  const handleAutoAccept = () => {
    const next = !autoAccept;
    setAutoAccept(next);
    localStorage.setItem("cloudrun_auto_accept", String(next));
  };

  const handleSound = () => {
    const next = !sound;
    setSound(next);
    localStorage.setItem("cloudrun_sound", String(next));
  };

  return (
    <div className="settings-page">
      <div className="profile-top-bar">
        <button className="profile-back-btn" onClick={onBack}>&larr; Back</button>
        <h2 className="profile-title">Settings</h2>
      </div>

      <div className="profile-scroll">
        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-label">Online Status</div>
            <div className="settings-item-desc">
              {isOnline ? "You are currently online and receiving tasks" : "You are offline"}
            </div>
          </div>
          <button
            className={`settings-toggle ${isOnline ? "on" : "off"}`}
            onClick={handleToggleOnline}
          >
            {isOnline ? "ON" : "OFF"}
          </button>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-label">Auto-Accept Tasks</div>
            <div className="settings-item-desc">Automatically accept incoming task offers</div>
          </div>
          <button
            className={`settings-toggle ${autoAccept ? "on" : "off"}`}
            onClick={handleAutoAccept}
          >
            {autoAccept ? "ON" : "OFF"}
          </button>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-label">Sound Notifications</div>
            <div className="settings-item-desc">Play sound when new tasks arrive</div>
          </div>
          <button
            className={`settings-toggle ${sound ? "on" : "off"}`}
            onClick={handleSound}
          >
            {sound ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}
