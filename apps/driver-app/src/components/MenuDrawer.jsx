import { updateDriver } from "../services/api.js";

export default function MenuDrawer({ driverId, profile, onClose, setCurrentPage, onStatusChange }) {
  const isOnline = profile?.status === "IDLE" || profile?.status === "ON_TASK";

  const handleToggleOnline = async () => {
    const newStatus = isOnline ? "OFFLINE" : "IDLE";
    try {
      await updateDriver(driverId, { status: newStatus });
      onStatusChange?.(newStatus);
    } catch (e) {
      console.error("Status toggle failed:", e);
    }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel">
        <div className="drawer-header">
          <div
            className="drawer-avatar"
            onClick={() => { setCurrentPage("profile"); onClose(); }}
          >
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="drawer-avatar-img" />
            ) : (
              <span className="drawer-avatar-placeholder">
                {(profile?.name || "D")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="drawer-name">{profile?.name || "Driver"}</div>
          <div className="drawer-status-badge" data-online={isOnline}>
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>

        <nav className="drawer-nav">
          <button
            className="drawer-nav-item"
            onClick={() => { setCurrentPage("profile"); onClose(); }}
          >
            My Profile
          </button>
          <button
            className="drawer-nav-item"
            onClick={() => { setCurrentPage("settings"); onClose(); }}
          >
            Settings
          </button>
        </nav>

        <div className="drawer-footer">
          <button
            className={`drawer-toggle-btn ${isOnline ? "online" : "offline"}`}
            onClick={handleToggleOnline}
          >
            {isOnline ? "Go Offline" : "Go Online"}
          </button>
        </div>
      </div>
    </>
  );
}
