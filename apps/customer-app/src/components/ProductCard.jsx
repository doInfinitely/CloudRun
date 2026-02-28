import { useState } from "react";
import { formatPrice } from "../utils/format.js";

const CATEGORY_COLORS = {
  disposable: "#6366f1",
  pod: "#0891b2",
  juice: "#16a34a",
  accessory: "#d97706",
};

const CATEGORY_ICONS = {
  disposable: "\u2601",  // cloud
  pod: "\u26a1",          // lightning
  juice: "\u2b22",        // hexagon
  accessory: "\u2699",    // gear
};

export default function ProductCard({ product, cartQuantity, onAdd }) {
  const [imgError, setImgError] = useState(false);
  const showImage = product.image_url && !imgError;
  const catColor = CATEGORY_COLORS[product.category] || "#6366f1";

  return (
    <div className="product-card">
      <div className="product-card-image">
        {showImage ? (
          <>
            <img
              className="product-card-image-blur"
              src={product.image_url}
              alt=""
              aria-hidden="true"
              onError={() => setImgError(true)}
            />
            <img
              className="product-card-image-main"
              src={product.image_url}
              alt={product.name}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="product-card-placeholder" style={{ background: catColor }}>
            <span className="product-card-placeholder-icon">
              {CATEGORY_ICONS[product.category] || "\u2606"}
            </span>
            <span className="product-card-placeholder-label">
              {product.category || "Product"}
            </span>
          </div>
        )}
      </div>
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
