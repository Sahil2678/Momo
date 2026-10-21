"use client";

interface OfferBannerProps {
  onOpenOffer: () => void;
}

export function OfferBanner({ onOpenOffer }: OfferBannerProps) {
  return (
    <div 
      onClick={onOpenOffer}
      role="banner"
      className="relative z-50 cursor-pointer bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 px-2 sm:px-4 py-3 sm:py-3 text-white font-sans shadow-md border-b border-black/15 transition-colors hover:from-amber-600/95 hover:to-amber-600/95"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center text-center">
        {/* Main Offer Announcement */}
        <div className="flex items-center justify-center gap-1.5 min-w-0">
          
          <p className="text-[11px] min-[370px]:text-[12px] sm:text-xs md:text-sm font-medium leading-normal text-white">
            <span className="font-extrabold uppercase text-white mr-1 tracking-wide">Bulk Offer:- </span>
            <span>Veg </span>
            <span className="font-extrabold text-white bg-black/20 px-1 py-0.5 rounded underline decoration-amber-300">₹2.75</span>
            <span className="mx-1 text-amber-200/90 font-light">|</span>
            <span>Paneer </span>
            <span className="font-extrabold text-white bg-black/20 px-1 py-0.5 rounded underline decoration-amber-300">₹4</span>
            <span className="text-amber-100 ml-0.5">/pc</span>
            <span className="inline-block text-amber-200 font-semibold ml-1.5 whitespace-nowrap bg-black/20 px-1.5 py-0.5 rounded text-[10px] min-[370px]:text-[11px] sm:text-lg">
              (Min 500 pcs)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
