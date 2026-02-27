import { useState } from "react";
import { getManeuverIcon, generateDirectionText } from "../services/directions.js";
import { formatDistance } from "../utils/geo.js";

export default function DirectionsList({ route, currentStepIndex }) {
  const [expanded, setExpanded] = useState(false);

  if (!route || !route.steps.length) return null;

  return (
    <div className={`directions-list ${expanded ? "expanded" : ""}`}>
      <button
        className="directions-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide directions ▲" : "Show directions ▼"}
      </button>
      {expanded && (
        <div className="directions-steps">
          {route.steps.map((step, i) => (
            <div
              key={i}
              className={`directions-step ${i === currentStepIndex ? "current" : ""} ${i < currentStepIndex ? "past" : ""}`}
            >
              <span className="directions-step-icon">
                {getManeuverIcon(step.instruction, step.modifier)}
              </span>
              <div className="directions-step-info">
                <div className="directions-step-text">
                  {generateDirectionText(step)}
                </div>
                <div className="directions-step-dist">
                  {formatDistance(step.distance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
