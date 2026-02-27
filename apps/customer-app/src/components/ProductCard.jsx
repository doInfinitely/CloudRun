import { formatPrice } from "../utils/format.js";

export default function ProductCard({ product, cartQuantity, onAdd }) {
  return (
    <div className="product-card">
      <div className="product-card-name">{product.name}</div>
      <div className="product-card-desc">{product.description || ""}</div>
      <div className="product-card-bottom">
        <span className="product-card-price">{formatPrice(product.price_cents)}</span>
        <div style={{ display: "flex", alignItems: "center" }}>
          {cartQuantity > 0 && (
            <span className="product-qty-badge">{cartQuantity}</span>
          )}
          <button className="product-add-btn" onClick={() => onAdd(product)}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}
