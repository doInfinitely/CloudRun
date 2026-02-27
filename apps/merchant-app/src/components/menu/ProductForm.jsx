import { useState, useEffect } from "react";

export default function ProductForm({ product, onSave, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [category, setCategory] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPriceDollars((product.price_cents / 100).toFixed(2));
      setCategory(product.category || "");
      setIsAvailable(product.is_available);
    } else {
      setName("");
      setDescription("");
      setPriceDollars("");
      setCategory("");
      setIsAvailable(true);
    }
  }, [product]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const price_cents = Math.round(parseFloat(priceDollars) * 100);
    if (isNaN(price_cents) || price_cents < 0) {
      alert("Enter a valid price");
      return;
    }
    onSave({
      name,
      description: description || null,
      price_cents,
      category: category || null,
      is_available: isAvailable,
    });
  };

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <h3>{product ? "Edit Product" : "Add Product"}</h3>
      <label className="form-label">
        Name
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="form-label">
        Price ($)
        <input className="input" type="number" step="0.01" min="0" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} required />
      </label>
      <label className="form-label">
        Category
        <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
      </label>
      <label className="form-label">
        Description
        <textarea className="input input--textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </label>
      <label className="form-check">
        <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
        Available
      </label>
      <div className="product-form__actions">
        <button type="submit" className="btn btn--accent">{product ? "Update" : "Create"}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
