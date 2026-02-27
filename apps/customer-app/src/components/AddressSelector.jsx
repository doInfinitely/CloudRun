import { useState, useEffect } from "react";
import { getAddresses } from "../services/api.js";

export default function AddressSelector({ customerId, selectedId, onSelect }) {
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    getAddresses(customerId)
      .then((data) => {
        const list = data.addresses || data;
        setAddresses(list);
        // Auto-select first if none selected
        if (!selectedId && list.length > 0) {
          onSelect(list[0]);
        }
      })
      .catch(() => {});
  }, [customerId]);

  return (
    <div className="address-section">
      <div className="address-section-title">Delivery Address</div>
      {addresses.map((addr) => (
        <div
          key={addr.id}
          className={`address-option ${selectedId === addr.id ? "selected" : ""}`}
          onClick={() => onSelect(addr)}
        >
          <div className="address-radio" />
          <div className="address-text">{addr.address}</div>
        </div>
      ))}
      {addresses.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          No addresses found
        </div>
      )}
    </div>
  );
}
