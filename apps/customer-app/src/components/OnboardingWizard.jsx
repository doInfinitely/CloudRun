import { useState } from "react";
import { upsertCustomer, addAddress } from "../services/api";
import { completeOnboarding } from "../services/api";

const STEPS = ["About You", "Delivery Address"];

export default function OnboardingWizard({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStep1 = async () => {
    if (!phone || !dob) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await upsertCustomer({ id: user.id, phone, dob });
      setStep(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!address) {
      setError("Please enter your delivery address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await addAddress(user.id, { address });
      await completeOnboarding(user.id);
      onComplete();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-logo">CR</div>
        <h1 className="onboarding-title">Welcome to CloudRun</h1>
        <p className="onboarding-subtitle">Let's get you set up for delivery</p>

        <div className="onboarding-steps">
          {STEPS.map((label, i) => (
            <div key={i} className="onboarding-step-indicator">
              <div className={`checkout-step-num ${i < step ? "done" : i === step ? "active" : ""}`}>
                {i < step ? "\u2713" : i + 1}
              </div>
              <span className={`onboarding-step-label ${i === step ? "active" : ""}`}>{label}</span>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="onboarding-form">
            <label className="onboarding-field-label">Phone Number</label>
            <input
              className="login-input"
              type="tel"
              placeholder="+1 (512) 555-1234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <label className="onboarding-field-label">Date of Birth</label>
            <input
              className="login-input"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={handleStep1} disabled={loading}>
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-form">
            <label className="onboarding-field-label">Delivery Address</label>
            <input
              className="login-input"
              type="text"
              placeholder="1100 S Lamar Blvd, Austin, TX 78704"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={handleStep2} disabled={loading}>
              {loading ? "Completing..." : "Complete Setup"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
