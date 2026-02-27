import { useState, useEffect } from "react";
import { getStore } from "../services/api.js";
import { formatPrice } from "../utils/format.js";
import ProductCard from "../components/ProductCard.jsx";

const CATEGORIES = ["All", "Disposables", "Pods", "Juice", "Accessories"];
const CATEGORY_MAP = {
  All: null,
  Disposables: "disposable",
  Pods: "pod",
  Juice: "juice",
  Accessories: "accessory",
};

export default function StoreDetailPage({ storeId, cart, onBack, onViewCart }) {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    getStore(storeId)
      .then((data) => {
        setStore(data);
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [storeId]);

  const filtered = CATEGORY_MAP[activeCategory]
    ? products.filter((p) => p.category === CATEGORY_MAP[activeCategory])
    : products;

  const getCartQty = (productId) => {
    const item = cart.cart.items.find((i) => i.id === productId);
    return item ? item.quantity : 0;
  };

  const handleAdd = (product) => {
    cart.dispatch({
      type: "ADD_ITEM",
      storeId,
      storeName: store?.name || "",
      product: {
        id: product.id,
        name: product.name,
        price_cents: product.price_cents,
        category: product.category,
      },
    });
  };

  if (loading) return <div className="loading-screen">Loading store...</div>;
  if (!store) return <div className="loading-screen">Store not found</div>;

  return (
    <>
      <div className="store-detail-header">
        <div className="page-header-row">
          <button className="back-btn" onClick={onBack}>
            &#8592;
          </button>
          <div>
            <div className="store-detail-name">{store.name}</div>
            <div className="store-detail-address">{store.address}</div>
          </div>
        </div>
      </div>

      <div className="category-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-tab ${activeCategory === cat ? "active" : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            cartQuantity={getCartQty(product.id)}
            onAdd={handleAdd}
          />
        ))}
      </div>

      {cart.itemCount > 0 && (
        <button className="floating-cart-btn" onClick={onViewCart}>
          <span>View Cart ({cart.itemCount})</span>
          <span>{formatPrice(cart.totalCents)}</span>
        </button>
      )}
    </>
  );
}
