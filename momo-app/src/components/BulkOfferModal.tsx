"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  X,
  ShoppingBag,
  CheckCircle2,
  ShieldCheck,
  Truck,
  ArrowRight,
  PhoneCall,
  Clock,
  Layers,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { MomoItem } from "@/types/momo";

interface BulkOfferModalProps {
  momos?: MomoItem[];
  isOpenOverride?: boolean;
  onCloseOverride?: () => void;
}

export function BulkOfferModal({
  momos = [],
  isOpenOverride,
  onCloseOverride,
}: BulkOfferModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [addedItem, setAddedItem] = useState<string | null>(null);
  const { addBulkOffer, openCart } = useCart();

  // Auto-open on initial website load
  useEffect(() => {
    if (typeof isOpenOverride === "boolean") {
      setIsOpen(isOpenOverride);
      return;
    }

    // Check if user already saw it in this session
    const hasSeen = sessionStorage.getItem("momo_bulk_offer_seen");
    // Show with a smooth slight delay for high-impact entrance
    const timer = setTimeout(() => {
      if (!hasSeen) {
        setIsOpen(true);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [isOpenOverride]);

  const handleClose = useCallback(() => {
    sessionStorage.setItem("momo_bulk_offer_seen", "true");
    setIsOpen(false);
    if (onCloseOverride) onCloseOverride();
  }, [onCloseOverride]);

  // Close with Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Find veg and paneer items from props or create reliable fallback representations
  const vegMomo: MomoItem = momos.find(
    (m) => m.id === "classic-veg-steam" || (m.isVeg && !m.name.toLowerCase().includes("paneer"))
  ) || {
    id: "classic-veg-steam",
    name: "Classic Himalayan Veg Steam",
    tagline: "Thin translucent skin, pure mountain herbs",
    description: "Finely minced fresh garden cabbage, mountain mushrooms and scallions.",
    price: 189,
    wholesalePricePerPiece: 2.75,
    rating: 4.9,
    reviewCount: 420,
    pieces: 8,
    spiceLevel: "Mild",
    category: "Steamed",
    badge: "Bestseller",
    isVeg: true,
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80",
    ingredients: ["Garden Veggies", "Mountain Herbs"],
  };

  const paneerMomo: MomoItem = momos.find(
    (m) => m.name.toLowerCase().includes("paneer")
  ) || {
    id: "spicy-paneer-fry",
    name: "Crispy Spicy Paneer Wok-Fry",
    tagline: "Farm fresh malai paneer with smoky Schezwan glaze",
    description: "Packed with diced fresh malai paneer, crushed bell peppers and spices.",
    price: 229,
    wholesalePricePerPiece: 3.75,
    rating: 4.8,
    reviewCount: 310,
    pieces: 8,
    spiceLevel: "Medium",
    category: "Crispy Fried",
    badge: "Chef's Pick",
    isVeg: true,
    image: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80",
    ingredients: ["Malai Paneer", "Crisp Capsicum"],
  };

  const handleClaimOffer = (item: MomoItem, pieces: number) => {
    addBulkOffer(item, pieces);
    setAddedItem(item.name);
    setTimeout(() => {
      setAddedItem(null);
      handleClose();
      openCart();
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop with rich blur */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl my-auto overflow-hidden rounded-3xl border border-amber-500/40 bg-zinc-950/95 shadow-[0_0_60px_rgba(245,158,11,0.25)] text-white backdrop-blur-2xl transition-all duration-300 animate-in zoom-in-95">
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-44 w-96 rounded-full bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-rose-500/20 blur-[90px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close offer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-5 sm:p-8">
          {/* Header Tag & Title */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <span>Limited Period Bulk Deal</span>
            </div>

            <h2 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Bulk Order Dhamaka! <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                Veg ₹2.75 & Paneer ₹3.75 / piece
              </span>
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto">
              Restaurants, cafes, cloud kitchens aur events ke liye sabse sasta wholesale rate! Fresh Himalayan handcrafted momos direct kitchen se.
            </p>
          </div>

          {/* Condition Highlight Box */}
          <div className="mt-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 p-3.5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-amber-300">
              <Layers className="h-4 w-4 text-amber-400 shrink-0" />
              <span>शर्त / Requirement: Minimum 500 Pieces order zaroori hai</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              500 pieces ya usse zyada order karne par yeh wholesale rate automatically apply ho jata hai.
            </p>
          </div>

          {/* Product Offer Cards Grid */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Veg Momo Card */}
            <div className="relative group overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.08] to-white/[0.02] p-4 transition-all hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    VEG SPECIAL
                  </span>
                  <h3 className="mt-1.5 text-base sm:text-lg font-bold text-white leading-snug">
                    Himalayan Veg Momo
                  </h3>
                </div>
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10">
                  <Image
                    src={vegMomo.image}
                    alt="Veg Momo"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Price Details */}
              <div className="mt-3 rounded-xl bg-black/40 p-3 border border-white/5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-400">Wholesale Rate:</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-400">₹2.75</span>
                    <span className="text-xs text-zinc-400">/ piece</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/5 pt-1.5">
                  <span>500 Pcs Total:</span>
                  <span className="font-bold text-white">₹1,375 Only</span>
                </div>
              </div>

              {/* Quick Add Button */}
              <button
                onClick={() => handleClaimOffer(vegMomo, 500)}
                className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-zinc-950 transition-all duration-300 hover:bg-emerald-400 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {addedItem === vegMomo.name ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Order 500 Veg Pcs (₹1,375)</span>
                  </>
                )}
              </button>
            </div>

            {/* Paneer Momo Card */}
            <div className="relative group overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] to-white/[0.02] p-4 transition-all hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                    MALAI PANEER
                  </span>
                  <h3 className="mt-1.5 text-base sm:text-lg font-bold text-white leading-snug">
                    Fresh Paneer Momo
                  </h3>
                </div>
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10">
                  <Image
                    src={paneerMomo.image}
                    alt="Paneer Momo"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Price Details */}
              <div className="mt-3 rounded-xl bg-black/40 p-3 border border-white/5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-400">Wholesale Rate:</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-amber-400">₹3.75</span>
                    <span className="text-xs text-zinc-400">/ piece</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/5 pt-1.5">
                  <span>500 Pcs Total:</span>
                  <span className="font-bold text-white">₹1,875 Only</span>
                </div>
              </div>

              {/* Quick Add Button */}
              <button
                onClick={() => handleClaimOffer(paneerMomo, 500)}
                className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-zinc-950 transition-all duration-300 hover:from-amber-400 hover:to-orange-400 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                {addedItem === paneerMomo.name ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Order 500 Paneer Pcs (₹1,875)</span>
                  </>
                )}
              </button>
            </div>
          </div>
{/* <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center"> in future use ke liye */}
          {/* Features / Assurance Row */}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-center">
            {/* <div className="flex flex-col items-center gap-1">
              <Truck className="h-4 w-4 text-emerald-400" />
              <span className="text-[10px] sm:text-xs text-zinc-300 font-medium">Free Doorstep Delivery</span>
            </div> */}
            <div className="flex flex-col items-center gap-1">
              <a
              href="tel:+918010630604"
              className="inline-flex items-center sm:gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition sm:mt-5"
            >
              <PhoneCall className="h-4 w-4 text-amber-400" />
              <span className="text-[11px] sm:text-xs text-zinc-300 font-medium">Direct Bulk Call:+918010630604</span>
            </a>
            </div>
            
            {/* <div className="flex flex-col items-center gap-1">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-[10px] sm:text-xs text-zinc-300 font-medium">24-48h Fresh Dispatch</span>
            </div> */}
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-sky-400" />
              <span className="text-[11px] sm:text-xs text-zinc-300 font-medium">Hygienic Preparation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
