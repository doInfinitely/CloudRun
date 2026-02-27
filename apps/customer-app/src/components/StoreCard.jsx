export default function StoreCard({ store, onClick }) {
  return (
    <div className="store-card" onClick={onClick}>
      <div className="store-card-name">{store.name}</div>
      <div className="store-card-address">{store.address}</div>
      <div className="store-card-meta">
        <span className="store-card-badge">Open</span>
        <span>{store.product_count} items</span>
      </div>
    </div>
  );
}
