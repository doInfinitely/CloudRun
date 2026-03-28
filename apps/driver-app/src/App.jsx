import { useState, useEffect, useRef, useCallback } from "react";
import useGeolocation from "./hooks/useGeolocation.js";
import useNavigation from "./hooks/useNavigation.js";
import { speak, DEFAULT_VOICE_ID } from "./services/tts.js";
import DriverMap from "./components/DriverMap.jsx";
import NavigationBanner from "./components/NavigationBanner.jsx";
import DirectionsList from "./components/DirectionsList.jsx";
import TaskPanel from "./components/TaskPanel.jsx";
import MenuDrawer from "./components/MenuDrawer.jsx";
import ProfilePage from "./components/ProfilePage.jsx";
import SessionSettings from "./components/SessionSettings.jsx";
import LoginPage from "./components/LoginPage.jsx";
import OnboardingWizard from "./components/OnboardingWizard.jsx";
import { getUser, clearAuth, saveUser } from "./services/auth.js";
import {
  getDriverTask,
  updateDriver,
  getProfile,
  acceptTask as apiAccept,
  rejectTask as apiReject,
  startTask as apiStart,
  completeTask as apiComplete,
  doorstepIdCheck as apiDoorstepIdCheck,
  deliverConfirm as apiDeliverConfirm,
  refuseOrder as apiRefuseOrder,
} from "./services/api.js";

const POLL_INTERVAL = 5000;

