"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MomoItem, getWholesalePriceForItem } from "@/types/momo";
import { useCart } from "@/context/CartContext";
import { Plus, Check } from "lucide-react";

interface MomoCardProps {
  momo: MomoItem;
}

export function MomoCard({ momo }: MomoCardProps) {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = () => {
    addToCart(momo, `${momo.pieces} Pieces / Pack`);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 900);
  };

  const wholesaleRate = getWholesalePriceForItem(momo);

  const spiceBadgeColor = {
    Mild: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Hot: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "Extra Fiery": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  }[momo.spiceLevel || "Medium"];

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014] p-3.5 sm:p-5 sm:transition-all sm:duration-300 sm:hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-[0_15px_30px_-10px_rgba(245,158,11,0.15)] w-[82vw] max-w-[310px] shrink-0 snap-center sm:w-auto sm:max-w-none transform-gpu">
      {/* Top Media Container */}
      <div className="relative mb-3 sm:mb-4 h-44 sm:h-56 w-full overflow-hidden rounded-2xl bg-zinc-900">
        <Image
          src={momo.image}
          alt={momo.name}
          fill
          sizes="(max-width: 640px) 290px, (max-width: 1024px) 360px, 400px"
          loading="lazy"
          className="object-cover sm:transition-transform sm:duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Badges Overlay */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {momo.badge && (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-zinc-950 shadow-md">
              {momo.badge}
            </span>
          )}
          {momo.spiceLevel && (
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${spiceBadgeColor} bg-zinc-950/80`}>
              {momo.spiceLevel}
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-zinc-300">
          <span className="rounded-lg bg-black/80 px-2.5 py-1 font-medium text-zinc-200">
            {momo.pieces} Pcs / Pack
          </span>
          <span className="rounded-lg bg-black/80 px-2.5 py-1 font-semibold text-emerald-300">
            ₹{wholesaleRate}/pc (500+)
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col">
        <div className="mb-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-white transition-colors group-hover:text-amber-400 sm:text-xl">
              {momo.name}
            </h3>
            <div className="flex items-center">
              <span className="flex h-4 w-4 items-center justify-center rounded border border-emerald-500 p-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-medium text-amber-400/90 italic">
            {momo.tagline}
          </p>
        </div>

        <p className="mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none text-xs leading-relaxed text-zinc-400 sm:text-sm">
          {momo.description}
        </p>

        {/* Ingredient Chips */}
        <div className="mb-4 sm:mb-5 flex flex-wrap gap-1.5">
          {momo.ingredients.map((ing, i) => (
            <span
              key={i}
              className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-zinc-400 border border-white/5"
            >
              {ing}
            </span>
          ))}
        </div>

        {/* Price & Add to Cart Action */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
          <div>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-xs sm:text-sm font-semibold text-amber-500">₹</span>
              <span className="text-xl sm:text-2xl font-black text-white">{momo.price}</span>
              <span className="text-[10px] sm:text-xs text-zinc-400">/{momo.pieces} pcs</span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-emerald-400 block">
              Bulk: ₹{wholesaleRate}/pc (≥500)
            </span>
          </div>

          <button
            onClick={handleAdd}
            className={`group/btn relative inline-flex items-center gap-1.5 sm:gap-2 overflow-hidden rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 active:scale-95 ${
              isAdded
                ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                : "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 hover:from-amber-400 hover:to-orange-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-scale-in" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover/btn:rotate-90" />
                <span className="whitespace-nowrap">Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
