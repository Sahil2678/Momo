"use client";

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean(navigator.standalone));

    if (isInstalled) {
      localStorage.removeItem("pwa_install_pending");
    } else if (localStorage.getItem("pwa_install_pending") === "true") {
      setShowBanner(true);
    }

    // 1. Register Service Worker with Auto-Update Detection
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("PWA Service Worker registered:", reg.scope);

          // Auto-check for new updates on every page view
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // Silent reload to activate updated React code/styles automatically
                  window.location.reload();
                }
              };
            }
          };
        })
        .catch((err) => console.warn("PWA Service Worker registration failed:", err));
    }

    // 2. Listen for Install Prompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (isInstalled) return;
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Only show banner if not dismissed previously
      if (!sessionStorage.getItem("pwa_prompt_dismissed")) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      localStorage.removeItem("pwa_install_pending");
      setInstallPrompt(null);
      setShowBanner(false);
      setShowInstallHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    localStorage.setItem("pwa_install_pending", "true");
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === "accepted") {
      localStorage.removeItem("pwa_install_pending");
      setShowBanner(false);
      return;
    }

    localStorage.setItem("pwa_install_pending", "true");
    setShowBanner(true);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-xl shadow-lg shadow-amber-500/20">
              🥟
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Install RK MOMO App</h4>
              <p className="text-[11px] text-zinc-400">Order faster directly from your home screen!</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-xl p-1.5 text-zinc-500 hover:text-white transition"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showInstallHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onClick={() => setShowInstallHelp(false)}
        >
          <section
            className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-zinc-950 p-5 text-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="pwa-install-help-title" className="text-base font-bold">Install RK MOMO</h2>
              <button
                onClick={() => setShowInstallHelp(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-white"
                aria-label="Close install instructions"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300">
              Browser ne install prompt band kar diya. Install karne ke liye browser menu
              (⋮) kholen aur <strong className="text-white">Install app</strong> ya{" "}
              <strong className="text-white">Add to Home screen</strong> chunein.
            </p>
            <button
              onClick={() => setShowInstallHelp(false)}
              className="mt-5 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400"
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </>
  );
}