"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { MomoItem, getWholesalePriceForItem } from "@/types/momo";

export interface CartItem {
  id: string;
  item: MomoItem;
  quantity: number;
  variant: string; // e.g. "Regular 8 Pcs"
  customPieces?: number; // total pieces per bulk unit
}

interface CartContextType {
  cart: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (item: MomoItem, variant?: string) => void;
  addBulkOffer: (item: MomoItem, totalPieces?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItemsCount: number;
  totalWholesalePieces: number;
  isBulkOrder: boolean;
  isItemBulk: (ci: CartItem) => boolean;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  // Load cart from localStorage on initial render
  useEffect(() => {
    try {
      const saved = localStorage.getItem("momo_artisan_cart");
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load cart", e);
    } finally {
      setIsCartLoaded(true);
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (!isCartLoaded) return;

    try {
      localStorage.setItem("momo_artisan_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart", e);
    }
  }, [cart, isCartLoaded]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addToCart = (item: MomoItem, variant: string = "Standard Portion") => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((ci) => ci.id === item.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      } else {
        return [...prev, { id: item.id, item, quantity: 1, variant }];
      }
    });
    setIsOpen(true);
  };

  const addBulkOffer = (item: MomoItem, totalPieces: number = 500) => {
    const bulkId = `${item.id}-bulk-${totalPieces}`;
    setCart((prev) => {
      const existingIndex = prev.findIndex((ci) => ci.id === bulkId);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      } else {
        return [
          ...prev,
          {
            id: bulkId,
            item,
            quantity: 1,
            customPieces: totalPieces,
            variant: `Bulk Wholesale Pack (${totalPieces} Pcs)`,
          },
        ];
      }
    });
    setIsOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((ci) => {
          if (ci.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const setQuantity = (itemId: string, quantity: number) => {
    setCart((prev) => {
      return prev
        .map((ci) => {
          if (ci.id === itemId) {
            const newQty = Math.max(0, Math.floor(quantity));
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItemsCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  // Total pieces across all items (for display only)
  const totalWholesalePieces = cart.reduce(
    (acc, curr) =>
      acc + (curr.customPieces ? curr.customPieces * curr.quantity : curr.quantity * (curr.item.pieces || 8)),
    0
  );

  // Per-item bulk check: this item qualifies for bulk pricing only if IT ALONE has 500+ pieces
  const getItemPieces = (ci: CartItem) =>
    ci.customPieces ? ci.customPieces * ci.quantity : ci.quantity * (ci.item.pieces || 8);

  const isItemBulk = (ci: CartItem) => getItemPieces(ci) >= 500;

  // isBulkOrder = true only if at least one item has 500+ pieces (for banner logic)
  const isBulkOrder = cart.some((ci) => isItemBulk(ci));

  // Subtotal: each item priced individually — bulk rate only if that item alone has 500+ pieces
  const subtotal = cart.reduce((acc, ci) => {
    const pieces = getItemPieces(ci);
    if (isItemBulk(ci)) {
      const perPieceRate = getWholesalePriceForItem(ci.item);
      return acc + perPieceRate * pieces;
    }
    return acc + ci.item.price * ci.quantity;
  }, 0);

  const deliveryFee = 0; // Free delivery for all orders
  const totalAmount = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        openCart,
        closeCart,
        addToCart,
        addBulkOffer,
        removeFromCart,
        updateQuantity,
        setQuantity,
        clearCart,
        totalItemsCount,
        totalWholesalePieces,
        isBulkOrder,
        isItemBulk,
        subtotal,
        deliveryFee,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
