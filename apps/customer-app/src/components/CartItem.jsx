import { formatPrice } from "../utils/format.js";

export default function CartItem({ item, onUpdateQuantity }) {
  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <div className="cart-item-name">{item.name}</div>
        <div className="cart-item-price">
          {formatPrice(item.price_cents)} each
        </div>
      </div>
      <div className="cart-item-qty">
        <button
          className="qty-btn"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          -
        </button>
        <span className="qty-value">{item.quantity}</span>
        <button
          className="qty-btn"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
