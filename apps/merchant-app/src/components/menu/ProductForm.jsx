import { useState, useEffect, useRef } from "react";

export default function ProductForm({ product, onSave, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [category, setCategory] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPriceDollars((product.price_cents / 100).toFixed(2));
      setCategory(product.category || "");
      setIsAvailable(product.is_available);
      setImagePreview(product.image_url || null);
    } else {
      setName("");
      setDescription("");
      setPriceDollars("");
      setCategory("");
      setIsAvailable(true);
      setImagePreview(null);
    }
    setImageFile(null);
  }, [product]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const price_cents = Math.round(parseFloat(priceDollars) * 100);
    if (isNaN(price_cents) || price_cents < 0) {
      alert("Enter a valid price");
      return;
    }
    onSave(
      {
        name,
        description: description || null,
        price_cents,
        category: category || null,
        is_available: isAvailable,
      },
      imageFile,
    );
  };

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <h3>{product ? "Edit Product" : "Add Product"}</h3>

      <div className="product-form__image-section">
        {imagePreview && (
          <div className="product-form__image-preview">
            <img src={imagePreview} alt="Preview" />
          </div>
        )}
        <label className="btn btn--small" style={{ cursor: "pointer" }}>
          {imagePreview ? "Change Image" : "Upload Image"}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>
      </div>

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
