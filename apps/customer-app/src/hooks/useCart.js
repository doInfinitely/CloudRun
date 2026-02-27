import { useReducer, useEffect } from "react";

const STORAGE_KEY = "cloudrun_cart";

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { storeId: null, storeName: null, items: [], tipCents: 0 };
}

function saveCart(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      // Single-store constraint: clear cart if different store
      if (state.storeId && state.storeId !== action.storeId) {
        return {
          storeId: action.storeId,
          storeName: action.storeName,
          items: [{ ...action.product, quantity: 1 }],
          tipCents: 0,
        };
      }
      const existing = state.items.find((i) => i.id === action.product.id);
      if (existing) {
        return {
          ...state,
          storeId: action.storeId,
          storeName: action.storeName,
          items: state.items.map((i) =>
            i.id === action.product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        ...state,
        storeId: action.storeId,
        storeName: action.storeName,
        items: [...state.items, { ...action.product, quantity: 1 }],
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.productId),
        ...(state.items.length <= 1
          ? { storeId: null, storeName: null }
          : {}),
      };
    case "UPDATE_QUANTITY": {
      if (action.quantity <= 0) {
        const newItems = state.items.filter((i) => i.id !== action.productId);
        return {
          ...state,
          items: newItems,
          ...(newItems.length === 0
            ? { storeId: null, storeName: null }
            : {}),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.productId ? { ...i, quantity: action.quantity } : i
        ),
      };
    }
    case "SET_TIP":
      return { ...state, tipCents: action.tipCents };
    case "CLEAR_CART":
      return { storeId: null, storeName: null, items: [], tipCents: 0 };
    default:
      return state;
  }
}

export default function useCart() {
  const [cart, dispatch] = useReducer(cartReducer, null, loadCart);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const subtotalCents = cart.items.reduce(
    (sum, i) => sum + i.price_cents * i.quantity,
    0
  );
  const taxCents = Math.round(subtotalCents * 0.0825);
  const feesCents = cart.items.length > 0 ? 299 : 0;
  const totalCents = subtotalCents + taxCents + feesCents + cart.tipCents;
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    cart,
    dispatch,
    subtotalCents,
    taxCents,
    feesCents,
    totalCents,
    itemCount,
  };
}
