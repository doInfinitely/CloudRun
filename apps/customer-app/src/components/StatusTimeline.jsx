const STEPS = [
  { key: "CREATED", label: "Order placed" },
  { key: "VERIFYING_AGE", label: "Verifying age" },
  { key: "PAYMENT_AUTH", label: "Processing payment" },
  { key: "MERCHANT_ACCEPTED", label: "Store accepted" },
  { key: "PICKUP", label: "Driver picking up" },
  { key: "EN_ROUTE", label: "On the way" },
  { key: "DOORSTEP_VERIFY", label: "At your door" },
  { key: "DELIVERED", label: "Delivered" },
];

const STATUS_ORDER = STEPS.map((s) => s.key);

export default function StatusTimeline({ currentStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="status-timeline">
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;

        return (
          <div className="timeline-step" key={step.key}>
            <div className="timeline-dot-col">
              <div
                className={`timeline-dot ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
              />
              {i < STEPS.length - 1 && (
                <div className={`timeline-line ${isDone ? "done" : ""}`} />
              )}
            </div>
            <div
              className={`timeline-text ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
            >
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
