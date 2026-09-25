import { createContext, useContext, useState, type ReactNode } from "react";
import type { Listing } from "../lib/sdk";

/**
 * In-memory, session-scoped cart — not persisted to localStorage or
 * anywhere else, resets on a full page reload. Deliberately simple:
 * this exists to actually exercise capabilities.core.order's own
 * multi-line CreateOrderDto (already built, never actually used by
 * anything until now — BuyForm's own createOrder() call has always
 * sent exactly one line), not to be a full e-commerce-grade cart.
 *
 * Stores the full Listing object per item, not just its id — the
 * cart page can render without a second fetch, at the cost of a
 * stale price/title if the listing changes while sitting in the
 * cart. An acceptable tradeoff for a session-scoped cart.
 */

export interface CartItem {
  listing: Listing;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (listing: Listing, quantity?: number) => void;
  removeItem: (listingId: string) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  clear: () => void;
  totalCount: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (listing: Listing, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.listing.id === listing.id);
      if (existing) {
        return prev.map((i) =>
          i.listing.id === listing.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { listing, quantity }];
    });
  };

  const removeItem = (listingId: string) => {
    setItems((prev) => prev.filter((i) => i.listing.id !== listingId));
  };

  const updateQuantity = (listingId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(listingId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.listing.id === listingId ? { ...i, quantity } : i)),
    );
  };

  const clear = () => setItems([]);

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clear, totalCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
