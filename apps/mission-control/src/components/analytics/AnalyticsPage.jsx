import { useState } from "react";
import OrderAnalytics from "./OrderAnalytics";
import DriverAnalytics from "./DriverAnalytics";
import MerchantAnalytics from "./MerchantAnalytics";
import CustomerAnalytics from "./CustomerAnalytics";
import ExportButtons from "./ExportButtons";

const TABS = [
  { id: "orders", label: "Orders" },
  { id: "drivers", label: "Drivers" },
  { id: "merchants", label: "Merchants" },
  { id: "customers", label: "Customers" },
];

export default function AnalyticsPage() {
  const [tab, setTab] = useState("orders");

  return (
    <div className="analytics-page">
      <div className="page-toolbar">
        <div className="page-toolbar__tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? "tab-btn--active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <ExportButtons />
      </div>

      <div className="analytics-page__content">
        {tab === "orders" && <OrderAnalytics />}
        {tab === "drivers" && <DriverAnalytics />}
        {tab === "merchants" && <MerchantAnalytics />}
        {tab === "customers" && <CustomerAnalytics />}
      </div>
    </div>
  );
}
