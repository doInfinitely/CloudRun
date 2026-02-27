import { useState, useEffect, useCallback } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../../services/api";
import ProductCard from "./ProductCard";
import ProductForm from "./ProductForm";

export default function MenuPage({ merchantId, storeId }) {
  const [products, setProducts] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editing, setEditing] = useState(null); // null = closed, {} = new, product = editing
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    const ps = await getProducts(merchantId, storeId);
    setProducts(ps);
  }, [merchantId, storeId]);

  useEffect(() => { load(); }, [load]);

  const categories = ["all", ...new Set(products.map((p) => p.category).filter(Boolean))];
  const filtered = categoryFilter === "all" ? products : products.filter((p) => p.category === categoryFilter);

  const handleToggle = async (product) => {
    await updateProduct(merchantId, storeId, product.id, { is_available: !product.is_available });
    load();
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    await deleteProduct(merchantId, storeId, product.id);
    load();
  };

  const handleSave = async (data) => {
    if (editing && editing.id) {
      await updateProduct(merchantId, storeId, editing.id, data);
    } else {
      await createProduct(merchantId, storeId, data);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  return (
    <div className="menu-page">
      <div className="menu-page__header">
        <div className="menu-page__filters">
          {categories.map((c) => (
            <button
              key={c}
              className={`tab-btn ${categoryFilter === c ? "tab-btn--active" : ""}`}
              onClick={() => setCategoryFilter(c)}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
        <button className="btn btn--accent" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Add Product
        </button>
      </div>

      {showForm && (
        <ProductForm
          product={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="menu-page__grid">
        {filtered.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onEdit={(prod) => { setEditing(prod); setShowForm(true); }}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}
        {filtered.length === 0 && <div className="orders-empty">No products</div>}
      </div>
    </div>
  );
}
