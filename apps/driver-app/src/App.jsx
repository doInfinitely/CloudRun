import { useEffect, useRef, useCallback } from "react";
import useGeolocation from "./hooks/useGeolocation.js";
import useNavigation from "./hooks/useNavigation.js";
import DriverMap from "./components/DriverMap.jsx";
import NavigationBanner from "./components/NavigationBanner.jsx";
import DirectionsList from "./components/DirectionsList.jsx";
import TaskPanel from "./components/TaskPanel.jsx";
import {
  getDriverTask,
  updateDriver,
  acceptTask as apiAccept,
  rejectTask as apiReject,
  startTask as apiStart,
  completeTask as apiComplete,
} from "./services/api.js";

// Hardcoded driver ID for now — would come from auth in production
const DRIVER_ID = "drv_demo_001";
const POLL_INTERVAL = 5000;

export default function App() {
  const { position, heading, error: geoError } = useGeolocation();
  const nav = useNavigation(position);
  const pollRef = useRef(null);

  // Poll for task offers when idle
  useEffect(() => {
    if (nav.phase !== "IDLE") {
      clearInterval(pollRef.current);
      return;
    }

    const poll = async () => {
      try {
        const data = await getDriverTask(DRIVER_ID);
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
      updateDriver(DRIVER_ID, {
        lat: position.lat,
        lng: position.lng,
        status: nav.phase === "IDLE" ? "IDLE" : "ON_TASK",
      }).catch(() => {});
    }, POLL_INTERVAL);

    // Send immediately
    updateDriver(DRIVER_ID, {
      lat: position.lat,
      lng: position.lng,
      status: nav.phase === "IDLE" ? "IDLE" : "ON_TASK",
    }).catch(() => {});

    return () => clearInterval(interval);
  }, [position, nav.phase]);

  // Log voice queue
  useEffect(() => {
    if (nav.voiceQueue.length > 0) {
      console.log("[Voice]", nav.voiceQueue[0]);
      nav.dequeueVoice();
    }
  }, [nav.voiceQueue, nav.dequeueVoice]);

  // Action handlers
  const handleAccept = useCallback(async () => {
    if (!nav.task) return;
    try {
      await apiAccept(nav.task.id, DRIVER_ID);
      nav.acceptOffer();
    } catch (e) {
      console.error("Accept failed:", e);
    }
  }, [nav.task, nav.acceptOffer]);

  const handleReject = useCallback(async () => {
    if (!nav.task) return;
    try {
      await apiReject(nav.task.id, DRIVER_ID);
      nav.rejectOffer();
    } catch (e) {
      console.error("Reject failed:", e);
    }
  }, [nav.task, nav.rejectOffer]);

  const handlePickedUp = useCallback(async () => {
    if (!nav.task) return;
    try {
      await apiStart(nav.task.id, DRIVER_ID);
      nav.confirmPickup();
    } catch (e) {
      console.error("Start failed:", e);
    }
  }, [nav.task, nav.confirmPickup]);

  const handleDelivered = useCallback(async () => {
    if (!nav.task) return;
    try {
      await apiComplete(nav.task.id, DRIVER_ID);
      nav.confirmDelivery();
    } catch (e) {
      console.error("Complete failed:", e);
    }
  }, [nav.task, nav.confirmDelivery]);

  // Derive marker positions from current phase
  const showPickup =
    nav.task?.pickup &&
    ["OFFER_RECEIVED", "NAVIGATING_TO_PICKUP", "AT_PICKUP"].includes(nav.phase);
  const showDelivery =
    nav.task?.delivery &&
    [
      "OFFER_RECEIVED",
      "NAVIGATING_TO_PICKUP",
      "AT_PICKUP",
      "NAVIGATING_TO_DELIVERY",
      "AT_DELIVERY",
    ].includes(nav.phase);

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
      />
    </>
  );
}
