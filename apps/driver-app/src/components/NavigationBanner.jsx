import { getManeuverIcon, generateDirectionText } from "../services/directions.js";
import { formatDistance } from "../utils/geo.js";

const PHASE_LABELS = {
  NAVIGATING_TO_PICKUP: "Heading to pickup",
  NAVIGATING_TO_DELIVERY: "Heading to delivery",
  AT_PICKUP: "At pickup",
  AT_DELIVERY: "At delivery",
  RETURNING_TO_STORE: "Returning to store",
};

export default function NavigationBanner({
  phase,
  route,
  currentStepIndex,
  distanceToNextManeuver,
}) {
  if (!route || !route.steps.length) return null;

  const step = route.steps[currentStepIndex];
  if (!step) return null;

  const icon = getManeuverIcon(step.instruction, step.modifier);
  const text = generateDirectionText(step);
  const dist =
    distanceToNextManeuver != null
      ? formatDistance(distanceToNextManeuver)
      : "";
  const phaseLabel = PHASE_LABELS[phase] || "";

  return (
    <div className="nav-banner">
      <div className="nav-banner-phase">{phaseLabel}</div>
      <div className="nav-banner-main">
        <span className="nav-banner-icon">{icon}</span>
        <div className="nav-banner-info">
          <div className="nav-banner-distance">{dist}</div>
          <div className="nav-banner-text">{text}</div>
        </div>
      </div>
    </div>
  );
}
