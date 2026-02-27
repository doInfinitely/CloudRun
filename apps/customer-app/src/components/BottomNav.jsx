export default function BottomNav({ activeTab, onTabChange, cartCount }) {
  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-item ${activeTab === "stores" ? "active" : ""}`}
        onClick={() => onTabChange("stores")}
      >
        <span className="bottom-nav-icon">&#127978;</span>
        Stores
      </button>
      <button
        className={`bottom-nav-item ${activeTab === "cart" ? "active" : ""}`}
        onClick={() => onTabChange("cart")}
      >
        <span className="bottom-nav-icon">&#128722;</span>
        {cartCount > 0 && <span className="bottom-nav-badge">{cartCount}</span>}
        Cart
      </button>
      <button
        className={`bottom-nav-item ${activeTab === "orders" ? "active" : ""}`}
        onClick={() => onTabChange("orders")}
      >
        <span className="bottom-nav-icon">&#128230;</span>
        Orders
      </button>
    </nav>
  );
}
