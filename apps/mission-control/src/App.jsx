import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import DashboardPage from "./components/dashboard/DashboardPage";
import TripsPage from "./components/trips/TripsPage";
import MerchantsPage from "./components/merchants/MerchantsPage";
import DriversPage from "./components/drivers/DriversPage";
import CustomersPage from "./components/customers/CustomersPage";
import SupportPage from "./components/support/SupportPage";
import AnalyticsPage from "./components/analytics/AnalyticsPage";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  trips: "Trips",
  merchants: "Merchants",
  drivers: "Drivers",
  customers: "Customers",
  support: "Support",
  analytics: "Analytics",
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={setPage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="app__main">
        <TopBar
          title={PAGE_TITLES[page]}
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="app__content">
          {page === "dashboard" && <DashboardPage />}
          {page === "trips" && <TripsPage />}
          {page === "merchants" && <MerchantsPage />}
          {page === "drivers" && <DriversPage />}
          {page === "customers" && <CustomersPage />}
          {page === "support" && <SupportPage />}
          {page === "analytics" && <AnalyticsPage />}
        </div>
      </div>
    </div>
  );
}
