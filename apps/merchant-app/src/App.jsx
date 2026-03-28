import { useState, useEffect } from "react";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import DashboardPage from "./components/dashboard/DashboardPage";
import OrdersPage from "./components/orders/OrdersPage";
import StorePage from "./components/store/StorePage";
import MenuPage from "./components/menu/MenuPage";
import SettingsPage from "./components/settings/SettingsPage";
import LoginPage from "./components/LoginPage";
import OnboardingWizard from "./components/OnboardingWizard";
import { getStores } from "./services/api";
import { getUser, clearAuth, saveUser } from "./services/auth";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  orders: "Orders",
  store: "Store",
  menu: "Stock",
  settings: "Settings",
};

export default function App() {
  const [user, setUser] = useState(getUser);
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stores, setStores] = useState([]);
  const [activeStore, setActiveStore] = useState(null);

  const merchantId = user?.id;

  useEffect(() => {
    if (!merchantId) return;
    getStores(merchantId)
      .then((s) => {
        setStores(s);
        if (s.length > 0) setActiveStore(s[0].id);
      })
      .catch(() => {});
  }, [merchantId]);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
  };

  if (!user) {
    return <LoginPage onAuth={setUser} />;
  }

  if (!user.onboarding_complete) {
    return (
      <OnboardingWizard
        user={user}
        onComplete={() => {
          const updated = { ...user, onboarding_complete: true };
          saveUser(updated);
          setUser(updated);
        }}
      />
    );
  }

  const storeName = stores.find((s) => s.id === activeStore)?.name || "";

  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={setPage}
        storeName={storeName}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />
      <div className="app__main">
        <TopBar
          title={PAGE_TITLES[page]}
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="app__content">
          {page === "dashboard" && <DashboardPage merchantId={merchantId} />}
          {page === "orders" && <OrdersPage merchantId={merchantId} storeId={activeStore} />}
          {page === "store" && <StorePage merchantId={merchantId} storeId={activeStore} />}
          {page === "menu" && <MenuPage merchantId={merchantId} storeId={activeStore} />}
          {page === "settings" && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}
