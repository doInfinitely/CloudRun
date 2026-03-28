import { useState, useEffect } from "react";
import {
  updateMerchantProfile,
  createMerchantStore,
  updateStore,
  createStripeAccount,
  createStripeLink,
  getStripeStatus,
  completeOnboarding,
} from "../services/api";

const STEPS = ["Business Info", "Your Store", "Business Hours", "Get Paid"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function OnboardingWizard({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [legalName, setLegalName] = useState("");
  const [ein, setEin] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Step 2
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeId, setStoreId] = useState(null);

  // Step 3
  const [hours, setHours] = useState(() =>
    Object.fromEntries(DAYS.map((d) => [d, { open: "09:00", close: "21:00" }]))
  );

  // Step 4
  const [stripeComplete, setStripeComplete] = useState(false);

  // On mount: check for Stripe redirect return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_onboarding") === "complete") {
      window.history.replaceState({}, "", window.location.pathname);
      const savedStep = sessionStorage.getItem("onboarding_step");
      const savedStoreId = sessionStorage.getItem("onboarding_store_id");
      if (savedStep) {
        setStep(parseInt(savedStep, 10));
        sessionStorage.removeItem("onboarding_step");
      } else {
        setStep(3);
      }
      if (savedStoreId) {
        setStoreId(savedStoreId);
        sessionStorage.removeItem("onboarding_store_id");
      }
      getStripeStatus(user.id)
        .then((s) => {
          if (s.stripe_onboarding_complete) setStripeComplete(true);
        })
        .catch(() => {});
    }
  }, [user.id]);

  const handleStep1 = async () => {
    if (!legalName) { setError("Legal name is required"); return; }
    setLoading(true); setError("");
    try {
      await updateMerchantProfile(user.id, {
        legal_name: legalName, ein, business_type: businessType,
        contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone,
      });
      setStep(1);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleStep2 = async () => {
    if (!storeName || !storeAddress) { setError("Store name and address are required"); return; }
    setLoading(true); setError("");
    try {
      const s = await createMerchantStore(user.id, { name: storeName, address: storeAddress });
      setStoreId(s.id);
      setStep(2);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleStep3 = async () => {
    if (!storeId) { setError("No store created"); return; }
    setLoading(true); setError("");
    try {
      await updateStore(user.id, storeId, { hours_json: hours });
      setStep(3);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleStripeSetup = async () => {
    setLoading(true); setError("");
    try {
      await createStripeAccount(user.id);
      const returnUrl = `${window.location.origin}/?stripe_onboarding=complete`;
      const refreshUrl = `${window.location.origin}/?stripe_onboarding=refresh`;
      sessionStorage.setItem("onboarding_step", "3");
      if (storeId) sessionStorage.setItem("onboarding_store_id", storeId);
      const { url } = await createStripeLink(user.id, returnUrl, refreshUrl);
      window.location.href = url;
    } catch (e) { setError(e.message); setLoading(false); }
  };

  const handleFinish = async () => {
    setLoading(true); setError("");
    try {
      await completeOnboarding(user.id);
      onComplete();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const updateHour = (day, field, value) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="login-logo">CR</div>
        <h1 className="onboarding-title">Merchant Setup</h1>
        <p className="onboarding-subtitle">Set up your business on CloudRun</p>

        <div className="onboarding-steps">
          {STEPS.map((label, i) => (
            <div key={i} className="onboarding-step-indicator">
              <div className={`onboarding-step-dot ${i < step ? "done" : i === step ? "active" : ""}`}>
                {i < step ? "\u2713" : i + 1}
              </div>
              <span className={`onboarding-step-label ${i === step ? "active" : ""}`}>{label}</span>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="onboarding-form">
            <label className="onboarding-field-label">Legal Business Name *</label>
            <input className="login-input" placeholder="Austin Vape Co" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            <label className="onboarding-field-label">EIN</label>
            <input className="login-input" placeholder="XX-XXXXXXX" value={ein} onChange={(e) => setEin(e.target.value)} />
            <label className="onboarding-field-label">Business Type</label>
            <input className="login-input" placeholder="LLC, Corporation, etc." value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
            <label className="onboarding-field-label">Contact Name</label>
            <input className="login-input" placeholder="John Smith" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <label className="onboarding-field-label">Contact Email</label>
            <input className="login-input" type="email" placeholder="john@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <label className="onboarding-field-label">Contact Phone</label>
            <input className="login-input" type="tel" placeholder="+1 (512) 555-1234" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={handleStep1} disabled={loading}>
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-form">
            <label className="onboarding-field-label">Store Name *</label>
            <input className="login-input" placeholder="My Store" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
            <label className="onboarding-field-label">Store Address *</label>
            <input className="login-input" placeholder="401 Congress Ave, Austin, TX 78701" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={handleStep2} disabled={loading}>
              {loading ? "Creating Store..." : "Continue"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-form">
            <div className="onboarding-hours-grid">
              {DAYS.map((day) => (
                <div key={day} className="onboarding-hours-row">
                  <span className="onboarding-hours-day">{day}</span>
                  <input className="login-input onboarding-time-input" type="time"
                    value={hours[day].open} onChange={(e) => updateHour(day, "open", e.target.value)} />
                  <span className="onboarding-hours-to">to</span>
                  <input className="login-input onboarding-time-input" type="time"
                    value={hours[day].close} onChange={(e) => updateHour(day, "close", e.target.value)} />
                </div>
              ))}
            </div>
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={handleStep3} disabled={loading}>
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-form">
            {stripeComplete ? (
              <>
                <div className="onboarding-stripe-done">Payouts configured</div>
                <button className="login-btn" onClick={handleFinish} disabled={loading}>
                  {loading ? "Finishing..." : "Launch Your Store"}
                </button>
              </>
            ) : (
              <>
                <p className="onboarding-stripe-desc">
                  Set up your payout account to receive payments from orders.
                </p>
                <button className="login-btn" onClick={handleStripeSetup} disabled={loading}>
                  {loading ? "Redirecting..." : "Set Up Payouts"}
                </button>
              </>
            )}
            {error && <div className="login-error">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
