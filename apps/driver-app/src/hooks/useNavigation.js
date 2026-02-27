import { useReducer, useCallback, useRef, useEffect } from "react";
import { getRoute } from "../services/routing.js";
import {
  generateDirectionText,
  generateApproachCallout,
} from "../services/directions.js";
import { haversine, findClosestPointOnRoute } from "../utils/geo.js";

const MANEUVER_THRESHOLD = 30; // meters to consider a maneuver reached
const ARRIVAL_THRESHOLD = 50; // meters to consider arrived at destination

const initialState = {
  phase: "IDLE", // IDLE | OFFER_RECEIVED | NAVIGATING_TO_PICKUP | AT_PICKUP | NAVIGATING_TO_DELIVERY | AT_DELIVERY | VERIFYING_ID | ID_VERIFIED | RETURNING_TO_STORE
  task: null,
  route: null,
  currentStepIndex: 0,
  distanceToNextManeuver: null,
  voiceQueue: [],
};

function reducer(state, action) {
  switch (action.type) {
    case "TASK_RECEIVED": {
      // If we already have this task in a later phase, don't reset
      if (state.task?.id === action.task.id && state.phase !== "IDLE") {
        return state;
      }
      // Map backend task status to the correct nav phase
      const taskStatus = action.task.status;
      let phase = "OFFER_RECEIVED";
      if (taskStatus === "ACCEPTED") phase = "NAVIGATING_TO_PICKUP";
      else if (taskStatus === "IN_PROGRESS") phase = "NAVIGATING_TO_DELIVERY";
      return {
        ...state,
        phase,
        task: action.task,
        route: null,
        currentStepIndex: 0,
        voiceQueue: [],
      };
    }

    case "TASK_ACCEPTED":
      return { ...state, phase: "NAVIGATING_TO_PICKUP" };

    case "ROUTE_LOADED":
      return {
        ...state,
        route: action.route,
        currentStepIndex: 0,
        distanceToNextManeuver: null,
        voiceQueue: [
          ...state.voiceQueue,
          generateDirectionText(action.route.steps[0]),
        ],
      };

    case "STEP_ADVANCED": {
      const nextIdx = state.currentStepIndex + 1;
      const step = state.route?.steps[nextIdx];
      const voice = step ? generateDirectionText(step) : null;
      return {
        ...state,
        currentStepIndex: nextIdx,
        voiceQueue: voice
          ? [...state.voiceQueue, voice]
          : state.voiceQueue,
      };
    }

    case "UPDATE_DISTANCE": {
      const callout = action.callout;
      return {
        ...state,
        distanceToNextManeuver: action.distance,
        voiceQueue: callout
          ? [...state.voiceQueue, callout]
          : state.voiceQueue,
      };
    }

    case "ARRIVED_PICKUP":
      return {
        ...state,
        phase: "AT_PICKUP",
        route: null,
        voiceQueue: [
          ...state.voiceQueue,
          "You are arriving at the pickup location",
        ],
      };

    case "PICKED_UP":
      return { ...state, phase: "NAVIGATING_TO_DELIVERY" };

    case "ARRIVED_DELIVERY":
      return {
        ...state,
        phase: "AT_DELIVERY",
        route: null,
        voiceQueue: [
          ...state.voiceQueue,
          "You have arrived at the delivery location",
        ],
      };

    case "START_ID_CHECK":
      return { ...state, phase: "VERIFYING_ID" };

    case "ID_CHECK_PASSED":
      return {
        ...state,
        phase: "ID_VERIFIED",
        voiceQueue: [...state.voiceQueue, "ID verification passed"],
      };

    case "ID_CHECK_FAILED":
      return {
        ...state,
        phase: "RETURNING_TO_STORE",
        route: null,
        voiceQueue: [...state.voiceQueue, "ID verification failed. Return to store."],
      };

    case "ORDER_REFUSED":
      return {
        ...state,
        phase: "RETURNING_TO_STORE",
        route: null,
        voiceQueue: [...state.voiceQueue, "Order refused. Navigate back to store."],
      };

    case "RETURN_COMPLETE":
      return { ...initialState };

    case "DELIVERED":
      return { ...initialState };

    case "REJECTED":
      return { ...initialState };

    case "VOICE_DEQUEUED":
      return { ...state, voiceQueue: state.voiceQueue.slice(1) };

    default:
      return state;
  }
}

