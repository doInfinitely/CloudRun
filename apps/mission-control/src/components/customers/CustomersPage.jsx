import { useState } from "react";
import { usePolling } from "../../hooks/usePolling";
import { getCustomers } from "../../services/api";
import CustomerList from "./CustomerList";
import CustomerDetail from "./CustomerDetail";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  usePolling(() => {
    return getCustomers({ limit: 100 }).then((r) => setCustomers(r.customers || []));
  }, 15000);

  return (
    <div className="customers-page">
      <div className="split-view">
        <div className="split-view__list">
          <CustomerList customers={customers} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="split-view__detail">
          <CustomerDetail customerId={selectedId} />
        </div>
      </div>
    </div>
  );
}
