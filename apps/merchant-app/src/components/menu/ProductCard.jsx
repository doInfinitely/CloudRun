function cents(c) {
  return "$" + (c / 100).toFixed(2);
}

export default function ProductCard({ product, onEdit, onToggle, onDelete }) {
  return (
    <div className={`product-card ${!product.is_available ? "product-card--unavailable" : ""}`}>
      <div className="product-card__header">
        <h4 className="product-card__name">{product.name}</h4>
        <span className="product-card__price">{cents(product.price_cents)}</span>
      </div>
      {product.description && (
        <p className="product-card__desc">{product.description}</p>
      )}
      {product.category && (
        <span className="product-card__category">{product.category}</span>
      )}
      <div className="product-card__actions">
        <button
          className={`toggle-small ${product.is_available ? "toggle-small--on" : "toggle-small--off"}`}
          onClick={() => onToggle(product)}
          title={product.is_available ? "Mark unavailable" : "Mark available"}
        >
          {product.is_available ? "Available" : "Unavailable"}
        </button>
        <button className="btn btn--small" onClick={() => onEdit(product)}>Edit</button>
        <button className="btn btn--small btn--danger-outline" onClick={() => onDelete(product)}>Delete</button>
      </div>
    </div>
  );
}