export default function useNavigation(position) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const lastCalloutRef = useRef(null);

  // Fetch route when phase changes to NAVIGATING_TO_*
  useEffect(() => {
    if (!position || !state.task) return;

    if (state.phase === "NAVIGATING_TO_PICKUP" && !state.route) {
      const { lat, lng } = state.task.pickup;
      getRoute(position.lat, position.lng, lat, lng)
        .then((route) => dispatch({ type: "ROUTE_LOADED", route }))
        .catch((e) => console.error("Route fetch failed:", e));
    }

    if (state.phase === "NAVIGATING_TO_DELIVERY" && !state.route) {
      const { lat, lng } = state.task.delivery;
      getRoute(position.lat, position.lng, lat, lng)
        .then((route) => dispatch({ type: "ROUTE_LOADED", route }))
        .catch((e) => console.error("Route fetch failed:", e));
    }

    if (state.phase === "RETURNING_TO_STORE" && !state.route) {
      const { lat, lng } = state.task.pickup;
      getRoute(position.lat, position.lng, lat, lng)
        .then((route) => dispatch({ type: "ROUTE_LOADED", route }))
        .catch((e) => console.error("Route fetch failed:", e));
    }
  }, [state.phase, state.route, state.task, position]);

  // Track position against route
  useEffect(() => {
    if (!position || !state.route || !state.route.steps.length) return;

    const steps = state.route.steps;
    const idx = state.currentStepIndex;
    if (idx >= steps.length) return;

    const step = steps[idx];
    const [stepLat, stepLng] = step.location;
    const dist = haversine(position.lat, position.lng, stepLat, stepLng);

    // Check if we reached the maneuver point
    if (dist < MANEUVER_THRESHOLD && idx < steps.length - 1) {
      dispatch({ type: "STEP_ADVANCED" });
      lastCalloutRef.current = null;
      return;
    }

    // Check approach callouts
    const callout = generateApproachCallout(step, dist);
    if (callout && callout !== lastCalloutRef.current) {
      lastCalloutRef.current = callout;
      dispatch({ type: "UPDATE_DISTANCE", distance: dist, callout });
    } else {
      dispatch({ type: "UPDATE_DISTANCE", distance: dist, callout: null });
    }

    // Check arrival at destination
    if (state.phase === "NAVIGATING_TO_PICKUP") {
      const { lat, lng } = state.task.pickup;
      const toDest = haversine(position.lat, position.lng, lat, lng);
      if (toDest < ARRIVAL_THRESHOLD) {
        dispatch({ type: "ARRIVED_PICKUP" });
      }
    } else if (state.phase === "NAVIGATING_TO_DELIVERY") {
      const { lat, lng } = state.task.delivery;
      const toDest = haversine(position.lat, position.lng, lat, lng);
      if (toDest < ARRIVAL_THRESHOLD) {
        dispatch({ type: "ARRIVED_DELIVERY" });
      }
    } else if (state.phase === "RETURNING_TO_STORE") {
      const { lat, lng } = state.task.pickup;
      const toDest = haversine(position.lat, position.lng, lat, lng);
      if (toDest < ARRIVAL_THRESHOLD) {
        dispatch({ type: "RETURN_COMPLETE" });
      }
    }
  }, [position, state.route, state.currentStepIndex, state.phase, state.task]);

  const receiveTask = useCallback(
    (task) => dispatch({ type: "TASK_RECEIVED", task }),
    []
  );
  const acceptOffer = useCallback(
    () => dispatch({ type: "TASK_ACCEPTED" }),
    []
  );
  const rejectOffer = useCallback(() => dispatch({ type: "REJECTED" }), []);
  const confirmPickup = useCallback(
    () => dispatch({ type: "PICKED_UP" }),
    []
  );
  const confirmDelivery = useCallback(
    () => dispatch({ type: "DELIVERED" }),
    []
  );
  const startIdCheck = useCallback(
    () => dispatch({ type: "START_ID_CHECK" }),
    []
  );
  const idCheckPassed = useCallback(
    () => dispatch({ type: "ID_CHECK_PASSED" }),
    []
  );
  const idCheckFailed = useCallback(
    () => dispatch({ type: "ID_CHECK_FAILED" }),
    []
  );
  const refuseDelivery = useCallback(
    () => dispatch({ type: "ORDER_REFUSED" }),
    []
  );
  const completeReturn = useCallback(
    () => dispatch({ type: "RETURN_COMPLETE" }),
    []
  );
  const dequeueVoice = useCallback(
    () => dispatch({ type: "VOICE_DEQUEUED" }),
    []
  );

  return {
    ...state,
    receiveTask,
    acceptOffer,
    rejectOffer,
    confirmPickup,
    confirmDelivery,
    startIdCheck,
    idCheckPassed,
    idCheckFailed,
    refuseDelivery,
    completeReturn,
    dequeueVoice,
  };
}
