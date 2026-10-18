"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import type { MomoItem } from "@/types/momo";
import { MomoCard } from "@/components/MomoCard";
import { CartDrawer } from "@/components/CartDrawer";
import { BulkOfferModal } from "@/components/BulkOfferModal";
import { OfferBanner } from "@/components/OfferBanner";
import { useCart } from "@/context/CartContext";
import { MomoIcon } from '@/components/CustomIcon/MomoIcon';
import {
  ShoppingBag,
  Soup,
  PhoneCall,
  MapPin,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";

const CATEGORIES = ["All", "Steamed", "Crispy Fried", "Tandoori & Grill", "Signature Specials"];

export default function MomoHomePage() {
  const { openCart, cart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [momos, setMomos] = useState<MomoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  // Fetch momos from MongoDB
  useEffect(() => {
    fetch("/api/momos")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setMomos(data.momos);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredMomos =
    selectedCategory === "All"
      ? momos
      : momos.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 selection:bg-amber-500 selection:text-black">
      {/* Top Sticky Announcement Banner */}
      <OfferBanner onOpenOffer={() => setIsOfferModalOpen(true)} />

      {/* Background ambient glow effect (GPU-accelerated for smooth mobile scrolling) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[350px] sm:h-[500px] w-[500px] sm:w-[900px] rounded-full bg-gradient-to-tr from-amber-600/15 via-orange-600/15 to-transparent blur-[70px] sm:blur-[140px] transform-gpu will-change-transform" />
        <div className="absolute top-[40%] right-[-10%] h-[300px] sm:h-[400px] w-[350px] sm:w-[500px] rounded-full bg-amber-500/10 blur-[60px] sm:blur-[130px] transform-gpu will-change-transform" />
      </div>

      {/* Floating Modern Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#070709]/10 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3.5 lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 shadow-[0_0_25px_rgba(245,158,11,0.35)]">
  {/* Icon size ko h-6 aur sm:h-7 kiya hai taaki box me sahi se fit ho */}
  <MomoIcon className="h-6 w-6 sm:h-7 sm:w-7 text-zinc-950" />
</div>

            <div>
              <div className="flex items-center">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white font-sans">
                  RK<span className="text-amber-500 font-extrabold">MOMO</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 tracking-wide">
                Authentic Handcrafted Momos
              </p>
            </div>
          </div>

          {/* Quick Info & Cart Button */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={openCart}
              className="relative flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:border-amber-400 hover:bg-amber-500/20 active:scale-95"
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5 text-amber-400" />
                {cart.length > 0 && (
                  <span className="absolute -right-2.5 -top-2.5 flex min-w-[20px] h-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-1 text-[10px] font-black text-zinc-950 shadow-md">
                    {cart.length > 99 ? "99+" : cart.length}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Wholesale Cart</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Showcase Section */}
      <section className="relative overflow-hidden px-4 pt-6 pb-8 sm:pt-12 sm:pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-8 lg:gap-12 lg:grid-cols-12">
            <div className="space-y-4 sm:space-y-6 lg:col-span-7">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-6xl sm:leading-[1.1] leading-[1.15]">
                Bulk Handcrafted <br />
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                  Momo Supply
                </span>{" "}
                for Restaurants.
              </h1>

              <p className="max-w-xl text-xs sm:text-lg text-zinc-400 sm:leading-relaxed leading-relaxed">
                Trusted wholesale momos for cafes, cloud kitchens, and hospitality partners. Clean
                supply, fixed wholesale pricing, and dependable daily fulfillment.
              </p>

              {/* Special Bulk Offer Card in Hero (Hidden on mobile, only desktop) */}
              <div className="hidden md:block relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-4 sm:p-4 backdrop-blur-xl shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                        Limited Bulk Pricing
                      </span>
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                        Min. 500 Pcs
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Veg Momo: <strong className="text-emerald-400">₹2.75/pc</strong></span>
                      <span className="text-zinc-500">•</span>
                      <span>Paneer Momo: <strong className="text-amber-400">₹3.75/pc</strong></span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Bulk order requirement: 500 pieces minimum per order. Direct kitchen dispatch.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOfferModalOpen(true)}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-zinc-950 transition hover:from-amber-400 hover:to-orange-400 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  >
                    Claim Offer Now
                  </button>
                </div>
              </div>

              {/* Trust Badges (Compact & clean on mobile) */}
              {/* <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-lg pt-1">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-2.5 sm:p-3 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs sm:text-sm">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> 24-48h
                  </div>
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-zinc-400">Dispatch SLA</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-2.5 sm:p-3 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs sm:text-sm">
                    <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> 100% Pure
                  </div>
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-zinc-400">Mountain spices</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-2.5 sm:p-3 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs sm:text-sm">
                    <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Certified
                  </div>
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-zinc-400">Food safety</p>
                </div>
              </div> */}
            </div>

            {/* Hero Visual Card */}
            <div className="relative lg:col-span-5">
              <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-transparent p-2.5 sm:p-3 shadow-2xl backdrop-blur-2xl">
                <div className="relative h-60 sm:h-96 w-full overflow-hidden rounded-2xl">
                  <Image
                    src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80"
                    alt="Artisan Steamed Momos"
                    fill
                    priority
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-400">
                        Best Seller
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-lg sm:text-xl font-bold text-white">Mountain Herb Veg Steam</h3>
                    <p className="text-[11px] sm:text-xs text-zinc-300">Wholesale pack • 8 pcs / pack • ₹2.75 / piece</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Showcase Section */}
      <section id="menu-section" className="relative mx-auto max-w-7xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-10 flex flex-col items-start md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">
                <UtensilsCrossed className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Curated Menu
              </div>
              <h2 className="mt-1 text-xl sm:text-4xl font-extrabold tracking-tight text-white">
                Wholesale Momo Catalog
              </h2>
            </div>
          </div>

          {/* Category Filter Pills (Horizontal on mobile) */}
          <div className="flex w-full md:w-auto items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 -mx-4 px-4 sm:mx-0 sm:px-1.5 sm:flex-wrap rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === cat
                    ? "bg-amber-500 text-zinc-950 shadow-md"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Container (Horizontal swipeable on mobile, grid on desktop) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-zinc-600">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500/50" />
            <p className="text-sm">Loading menu from kitchen…</p>
          </div>
        ) : filteredMomos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-600">
            <Soup className="h-10 w-10" />
            <p className="text-sm">No momos in this category yet.</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 pt-6 -mx-4 px-4 no-scrollbar sm:mx-0 sm:px-0 sm:grid sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMomos.map((momo) => (
              <MomoCard key={momo.id} momo={momo} />
            ))}
          </div>
        )}
      </section>

      {/* Footer & Story */}
      <footer className="mt-20 border-t border-white/10 bg-black/60 px-4 py-12 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <div className="text-lg font-bold text-white">
              RK<span className="text-amber-500">MOMO</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Bulk-ready frozen/fresh production for restaurants, cafes, and cloud kitchens.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5 text-amber-400" /> +91 99887 76655
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-400" /> CHAPRA, SARAN BIHAR
            </span>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} RK MOMO Inc. All rights reserved.
        </div>
      </footer>

      {/* Global Slide-Over Cart Drawer */}
      <CartDrawer />

      {/* Auto-Opening Bulk Offer Modal (Opens immediately on load) */}
      <BulkOfferModal
        momos={momos}
        isOpenOverride={isOfferModalOpen ? true : undefined}
        onCloseOverride={() => setIsOfferModalOpen(false)}
      />
    </div>
  );
}
