"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Soup, Lock, User, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Invalid credentials. Please try again.");
        return;
      }

      const from = searchParams.get("from") ?? "/dashboard";
      router.push(from);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070709] px-4">
      {/* Animated Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-tr from-amber-600/20 via-orange-600/15 to-transparent blur-[150px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[500px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute top-[30%] left-[-5%] h-[300px] w-[400px] rounded-full bg-orange-600/8 blur-[100px]" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-md transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-amber-500/20 to-transparent blur-xl opacity-60" />

        <div className="relative rounded-3xl border border-white/[0.10] bg-[#0c0c0e]/90 p-8 shadow-2xl backdrop-blur-2xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 shadow-[0_0_40px_rgba(245,158,11,0.5)]">
                <Soup className="h-9 w-9 text-zinc-950" />
              </div>
              <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#0c0c0e]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black tracking-tight text-white">
                RK <span className="text-amber-500">MOMO</span>
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Admin Dashboard
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-zinc-500">Sign in to manage your momo catalog & orders</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  id="dashboard-username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-amber-500/50 focus:bg-amber-500/5 focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  id="dashboard-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] py-3 pl-10 pr-11 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-amber-500/50 focus:bg-amber-500/5 focus:ring-1 focus:ring-amber-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-300 hover:opacity-90 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <p className="text-[11px] text-zinc-600">
              Secured with HMAC-signed httpOnly session cookies. Access is limited to authorized
              admins only.
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function DashboardLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#070709] text-zinc-600">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

