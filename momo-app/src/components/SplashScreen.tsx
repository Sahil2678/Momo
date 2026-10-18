"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200); // 1.2 second baad webapp show hoga

    return () => clearTimeout(timer);
  }, []);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0e0a08] text-white">
      {/* Center Logo */}
      <div className="relative h-28 w-28 overflow-hidden rounded-3xl border border-amber-500/20 shadow-2xl">
        <Image
          src="/icon-192.png"
          alt="RK MOMO"
          fill
          priority
          className="object-cover"
        />
      </div>

      {/* Logo ke Thik Niche Text */}
      <h1 className="mt-4 text-xl font-black tracking-wider text-amber-400 font-sans">
        RK <span className="text-white">MOMO</span>
      </h1>
      <p className="mt-1 text-xs text-zinc-400 tracking-wide font-medium">
        Wholesale & Retail
      </p>
    </div>
  );
}