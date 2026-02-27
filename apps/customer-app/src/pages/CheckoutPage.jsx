import { useState, useRef } from "react";
import { createOrder, verifyAge, authorizePayment } from "../services/api.js";
import { formatPrice } from "../utils/format.js";

export default function CheckoutPage({ customerId, cart, onTrackOrder, onBack }) {
  const [step, setStep] = useState(1); // 1=age, 2=payment, 3=confirmation
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const createdRef = useRef(false);

  const checkout = window.__cloudrun_checkout || {};

  const handleVerifyAge = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create order first
      if (!createdRef.current) {
        const items = cart.cart.items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
        }));
        const result = await createOrder({
          customer_id: customerId,
          store_id: cart.cart.storeId,
          address_id: checkout.addressId,
          items,
          tip_cents: cart.cart.tipCents,
          disclosure_version: "1.0",
        });
        setOrderId(result.order_id);
        createdRef.current = true;

        // Verify age
        await verifyAge(result.order_id, "pass");
      } else {
        await verifyAge(orderId, "pass");
      }
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      await authorizePayment(orderId, "pm_demo_visa");
      cart.dispatch({ type: "CLEAR_CART" });
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <button className="back-btn" onClick={onBack}>&#8592;</button>
          <h1 className="page-title">Checkout</h1>
        </div>
      </div>

      <div className="checkout-steps">
        {/* Step 1: Age Verification */}
        <div className="checkout-step">
          <div className="checkout-step-header">
            <div className={`checkout-step-num ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>
              {step > 1 ? "\u2713" : "1"}
            </div>
            <div className="checkout-step-title">Age Verification</div>
          </div>
          <div className="checkout-step-body">
            {step === 1 ? (
              <>
                <div className="checkout-step-desc">
                  I confirm that I am at least 21 years of age and legally eligible
                  to purchase tobacco/nicotine products in the State of Texas.
                </div>
                <button
                  className="checkout-action-btn age"
                  onClick={handleVerifyAge}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify Age & Create Order"}
                </button>
              </>
            ) : (
              <div className="checkout-status">Age verified</div>
            )}
          </div>
        </div>

        {/* Step 2: Payment */}
        <div className="checkout-step">
          <div className="checkout-step-header">
            <div className={`checkout-step-num ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>
              {step > 2 ? "\u2713" : "2"}
            </div>
            <div className="checkout-step-title">Payment</div>
          </div>
          <div className="checkout-step-body">
            {step === 2 ? (
              <>
                <div className="checkout-step-desc">
                  Total: {formatPrice(cart.totalCents)}
                </div>
                <button
                  className="checkout-action-btn pay"
                  onClick={handlePayment}
                  disabled={loading}
                >
                  {loading ? "Processing..." : `Pay ${formatPrice(cart.totalCents)}`}
                </button>
              </>
            ) : step > 2 ? (
              <div className="checkout-status">Payment authorized</div>
            ) : (
              <div className="checkout-step-desc" style={{ opacity: 0.4 }}>
                Complete age verification first
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Confirmation */}
        <div className="checkout-step">
          <div className="checkout-step-header">
            <div className={`checkout-step-num ${step === 3 ? "done" : ""}`}>
              {step === 3 ? "\u2713" : "3"}
            </div>
            <div className="checkout-step-title">Confirmation</div>
          </div>
          <div className="checkout-step-body">
            {step === 3 ? (
              <>
                <div className="checkout-step-desc">
                  Your order has been placed and sent to the store!
                </div>
                <button
                  className="checkout-action-btn track"
                  onClick={() => onTrackOrder(orderId)}
                >
                  Track Order
                </button>
              </>
            ) : (
              <div className="checkout-step-desc" style={{ opacity: 0.4 }}>
                Complete payment first
              </div>
            )}
          </div>
        </div>

        {error && <div className="checkout-error">{error}</div>}
      </div>
    </>
  );
}
