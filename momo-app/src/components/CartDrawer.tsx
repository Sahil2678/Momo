"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { getWholesalePriceForItem } from "@/types/momo";
import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Bike,
  Sparkles,
  FileText,
} from "lucide-react";

import { generateFontStyles, normalizeSpecialFont } from "@/lib/font-styles";
import { downloadReceipt } from "@/lib/download-receipt";

export function CartDrawer() {
  const {
    cart,
    isOpen,
    closeCart,
    removeFromCart,
    updateQuantity,
    setQuantity,
    clearCart,
    subtotal,
    deliveryFee,
    totalAmount,
    totalWholesalePieces,
    isBulkOrder,
    isItemBulk,
  } = useCart();

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    businessName: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    message?: string;
    orderId?: string;
    receiptToken?: string;
    order?: {
      customer?: { name?: string; ownerName?: string; businessName?: string };
      total?: number;
      orderType?: string;
    };
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [receiptDownloaded, setReceiptDownloaded] = useState(false);
  // Local string values for quantity inputs — allows clearing before typing a new number
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    const marker = `${Date.now()}-${Math.random()}`;
    const currentState = window.history.state;
    const state =
      currentState && typeof currentState === "object" ? currentState : {};

    window.history.pushState({ ...state, __momoCartDrawer: marker }, "");

    let historyEntryPopped = false;
    const handlePopState = () => {
      historyEntryPopped = true;
      closeCart();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);

      if (
        !historyEntryPopped &&
        window.history.state?.__momoCartDrawer === marker
      ) {
        window.history.back();
      }
    };
  }, [isOpen, closeCart]);

  // When new items are added to the cart, automatically clear any previous orderSuccess
  // so the user immediately sees their cart instead of having to manually click "Order More Momos"
  React.useEffect(() => {
    if (cart.length > 0 && orderSuccess) {
      setOrderSuccess(null);
    }
  }, [cart.length, orderSuccess]);

  if (!isOpen) return null;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage("Your cart is empty. Please add delicious momos before ordering!");
      return;
    }

    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      setErrorMessage("Please complete all required fields (Name, Phone, Delivery Address).");
      return;
    }

    const cleanPhone = customer.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
          businessName: customer.businessName.trim() || undefined,
        },
        items: cart.map((ci) => {
          const pieceCount = ci.customPieces ? ci.customPieces * ci.quantity : ci.quantity * (ci.item.pieces || 8);
          return {
            id: ci.id,
            name: ci.item.name,
            variant: isBulkOrder ? `${pieceCount} Pieces (Bulk Rate)` : ci.variant,
            price: isBulkOrder ? getWholesalePriceForItem(ci.item) : ci.item.price,
            quantity: isBulkOrder ? pieceCount : ci.quantity,
            image: ci.item.image,
          };
        }),
        subtotal,
        deliveryFee,
        total: totalAmount,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm your order.");
      }

      setOrderSuccess(data);
      clearCart();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong while placing your order.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setOrderSuccess(null);
    setErrorMessage(null);
    setCustomer({ name: "", phone: "", address: "", businessName: "" });
    closeCart();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 md:backdrop-blur-sm transition-opacity duration-200"
        onClick={closeCart}
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6">
        <div className="w-screen max-w-md transform border-l border-white/10 bg-[#0c0c10] md:bg-zinc-950/95 md:backdrop-blur-2xl text-white shadow-2xl transition-transform duration-200 sm:max-w-lg">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Your Cart</h2>
                  <p className="text-xs text-zinc-400">
                    {totalWholesalePieces} pieces total {isBulkOrder ? "• Some items at bulk rates" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="rounded-xl border border-white/10 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bulk Discount Notice Banner */}
            {cart.length > 0 && !orderSuccess && (
              <div className="border-b border-white/5 px-6 py-3">
                {isBulkOrder ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>
                      <strong>Bulk Rate Active:</strong> Items with 500+ pieces get per-piece wholesale pricing.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      <span>
                        Add <strong>500 pieces</strong> of any single item to unlock its bulk wholesale rate!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            {orderSuccess ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-200">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                  {orderSuccess.order?.orderType === "bulk" ? "Bulk Order Confirmed" : "Order Placed Successfully"}
                </span>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-white">Order Confirmed!</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-sm">
                  {orderSuccess.message}
                </p>

                <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between py-1 text-zinc-400">
                    <span>Order Reference ID</span>
                    <span className="font-mono text-amber-400 font-semibold">{orderSuccess.orderId}</span>
                  </div>
                  <div className="flex justify-between py-1 text-zinc-400">
                    <span>Customer</span>
                    <span className="text-zinc-200">
                      {orderSuccess.order?.customer?.name || orderSuccess.order?.customer?.ownerName}
                      {orderSuccess.order?.customer?.businessName ? ` (${orderSuccess.order.customer.businessName})` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-zinc-400">
                    <span>Total Amount</span>
                    <span className="font-semibold text-white">₹{orderSuccess.order?.total}</span>
                  </div>
                </div>

                {orderSuccess.orderId && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!orderSuccess.orderId || isDownloadingReceipt) return;
                      setIsDownloadingReceipt(true);
                      const ok = await downloadReceipt(orderSuccess.orderId, {
                        receiptToken: orderSuccess.receiptToken,
                      });
                      setIsDownloadingReceipt(false);
                      if (ok) {
                        setReceiptDownloaded(true);
                        setTimeout(() => setReceiptDownloaded(false), 3000);
                      }
                    }}
                    disabled={isDownloadingReceipt}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50"
                  >
                    {isDownloadingReceipt ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                        Downloading Receipt...
                      </>
                    ) : receiptDownloaded ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Receipt Downloaded!
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 text-amber-400" />
                        Download PDF Receipt
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-zinc-950 transition hover:from-amber-400 hover:to-orange-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  Order More Momos
                </button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-y-auto px-6 py-4">
                {cart.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-500">
                      <ShoppingBag className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-200">Your cart is empty</h3>
                    <p className="mt-1 max-w-xs text-xs text-zinc-500">
                      Add delicious momos to place your order. Orders with 500+ pieces automatically receive bulk wholesale pricing!
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Item list */}
                    <div className="space-y-3.5 divide-y divide-white/5">
                      {cart.map((ci) => {
                        const itemPieces = ci.customPieces ? ci.customPieces * ci.quantity : ci.quantity * (ci.item.pieces || 8);
                        const perPieceBulk = getWholesalePriceForItem(ci.item);
                        const thisItemIsBulk = isItemBulk(ci);
                        const linePrice = thisItemIsBulk
                          ? perPieceBulk * itemPieces
                          : ci.item.price * ci.quantity;

                        return (
                          <div key={ci.id} className="flex gap-3 pt-3.5 first:pt-0">
                            {/* Item Image */}
                            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                              <Image
                                src={ci.item.image}
                                alt={ci.item.name}
                                fill
                                className="object-cover"
                              />
                            </div>

                            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                              {/* Name + Delete */}
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="text-[15px] font-semibold text-white leading-snug line-clamp-2">{ci.item.name}</h4>
                                <button
                                  onClick={() => removeFromCart(ci.id)}
                                  className="shrink-0 text-zinc-500 hover:text-rose-400 transition ml-1"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Variant + Price badge */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[15px] text-zinc-400">{ci.variant}</span>
                                {thisItemIsBulk ? (
                                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                    ₹{perPieceBulk}/pc (bulk)
                                  </span>
                                ) : (
                                  <span className="rounded bg-zinc-700/60 border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                                    ₹{(ci.item.price / (ci.item.pieces || 8)).toFixed(2)}/pc
                                  </span>
                                )}
                              </div>

                              {/* Price + Quantity row */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-amber-400 shrink-0">
                                  ₹{linePrice.toFixed(0)}
                                </span>

                                {/* Quantity Modifier with Direct Input Box */}
                                <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newQty = Math.max(1, ci.quantity - 1);
                                      updateQuantity(ci.id, -1);
                                      setInputValues((prev) => ({ ...prev, [ci.id]: String(newQty) }));
                                    }}
                                    className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition active:scale-90"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={inputValues[ci.id] !== undefined ? inputValues[ci.id] : String(ci.quantity)}
                                    onFocus={() =>
                                      setInputValues((prev) => ({ ...prev, [ci.id]: String(ci.quantity) }))
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/[^0-9]/g, "");
                                      setInputValues((prev) => ({ ...prev, [ci.id]: raw }));
                                      const val = parseInt(raw, 10);
                                      if (!isNaN(val) && val > 0) {
                                        setQuantity(ci.id, val);
                                      }
                                    }}
                                    onBlur={() => {
                                      const raw = inputValues[ci.id];
                                      const val = parseInt(raw ?? "", 10);
                                      if (isNaN(val) || val < 1) {
                                        setQuantity(ci.id, ci.quantity);
                                        setInputValues((prev) => ({ ...prev, [ci.id]: String(ci.quantity) }));
                                      } else {
                                        setInputValues((prev) => ({ ...prev, [ci.id]: String(val) }));
                                      }
                                    }}
                                    className="w-11 rounded-md bg-black/60 border border-white/10 py-0.5 text-center text-xs font-bold text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                    aria-label="Quantity"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateQuantity(ci.id, 1);
                                      setInputValues((prev) => ({ ...prev, [ci.id]: String(ci.quantity + 1) }));
                                    }}
                                    className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition active:scale-90"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Delivery Form */}
                    <div className="mt-8 border-t border-white/10 pt-6">
                      <h3 className="mb-3 text-sm font-semibold text-zinc-200 flex items-center gap-2">
                        <Bike className="h-4 w-4 text-amber-400" />
                        Delivery & Customer Details
                      </h3>

                      {errorMessage && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-[11px] font-medium text-zinc-400">
                              Your Name *
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowFontPicker(!showFontPicker)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>{showFontPicker ? "Hide Font Styles" : "✨ Special Font Styles"}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rahul Sharma"
                            value={customer.name}
                            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:bg-white/[0.06] focus:outline-none transition"
                          />

                          {/* Special Font Style Picker */}
                          {showFontPicker && (
                            <div className="mt-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.05] p-3 text-xs animate-in fade-in-50 zoom-in-95">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-amber-400">
                                  Tap a style to apply to your name:
                                </span>
                                {normalizeSpecialFont(customer.name) !== customer.name && (
                                  <button
                                    type="button"
                                    onClick={() => setCustomer({ ...customer, name: normalizeSpecialFont(customer.name) })}
                                    className="text-[10px] text-zinc-400 hover:text-white underline"
                                  >
                                    Reset Normal
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                {generateFontStyles(normalizeSpecialFont(customer.name) || "Sahil Kumar").map((style) => (
                                  <button
                                    type="button"
                                    key={style.id}
                                    onClick={() => {
                                      setCustomer({ ...customer, name: style.preview });
                                      setShowFontPicker(false);
                                    }}
                                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-xs text-zinc-200 transition-all hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300"
                                  >
                                    <span className="font-medium text-white">{style.preview}</span>
                                    <span className="text-[10px] text-zinc-500">{style.label.split("(")[0]}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                            Phone Number * <span className="text-zinc-500">(10 digits only)</span>
                          </label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            required
                            placeholder="e.g. 9876543210"
                            value={customer.phone}
                            onChange={(e) => {
                              const numbersOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setCustomer({ ...customer, phone: numbersOnly });
                            }}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:bg-white/[0.06] focus:outline-none transition tracking-wider font-mono"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                            Delivery Address *
                          </label>
                          <textarea
                            required
                            rows={2}
                            placeholder="Full delivery address, street, landmark..."
                            value={customer.address}
                            onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:bg-white/[0.06] focus:outline-none transition"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                            Business / Shop Name <span className="text-zinc-500">(Optional for bulk buyers)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Himalayan Delights Cafe"
                            value={customer.businessName}
                            onChange={(e) => setCustomer({ ...customer, businessName: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:bg-white/[0.06] focus:outline-none transition"
                          />
                        </div>
                      </form>
                    </div>

                    {/* Order summary breakdown */}
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-2">
                      <div className="flex justify-between text-zinc-400">
                        <span>Total Pieces</span>
                        <span className="font-medium text-white">{totalWholesalePieces} pcs</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Order Type</span>
                        <span className={`font-semibold ${isBulkOrder ? "text-emerald-400" : "text-amber-400"}`}>
                          {isBulkOrder ? "Bulk Wholesale (≥500 pcs rate)" : "Standard Retail"}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Subtotal</span>
                        <span className="font-medium text-white">₹{subtotal.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Delivery</span>
                        <span className="font-semibold text-emerald-400">FREE</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-bold text-white">
                        <span>Total Payable</span>
                        <span className="text-lg text-amber-400">₹{totalAmount.toFixed(0)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Footer with action */}
            {!orderSuccess && cart.length > 0 && (
              <div className="border-t border-white/10 p-6 bg-zinc-950/80 backdrop-blur-xl">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Place Order • ₹{totalAmount.toFixed(0)}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Fresh RK MOMO preparation • Live kitchen tracking</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