export default function App() {
  const [user, setUser] = useState(getUser);
  const { position, heading, error: geoError } = useGeolocation();
  const nav = useNavigation(position);
  const pollRef = useRef(null);
  const [currentPage, setCurrentPage] = useState("main");
  const [menuOpen, setMenuOpen] = useState(false);
  const [driverProfile, setDriverProfile] = useState(null);

  const handleLogout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const driverId = user?.id;

  // Fetch profile on mount
  useEffect(() => {
    if (!driverId) return;
    getProfile(driverId)
      .then(setDriverProfile)
      .catch(() => {});
  }, [driverId]);

  // Poll for task offers when idle
  useEffect(() => {
    if (nav.phase !== "IDLE") {
      clearInterval(pollRef.current);
      return;
    }

    const poll = async () => {
      try {
        const data = await getDriverTask(driverId);
        if (data.task) {
          nav.receiveTask(data.task);
        }
      } catch (e) {
        // API not available yet, keep polling
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [nav.phase, nav.receiveTask]);

  // Send position to backend every 5s
  useEffect(() => {
    if (!position) return;

    const interval = setInterval(() => {
      updateDriver(driverId, {
        lat: position.lat,
        lng: position.lng,
        status: nav.phase === "IDLE" ? "IDLE" : "ON_TASK",
      }).catch(() => {});
    }, POLL_INTERVAL);

    // Send immediately
    updateDriver(driverId, {
      lat: position.lat,
      lng: position.lng,
      status: nav.phase === "IDLE" ? "IDLE" : "ON_TASK",
    }).catch(() => {});

    return () => clearInterval(interval);
  }, [position, nav.phase]);

  // Voice navigation — speak queued instructions via ElevenLabs TTS
  const voiceId = useRef(localStorage.getItem("cloudrun_voice_id") || DEFAULT_VOICE_ID);
  useEffect(() => {
    if (nav.voiceQueue.length > 0) {
      const text = nav.voiceQueue[0];
      if (localStorage.getItem("cloudrun_sound") !== "false") {
        speak(text, voiceId.current);
      }
      nav.dequeueVoice();
    }
  }, [nav.voiceQueue, nav.dequeueVoice]);

  // Action handlers
  const handleAccept = useCallback(async () => {
    if (!nav.task) return;
    try {
      await apiAccept(nav.task.id, driverId);
      nav.acceptOffer();
    } catch (e) {
      console.error("Accept failed:", e);
    }
  }, [nav.task, nav.acceptOffer]);

  const handleReject = useCallback(async () => {
    if (!nav.task) return;
    try {
      await apiReject(nav.task.id, driverId);
      nav.rejectOffer();
    } catch (e) {
      console.error("Reject failed:", e);
    }
  }, [nav.task, nav.rejectOffer]);

  const handlePickedUp = useCallback(async () => {
    if (!nav.task) return;
    try {
      await apiStart(nav.task.id, driverId);
      nav.confirmPickup();
    } catch (e) {
      console.error("Start failed:", e);
    }
  }, [nav.task, nav.confirmPickup]);

  const handleDelivered = useCallback(async () => {
    if (!nav.task) return;
    try {
      await apiComplete(nav.task.id, driverId);
      nav.confirmDelivery();
    } catch (e) {
      console.error("Complete failed:", e);
    }
  }, [nav.task, nav.confirmDelivery]);

  const handleVerifyId = useCallback(async () => {
    if (!nav.task) return;
    nav.startIdCheck();
    try {
      await apiDoorstepIdCheck(nav.task.order_id, "pass");
      nav.idCheckPassed();
    } catch (e) {
      console.error("ID check failed:", e);
      nav.idCheckFailed();
    }
  }, [nav.task, nav.startIdCheck, nav.idCheckPassed, nav.idCheckFailed]);

  const handleConfirmDelivery = useCallback(async () => {
    if (!nav.task) return;
    const attestationRef = `attest-${nav.task.order_id}-${Date.now()}`;
    const gps = position ? { lat: position.lat, lng: position.lng } : null;
    try {
      await apiDeliverConfirm(nav.task.order_id, attestationRef, gps);
      nav.confirmDelivery();
    } catch (e) {
      console.error("Deliver confirm failed:", e);
    }
  }, [nav.task, nav.confirmDelivery, position]);

  const handleRefuse = useCallback(async (reasonCode) => {
    if (!nav.task) return;
    const gps = position ? { lat: position.lat, lng: position.lng } : null;
    try {
      await apiRefuseOrder(nav.task.order_id, reasonCode, gps);
      nav.refuseDelivery();
    } catch (e) {
      console.error("Refuse failed:", e);
    }
  }, [nav.task, nav.refuseDelivery, position]);

  // Derive marker positions from current phase
  const showPickup =
    nav.task?.pickup &&
    ["OFFER_RECEIVED", "NAVIGATING_TO_PICKUP", "AT_PICKUP", "RETURNING_TO_STORE"].includes(nav.phase);
  const showDelivery =
    nav.task?.delivery &&
    [
      "OFFER_RECEIVED",
      "NAVIGATING_TO_PICKUP",
      "AT_PICKUP",
      "NAVIGATING_TO_DELIVERY",
      "AT_DELIVERY",
      "VERIFYING_ID",
      "ID_VERIFIED",
    ].includes(nav.phase);

  const handleStatusChange = (newStatus) => {
    setDriverProfile((p) => p ? { ...p, status: newStatus } : p);
  };

  const handleProfileUpdate = (updates) => {
    setDriverProfile((p) => p ? { ...p, ...updates } : p);
  };

  if (!user) {
    return <LoginPage onAuth={setUser} />;
  }

  if (!user.onboarding_complete) {
    return (
      <OnboardingWizard
        user={user}
        onComplete={() => {
          const updated = { ...user, onboarding_complete: true };
          saveUser(updated);
          setUser(updated);
        }}
      />
    );
  }

  if (!position) {
    return <div className="loading-screen">Acquiring location...</div>;
  }

  return (
    <>
      <DriverMap
        position={position}
        heading={heading}
        pickup={showPickup ? nav.task.pickup : null}
        delivery={showDelivery ? nav.task.delivery : null}
        routeGeometry={nav.route?.geometry || null}
      />

      {geoError && <div className="error-banner">Location: {geoError}</div>}

      {nav.route && (
        <>
          <NavigationBanner
            phase={nav.phase}
            route={nav.route}
            currentStepIndex={nav.currentStepIndex}
            distanceToNextManeuver={nav.distanceToNextManeuver}
          />
          <DirectionsList
            route={nav.route}
            currentStepIndex={nav.currentStepIndex}
          />
        </>
      )}

      <TaskPanel
        phase={nav.phase}
        task={nav.task}
        route={nav.route}
        onAccept={handleAccept}
        onReject={handleReject}
        onPickedUp={handlePickedUp}
        onDelivered={handleDelivered}
        onVerifyId={handleVerifyId}
        onConfirmDelivery={handleConfirmDelivery}
        onRefuse={handleRefuse}
      />

      {/* Hamburger menu button */}
      <button className="menu-hamburger" onClick={() => setMenuOpen(true)}>
        &#9776;
      </button>

      {/* Slide-out drawer */}
      {menuOpen && (
        <MenuDrawer
          driverId={driverId}
          profile={driverProfile}
          onClose={() => setMenuOpen(false)}
          setCurrentPage={setCurrentPage}
          onStatusChange={handleStatusChange}
          onLogout={handleLogout}
        />
      )}

      {/* Full-screen overlays */}
      {currentPage === "profile" && (
        <ProfilePage
          driverId={driverId}
          onBack={() => setCurrentPage("main")}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

      {currentPage === "settings" && (
        <SessionSettings
          driverId={driverId}
          profile={driverProfile}
          onBack={() => setCurrentPage("main")}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
