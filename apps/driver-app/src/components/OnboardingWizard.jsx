import { useState, useEffect } from "react";
import {
  updateProfile,
  uploadProfilePhoto,
  createVehicle,
  uploadDriverDocument,
  uploadVehicleDocument,
  createStripeAccount,
  createStripeLink,
  getStripeStatus,
  completeOnboarding,
} from "../services/api";

const STEPS = ["Personal Info", "Your Vehicle", "Documents", "Get Paid"];

export default function OnboardingWizard({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [phone, setPhone] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  // Step 2
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleId, setVehicleId] = useState(null);

  // Step 3
  const [licenseUploaded, setLicenseUploaded] = useState(false);
  const [insuranceUploaded, setInsuranceUploaded] = useState(false);
  const [registrationUploaded, setRegistrationUploaded] = useState(false);

  // Step 4 — Stripe
  const [stripeComplete, setStripeComplete] = useState(false);

  // On mount: check for Stripe redirect return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_onboarding") === "complete") {
      window.history.replaceState({}, "", window.location.pathname);
      const saved = sessionStorage.getItem("onboarding_step");
      if (saved) {
        setStep(parseInt(saved, 10));
        sessionStorage.removeItem("onboarding_step");
      } else {
        setStep(3);
      }
      // Verify stripe status
      getStripeStatus(user.id)
        .then((s) => {
          if (s.stripe_onboarding_complete) setStripeComplete(true);
        })
        .catch(() => {});
    }
  }, [user.id]);

  const handleStep1 = async () => {
    if (!phone) { setError("Please enter your phone number"); return; }
    setLoading(true); setError("");
    try {
      await updateProfile(user.id, { phone });
      if (photoFile) await uploadProfilePhoto(user.id, photoFile);
      setStep(1);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleStep2 = async () => {
    if (!make || !model) { setError("Make and model are required"); return; }
    setLoading(true); setError("");
    try {
      const v = await createVehicle(user.id, {
        make, model,
        year: year ? parseInt(year, 10) : null,
        color, license_plate: plate,
      });
      setVehicleId(v.id);
      setStep(2);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleDocUpload = async (type, file, isVehicle) => {
    setError("");
    try {
      if (isVehicle && vehicleId) {
        await uploadVehicleDocument(user.id, vehicleId, type, file);
      } else {
        await uploadDriverDocument(user.id, type, file);
      }
      if (type === "LICENSE") setLicenseUploaded(true);
      if (type === "INSURANCE") setInsuranceUploaded(true);
      if (type === "REGISTRATION") setRegistrationUploaded(true);
    } catch (e) { setError(e.message); }
  };

  const handleStep3 = () => {
    if (!licenseUploaded) { setError("Please upload your driver's license"); return; }
    setStep(3);
  };

  const handleStripeSetup = async () => {
    setLoading(true); setError("");
    try {
      await createStripeAccount(user.id);
      const returnUrl = `${window.location.origin}/?stripe_onboarding=complete`;
      const refreshUrl = `${window.location.origin}/?stripe_onboarding=refresh`;
      sessionStorage.setItem("onboarding_step", "3");
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

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="login-logo">CR</div>
        <h1 className="onboarding-title">Driver Setup</h1>
        <p className="onboarding-subtitle">Complete these steps to start delivering</p>

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
            <label className="onboarding-field-label">Phone Number</label>
            <input className="login-input" type="tel" placeholder="+1 (512) 555-1234"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
            <label className="onboarding-field-label">Profile Photo (optional)</label>
            <input className="login-input" type="file" accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files[0])} />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={handleStep1} disabled={loading}>
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-form">
            <label className="onboarding-field-label">Make</label>
            <input className="login-input" placeholder="Toyota" value={make} onChange={(e) => setMake(e.target.value)} />
            <label className="onboarding-field-label">Model</label>
            <input className="login-input" placeholder="Camry" value={model} onChange={(e) => setModel(e.target.value)} />
            <label className="onboarding-field-label">Year</label>
            <input className="login-input" type="number" placeholder="2022" value={year} onChange={(e) => setYear(e.target.value)} />
            <label className="onboarding-field-label">Color</label>
            <input className="login-input" placeholder="Silver" value={color} onChange={(e) => setColor(e.target.value)} />
            <label className="onboarding-field-label">License Plate</label>
            <input className="login-input" placeholder="ABC-1234" value={plate} onChange={(e) => setPlate(e.target.value)} />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={handleStep2} disabled={loading}>
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-form">
            <div className="onboarding-doc-row">
              <span>Driver's License</span>
              {licenseUploaded
                ? <span className="onboarding-doc-badge done">Uploaded</span>
                : <label className="onboarding-upload-label">
                    Upload <input type="file" accept="image/*,.pdf" hidden
                      onChange={(e) => handleDocUpload("LICENSE", e.target.files[0], false)} />
                  </label>
              }
            </div>
            <div className="onboarding-doc-row">
              <span>Vehicle Insurance</span>
              {insuranceUploaded
                ? <span className="onboarding-doc-badge done">Uploaded</span>
                : <label className="onboarding-upload-label">
                    Upload <input type="file" accept="image/*,.pdf" hidden
                      onChange={(e) => handleDocUpload("INSURANCE", e.target.files[0], true)} />
                  </label>
              }
            </div>
            <div className="onboarding-doc-row">
              <span>Registration</span>
              {registrationUploaded
                ? <span className="onboarding-doc-badge done">Uploaded</span>
                : <label className="onboarding-upload-label">
                    Upload <input type="file" accept="image/*,.pdf" hidden
                      onChange={(e) => handleDocUpload("REGISTRATION", e.target.files[0], true)} />
                  </label>
              }
            </div>
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={handleStep3} disabled={loading}>
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-form">
            {stripeComplete ? (
              <>
                <div className="onboarding-stripe-done">Payouts configured</div>
                <button className="login-btn" onClick={handleFinish} disabled={loading}>
                  {loading ? "Finishing..." : "Start Delivering"}
                </button>
              </>
            ) : (
              <>
                <p className="onboarding-stripe-desc">
                  Set up your payout account to receive earnings from deliveries.
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
