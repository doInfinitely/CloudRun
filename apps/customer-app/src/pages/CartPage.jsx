import { useState } from "react";
import { formatPrice } from "../utils/format.js";
import CartItem from "../components/CartItem.jsx";
import AddressSelector from "../components/AddressSelector.jsx";

const TIP_OPTIONS = [
  { label: "$0", cents: 0 },
  { label: "$3", cents: 300 },
  { label: "$5", cents: 500 },
  { label: "$8", cents: 800 },
];

export default function CartPage({ customerId, cart, onBack, onCheckout }) {
  const [selectedAddress, setSelectedAddress] = useState(null);

  const handleUpdateQuantity = (productId, quantity) => {
    cart.dispatch({ type: "UPDATE_QUANTITY", productId, quantity });
  };

  if (cart.cart.items.length === 0) {
    return (
      <>
        <div className="page-header">
          <div className="page-header-row">
            <button className="back-btn" onClick={onBack}>&#8592;</button>
            <h1 className="page-title">Cart</h1>
          </div>
        </div>
        <div className="cart-empty">
          <div className="cart-empty-icon">&#128722;</div>
          <div>Your cart is empty</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <button className="back-btn" onClick={onBack}>&#8592;</button>
          <div>
            <h1 className="page-title">Cart</h1>
            {cart.cart.storeName && (
              <div className="page-subtitle">From {cart.cart.storeName}</div>
            )}
          </div>
        </div>
      </div>

      <div className="cart-items">
        {cart.cart.items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={handleUpdateQuantity}
          />
        ))}
      </div>

      <AddressSelector
        customerId={customerId}
        selectedId={selectedAddress?.id}
        onSelect={setSelectedAddress}
      />

      <div className="address-section">
        <div className="address-section-title">Tip</div>
        <div className="tip-options">
          {TIP_OPTIONS.map((opt) => (
            <button
              key={opt.cents}
              className={`tip-btn ${cart.cart.tipCents === opt.cents ? "active" : ""}`}
              onClick={() => cart.dispatch({ type: "SET_TIP", tipCents: opt.cents })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="price-summary">
        <div className="price-row">
          <span>Subtotal</span>
          <span>{formatPrice(cart.subtotalCents)}</span>
        </div>
        <div className="price-row">
          <span>Tax</span>
          <span>{formatPrice(cart.taxCents)}</span>
        </div>
        <div className="price-row">
          <span>Delivery fee</span>
          <span>{formatPrice(cart.feesCents)}</span>
        </div>
        <div className="price-row">
          <span>Tip</span>
          <span>{formatPrice(cart.cart.tipCents)}</span>
        </div>
        <div className="price-row total">
          <span>Total</span>
          <span>{formatPrice(cart.totalCents)}</span>
        </div>
      </div>

      <button
        className="checkout-btn"
        disabled={!selectedAddress}
        onClick={() => {
          // Store selected address for checkout
          window.__cloudrun_checkout = {
            addressId: selectedAddress.id,
            addressText: selectedAddress.address,
          };
          onCheckout();
        }}
      >
        Proceed to Checkout
      </button>
    </>
  );
}
