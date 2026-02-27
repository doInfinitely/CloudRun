const MODIFIER_TEXT = {
  left: "left",
  right: "right",
  "sharp left": "sharp left",
  "sharp right": "sharp right",
  "slight left": "slight left",
  "slight right": "slight right",
  straight: "straight",
  uturn: "U-turn",
};

const MANEUVER_ICON = {
  "turn-left": "↰",
  "turn-right": "↱",
  "turn-sharp-left": "⤺",
  "turn-sharp-right": "⤻",
  "turn-slight-left": "↖",
  "turn-slight-right": "↗",
  "turn-straight": "↑",
  "turn-uturn": "↩",
  depart: "▶",
  arrive: "◉",
  merge: "⤵",
  fork: "⑂",
  roundabout: "↻",
  continue: "↑",
  "new name": "↑",
  "on ramp": "↗",
  "off ramp": "↘",
  "end of road": "↰",
};

export function getManeuverIcon(type, modifier) {
  const key = modifier ? `${type}-${modifier}` : type;
  return MANEUVER_ICON[key] || MANEUVER_ICON[type] || "↑";
}

export function generateDirectionText(step) {
  const { instruction: type, modifier, name } = step;
  const street = name ? ` onto ${name}` : "";
  const dir = MODIFIER_TEXT[modifier] || "";

  switch (type) {
    case "depart":
      return `Head ${dir || "forward"}${street}`;
    case "arrive":
      return "You have arrived at your destination";
    case "turn":
      return `Turn ${dir}${street}`;
    case "merge":
      return `Merge ${dir}${street}`;
    case "fork":
      return `Take the ${dir || "fork"}${street}`;
    case "roundabout":
    case "rotary":
      return `Enter the roundabout and take the exit${street}`;
    case "end of road":
      return `At the end of the road, turn ${dir || "left"}${street}`;
    case "continue":
      return `Continue${dir ? ` ${dir}` : ""}${street}`;
    case "new name":
      return `Continue${street}`;
    case "on ramp":
      return `Take the ramp${street}`;
    case "off ramp":
      return `Take the exit${street}`;
    default:
      return `Continue${street}`;
  }
}

const CALLOUT_THRESHOLDS = [1000, 500, 200, 50];

export function generateApproachCallout(step, distanceToStep) {
  for (const threshold of CALLOUT_THRESHOLDS) {
    if (distanceToStep <= threshold + 10 && distanceToStep >= threshold - 10) {
      const prefix =
        threshold >= 1000
          ? `In ${(threshold / 1000).toFixed(0)} kilometer`
          : `In ${threshold} meters`;
      const action = generateDirectionText(step);
      return `${prefix}, ${action.charAt(0).toLowerCase() + action.slice(1)}`;
    }
  }
  return null;
}
