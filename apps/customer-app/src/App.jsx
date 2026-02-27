import { useState, useCallback } from "react";
import useCart from "./hooks/useCart.js";
import BottomNav from "./components/BottomNav.jsx";
import StoreListPage from "./pages/StoreListPage.jsx";
import StoreDetailPage from "./pages/StoreDetailPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import OrderTrackingPage from "./pages/OrderTrackingPage.jsx";
import OrderHistoryPage from "./pages/OrderHistoryPage.jsx";

const CUSTOMER_ID = "cust_demo_001";

export default function App() {
  const [page, setPage] = useState("stores");
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const cartHook = useCart();

  const navigate = useCallback((pg, params) => {
    setPage(pg);
    if (pg === "store-detail" && params?.storeId) {
      setSelectedStoreId(params.storeId);
    }
    if (pg === "tracking" && params?.orderId) {
      setTrackingOrderId(params.orderId);
    }
  }, []);

  const handleTabChange = useCallback((tab) => {
    setPage(tab);
  }, []);

  let content;
  switch (page) {
    case "stores":
      content = <StoreListPage onSelectStore={(id) => navigate("store-detail", { storeId: id })} />;
      break;
    case "store-detail":
      content = (
        <StoreDetailPage
          storeId={selectedStoreId}
          cart={cartHook}
          onBack={() => setPage("stores")}
          onViewCart={() => setPage("cart")}
        />
      );
      break;
    case "cart":
      content = (
        <CartPage
          customerId={CUSTOMER_ID}
          cart={cartHook}
          onBack={() => setPage(selectedStoreId ? "store-detail" : "stores")}
          onCheckout={() => setPage("checkout")}
        />
      );
      break;
    case "checkout":
      content = (
        <CheckoutPage
          customerId={CUSTOMER_ID}
          cart={cartHook}
          onTrackOrder={(orderId) => navigate("tracking", { orderId })}
          onBack={() => setPage("cart")}
        />
      );
      break;
    case "tracking":
      content = (
        <OrderTrackingPage
          orderId={trackingOrderId}
          onBack={() => setPage("orders")}
        />
      );
      break;
    case "orders":
      content = (
        <OrderHistoryPage
          customerId={CUSTOMER_ID}
          onTrackOrder={(orderId) => navigate("tracking", { orderId })}
        />
      );
      break;
    default:
      content = <StoreListPage onSelectStore={(id) => navigate("store-detail", { storeId: id })} />;
  }

  const activeTab = ["stores", "store-detail"].includes(page)
    ? "stores"
    : ["orders", "tracking"].includes(page)
    ? "orders"
    : page;

  return (
    <div className="app-container">
      <div className="page-content">{content}</div>
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        cartCount={cartHook.itemCount}
      />
    </div>
  );
}
