import { useState, useEffect } from "react";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import DashboardPage from "./components/dashboard/DashboardPage";
import OrdersPage from "./components/orders/OrdersPage";
import StorePage from "./components/store/StorePage";
import MenuPage from "./components/menu/MenuPage";
import SettingsPage from "./components/settings/SettingsPage";
import { getStores } from "./services/api";

const MERCHANT_ID = "merch_demo_001";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  orders: "Orders",
  store: "Store",
  menu: "Menu",
  settings: "Settings",
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stores, setStores] = useState([]);
  const [activeStore, setActiveStore] = useState(null);

  useEffect(() => {
    getStores(MERCHANT_ID)
      .then((s) => {
        setStores(s);
        if (s.length > 0) setActiveStore(s[0].id);
      })
      .catch(() => {});
  }, []);

  const storeName = stores.find((s) => s.id === activeStore)?.name || "";

  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={setPage}
        storeName={storeName}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="app__main">
        <TopBar
          title={PAGE_TITLES[page]}
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="app__content">
          {page === "dashboard" && <DashboardPage merchantId={MERCHANT_ID} />}
          {page === "orders" && <OrdersPage merchantId={MERCHANT_ID} storeId={activeStore} />}
          {page === "store" && <StorePage merchantId={MERCHANT_ID} storeId={activeStore} />}
          {page === "menu" && <MenuPage merchantId={MERCHANT_ID} storeId={activeStore} />}
          {page === "settings" && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}
