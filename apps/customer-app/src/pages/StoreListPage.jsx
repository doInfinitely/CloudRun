import { useState, useEffect } from "react";
import { getStores } from "../services/api.js";
import StoreCard from "../components/StoreCard.jsx";

export default function StoreListPage({ onSelectStore }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStores()
      .then((data) => {
        setStores(data.stores || data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">CloudRun</h1>
        <div className="page-subtitle">Delivery in 30 min or less</div>
      </div>
      {loading ? (
        <div className="loading-screen">Loading stores...</div>
      ) : stores.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#127978;</div>
          <div>No stores available</div>
        </div>
      ) : (
        <div className="store-list">
          {stores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              onClick={() => onSelectStore(store.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
