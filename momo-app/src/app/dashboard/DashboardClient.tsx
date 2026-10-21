"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Soup,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronDown,
  Search,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  Loader2,
  UploadCloud,
  Flame,
  Leaf,
  LogOut,
  Bell,
  FileText,
  Menu,
} from "lucide-react";
import { normalizeSpecialFont } from "@/lib/font-styles";
import { downloadReceipt } from "@/lib/download-receipt";

// ─── Types ────────────────────────────────────────────────────────────────────

type SpiceLevel = "Mild" | "Medium" | "Hot" | "Extra Fiery";
type Category = "Steamed" | "Crispy Fried" | "Tandoori & Grill" | "Signature Specials";
type OrderStatus = "pending" | "confirmed" | "preparing" | "delivered" | "cancelled";

interface MomoItem {
  _id?: string;
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  wholesalePricePerPiece?: number;
  rating: number;
  reviewCount: number;
  pieces: number;
  spiceLevel: SpiceLevel;
  category: Category;
  badge?: string;
  isVeg: boolean;
  image: string;
  ingredients: string[];
}

interface OrderItem {
  id: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Order {
  _id: string;
  customer: {
    name?: string;
    businessName?: string;
    ownerName?: string;
    phone: string;
    address: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paidAmount?: number;
  bakiAmount?: number;
  paymentStatus?: "Pending" | "Paid" | "Scheduled" | "Partially Paid";
  totalPieces?: number;
  orderType?: "retail" | "bulk";
  status: OrderStatus;
  scheduledDate?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPICE_LEVELS: SpiceLevel[] = ["Mild", "Medium", "Hot", "Extra Fiery"];
const CATEGORIES: Category[] = ["Steamed", "Crispy Fried", "Tandoori & Grill", "Signature Specials"];
const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "delivered", "cancelled"];



const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  confirmed: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  preparing: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  delivered: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  cancelled: "text-rose-400 bg-rose-500/10 border-rose-500/30",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  Paid: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  Scheduled: "text-purple-400 bg-purple-500/15 border-purple-500/30",
  "Partially Paid": "text-blue-400 bg-blue-500/15 border-blue-500/30",
  Pending: "text-amber-400 bg-amber-500/15 border-amber-500/30",
};

const EMPTY_MOMO: Omit<MomoItem, "_id"> = {
  id: "",
  name: "",
  tagline: "",
  description: "",
  price: 199,
  wholesalePricePerPiece: 3,
  rating: 4.5,
  reviewCount: 0,
  pieces: 8,
  spiceLevel: "Mild",
  category: "Steamed",
  badge: "",
  isVeg: true,
  image: "",
  ingredients: ["", "", "", ""],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function decodeVapidPublicKey(publicKey: string): ArrayBuffer {
  const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
  const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index++) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes.buffer;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl backdrop-blur-xl animate-slide-up ${
        type === "success"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-rose-500/40 bg-rose-500/10 text-rose-300"
      }`}
    >
      {type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl hover:border-white/[0.14] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ─── Momo Form Modal ──────────────────────────────────────────────────────────

function MomoFormModal({
  initial,
  onSave,
  onClose,
  isSaving,
}: {
  initial: Partial<MomoItem> | null;
  onSave: (data: Omit<MomoItem, "_id">) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<Omit<MomoItem, "_id">>({
    ...EMPTY_MOMO,
    ...initial,
    ingredients: initial?.ingredients?.length ? [...initial.ingredients] : ["", "", "", ""],
  });

  const isEdit = Boolean(initial && (initial as MomoItem)._id);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleNameChange = (v: string) => {
    set("name", v);
    if (!isEdit) set("id", slugify(v));
  };

  const setIngredient = (i: number, v: string) => {
    const arr = [...form.ingredients];
    arr[i] = v;
    set("ingredients", arr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean: Omit<MomoItem, "_id"> = {
      ...form,
      price: Number(form.price),
      pieces: Number(form.pieces),
      wholesalePricePerPiece: Number(form.wholesalePricePerPiece ?? 3),
      ingredients: form.ingredients.filter(Boolean),
      badge: form.badge || undefined,
    };
    onSave(clean);
  };

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all";
  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0e0e10] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#0e0e10] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
              <Soup className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-white">{isEdit ? "Edit Momo" : "Add New Momo"}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
          {/* Name + ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                className={inputCls}
                placeholder="Classic Himalayan Veg Steam"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls}>ID (slug) *</label>
              <input
                className={inputCls}
                placeholder="classic-himalayan-veg-steam"
                value={form.id}
                onChange={(e) => set("id", e.target.value)}
                disabled={isEdit}
                required
              />
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label className={labelCls}>Tagline *</label>
            <input
              className={inputCls}
              placeholder="Short catchy description…"
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description *</label>
            <textarea
              className={`${inputCls} min-h-[80px] resize-none`}
              placeholder="Detailed description of the momo…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              required
            />
          </div>

          {/* Price + Pieces + Rating + Reviews */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Price (₹) *</label>
              <input
                type="number"
                className={inputCls}
                min={1}
                step={0.01}
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Pieces *</label>
              <input
                type="number"
                className={inputCls}
                min={1}
                value={form.pieces}
                onChange={(e) => set("pieces", Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Rating</label>
              <input
                type="number"
                className={inputCls}
                min={0}
                max={5}
                step={0.1}
                value={form.rating}
                onChange={(e) => set("rating", Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelCls}>Reviews</label>
              <input
                type="number"
                className={inputCls}
                min={0}
                value={form.reviewCount}
                onChange={(e) => set("reviewCount", Number(e.target.value))}
              />
            </div>
          </div>

          {/* Bulk Wholesale Pricing Option */}
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Bulk Wholesale Price (per piece for ≥ 500 pcs) *
              </label>
              <span className="text-[11px] text-zinc-500">Auto-applies when customer orders 500+ pcs</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">₹</span>
                <input
                  type="number"
                  step="0.25"
                  min="0.5"
                  className={`${inputCls} pl-8 font-semibold text-white border-emerald-500/30 focus:border-emerald-400`}
                  placeholder="3.00"
                  value={form.wholesalePricePerPiece ?? 3}
                  onChange={(e) => set("wholesalePricePerPiece", Number(e.target.value))}
                  required
                />
              </div>
              <span className="text-xs font-medium text-emerald-300">/ piece in bulk</span>
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">
              For bulk buyers ordering 500+ pieces, each momo will be charged at this per-piece rate (e.g. ₹{form.wholesalePricePerPiece ?? 3} × 500 pcs = ₹{((form.wholesalePricePerPiece ?? 3) * 500).toLocaleString()}).
            </p>
          </div>

          {/* Spice + Category + Badge */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Spice Level *</label>
              <div className="relative">
                <select
                  className={`${inputCls} appearance-none pr-8`}
                  value={form.spiceLevel}
                  onChange={(e) => set("spiceLevel", e.target.value as SpiceLevel)}
                >
                  {SPICE_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Category *</label>
              <div className="relative">
                <select
                  className={`${inputCls} appearance-none pr-8`}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value as Category)}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Badge</label>
              <input
                className={inputCls}
                placeholder="Bestseller, Trending 🔥…"
                value={form.badge ?? ""}
                onChange={(e) => set("badge", e.target.value)}
              />
            </div>
          </div>

          {/* Veg Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("isVeg", !form.isVeg)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isVeg ? "bg-emerald-500" : "bg-rose-500"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  form.isVeg ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {form.isVeg ? (
                <><Leaf className="h-4 w-4 text-emerald-400" /><span className="text-emerald-400">Vegetarian</span></>
              ) : (
                <><Flame className="h-4 w-4 text-rose-400" /><span className="text-rose-400">Non-Veg</span></>
              )}
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className={labelCls}>Image URL *</label>
            <div className="flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                placeholder="https://images.unsplash.com/…"
                value={form.image}
                onChange={(e) => set("image", e.target.value)}
                required
              />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-600">
                <UploadCloud className="h-4 w-4" />
              </div>
            </div>
            {form.image && (
              <div className="mt-2 h-24 w-full overflow-hidden rounded-xl">
                <Image src={form.image} alt="Preview" width={400} height={96} className="h-full w-full object-cover" unoptimized />
              </div>
            )}
          </div>

          {/* Ingredients */}
          <div>
            <label className={labelCls}>Ingredients (up to 4)</label>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  className={inputCls}
                  placeholder={`Ingredient ${i + 1}`}
                  value={form.ingredients[i] ?? ""}
                  onChange={(e) => setIngredient(i, e.target.value)}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-zinc-300 hover:bg-white/[0.07] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-zinc-950 shadow-lg hover:opacity-90 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isEdit ? "Save Changes" : "Create Momo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type Tab = "overview" | "momos" | "orders";

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [momos, setMomos] = useState<MomoItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingMomos, setLoadingMomos] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMomo, setEditingMomo] = useState<MomoItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [orderDeleteConfirm, setOrderDeleteConfirm] = useState<string | null>(null);
  const [momoSearch, setMomoSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const toastKey = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/dashboard/login");
  };

  const showToast = useCallback((message: string, type: "success" | "error") => {
    toastKey.current++;
    setToast({ message, type });
  }, []);

  const fetchMomos = useCallback(async () => {
    setLoadingMomos(true);
    try {
      const res = await fetch("/api/momos");
      const data = await res.json();
      if (data.success) setMomos(data.momos);
    } catch {
      showToast("Failed to load momos", "error");
    } finally {
      setLoadingMomos(false);
    }
  }, [showToast]);

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isConfiguringAlerts, setIsConfiguringAlerts] = useState(false);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    const restorePushSubscription = async () => {
      try {
        if (localStorage.getItem("momo_dashboard_sound_alerts_enabled") !== "true") return;

        const registration = await navigator.serviceWorker?.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) {
          localStorage.removeItem("momo_dashboard_sound_alerts_enabled");
          if (!cancelled) {
            showToast("Re-enable order notifications on this device to receive background alerts.", "error");
          }
          return;
        }

        const response = await fetch("/api/push/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error ?? "Could not restore this device's push subscription.");
        }

        if (!cancelled) setAudioEnabled(true);
      } catch (error) {
        console.error("Could not restore order notifications:", error);
        localStorage.removeItem("momo_dashboard_sound_alerts_enabled");
        if (!cancelled) {
          showToast("Could not restore background order notifications. Please enable them again.", "error");
        }
      }
    };

    void restorePushSubscription();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (!audioEnabled) return;

    const resumeAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = audioContextRef.current ?? new AudioCtx();
        audioContextRef.current = ctx;
        if (ctx.state === "suspended") {
          void ctx.resume().catch((err: unknown) => {
            console.warn("Could not resume notification sound:", err);
          });
        }
      } catch (err) {
        console.warn("Could not initialize notification sound:", err);
      }
    };

    window.addEventListener("pointerdown", resumeAudio);
    window.addEventListener("keydown", resumeAudio);
    return () => {
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
    };
  }, [audioEnabled]);

  // Sound generator using Web Audio API (crisp, pleasant chime bell)
  const playOrderNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioContextRef.current ?? new AudioCtx();
      audioContextRef.current = ctx;

      const playChime = () => {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(659.25, now); // E5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, now + 0.2);
        osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.45); // E6
        gain2.gain.setValueAtTime(0.35, now + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.2);
        osc2.stop(now + 1.0);
      };

      if (ctx.state === "suspended") {
        void ctx.resume().then(playChime).catch((err: unknown) => {
          console.warn("Could not resume notification sound:", err);
        });
      } else {
        playChime();
      }
    } catch (err) {
      console.warn("Could not play notification sound:", err);
    }
  }, []);

  const toggleNotifications = async () => {
    const nextEnabled = !audioEnabled;
    setIsConfiguringAlerts(true);
    try {
      if (!nextEnabled) {
        const registration = "serviceWorker" in navigator
          ? await navigator.serviceWorker.getRegistration("/")
          : undefined;
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          const response = await fetch("/api/push/subscriptions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error ?? "Could not disable push notifications.");
          }
          await subscription.unsubscribe();
        }

        localStorage.removeItem("momo_dashboard_sound_alerts_enabled");
        setAudioEnabled(false);
        showToast("Order alerts disabled.", "success");
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("Background notifications are not supported by this browser.");
      }

      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Allow notifications in your browser settings to receive alerts when the dashboard is closed.");
      }

      const keyResponse = await fetch("/api/push/public-key");
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || !keyData.success || typeof keyData.publicKey !== "string") {
        throw new Error(keyData.error ?? "Could not load background notification settings.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const readyRegistration = await navigator.serviceWorker.ready;
      const activeRegistration = readyRegistration.scope === registration.scope
        ? readyRegistration
        : registration;
      let subscription = await activeRegistration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await activeRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(keyData.publicKey),
        });
      }

      const saveResponse = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      const saveData = await saveResponse.json();
      if (!saveResponse.ok || !saveData.success) {
        throw new Error(saveData.error ?? "Could not save this device for push notifications.");
      }

      localStorage.setItem("momo_dashboard_sound_alerts_enabled", "true");
      setAudioEnabled(true);
      playOrderNotificationSound();
      showToast("Background order notifications enabled on this device.", "success");
    } catch (error) {
      console.error("Could not configure order notifications:", error);
      showToast(error instanceof Error ? error.message : "Could not configure order notifications.", "error");
    } finally {
      setIsConfiguringAlerts(false);
    }
  };

  const fetchOrders = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoadingOrders(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const newOrders: Order[] = data.orders;

        if (isPolling && !isInitialLoadRef.current) {
          const freshOrders = newOrders.filter(
            (o) => !previousOrderIdsRef.current.has(o._id)
          );
          if (freshOrders.length > 0) {
            if (audioEnabled) playOrderNotificationSound();
            const latest = freshOrders[0];
            const custName = latest.customer?.name || latest.customer?.ownerName || "Customer";
            showToast(`🔔 New Order Received: ${custName} (₹${latest.total})`, "success");

          }
        }

        previousOrderIdsRef.current = new Set(newOrders.map((o) => o._id));
        isInitialLoadRef.current = false;
        setOrders(newOrders);
      }
    } catch {
      if (!isPolling) showToast("Failed to load orders", "error");
    } finally {
      if (!isPolling) setLoadingOrders(false);
    }
  }, [audioEnabled, playOrderNotificationSound, showToast]);

  useEffect(() => {
    fetchMomos();
    fetchOrders(false);

    // Auto-poll orders every 10 seconds for real-time order alerts
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchMomos, fetchOrders]);

  // ── Momo CRUD ──────────────────────────────────────────────────────────────

  const handleSaveMomo = async (formData: Omit<MomoItem, "_id">) => {
    setIsSaving(true);
    try {
      const isEdit = Boolean(editingMomo);
      const url = isEdit ? `/api/momos/${formData.id}` : "/api/momos";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      showToast(isEdit ? "Momo updated successfully!" : "Momo created successfully!", "success");
      setModalOpen(false);
      setEditingMomo(null);
      fetchMomos();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save momo", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMomo = async (momoId: string) => {
    try {
      const res = await fetch(`/api/momos/${momoId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast("Momo deleted.", "success");
      setDeleteConfirm(null);
      fetchMomos();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete momo", "error");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast("Cancelled order deleted successfully.", "success");
      setOrderDeleteConfirm(null);
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete order", "error");
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast("Order status updated!", "success");
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status } : o))
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update status", "error");
    }
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────

  const filteredMomos = momos.filter(
    (m) =>
      m.name.toLowerCase().includes(momoSearch.toLowerCase()) ||
      m.category.toLowerCase().includes(momoSearch.toLowerCase())
  );

  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const searchLower = orderSearch.toLowerCase();
    const rawName = o.customer.name || o.customer.ownerName || "";
    const cleanName = normalizeSpecialFont(rawName);

    const matchSearch =
      rawName.toLowerCase().includes(searchLower) ||
      cleanName.toLowerCase().includes(searchLower) ||
      (o.customer.businessName?.toLowerCase().includes(searchLower) ?? false) ||
      (o.customer.phone?.includes(orderSearch) ?? false) ||
      o._id.includes(orderSearch);
    return matchStatus && matchSearch;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);
  const activeOrders = orders.filter((o) =>
    ["pending", "confirmed", "preparing"].includes(o.status)
  ).length;

  const cancelledOrders = orders.filter((o) => o.status === "cancelled");
  const cancelledOrdersCount = cancelledOrders.length;

  // Customers with pending dues (Baki amount > 0 or paymentStatus Pending/Partially Paid)
  const pendingDebtOrders = orders.filter((o) => {
    if (o.status === "cancelled") return false;
    const baki = typeof o.bakiAmount === "number" ? o.bakiAmount : (o.paymentStatus === "Paid" ? 0 : o.total);
    return baki > 0;
  });

  const totalPendingDebt = pendingDebtOrders.reduce((sum, o) => {
    const baki = typeof o.bakiAmount === "number" ? o.bakiAmount : (o.paymentStatus === "Paid" ? 0 : o.total);
    return sum + baki;
  }, 0);

  // ── Sidebar nav ───────────────────────────────────────────────────────────

  const navItems: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "momos", label: "Momo Catalog", icon: Soup, count: momos.length },
    { id: "orders", label: "Orders", icon: ShoppingBag, count: activeOrders || undefined },
  ];
  const activeNavItem = navItems.find((item) => item.id === tab);

  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#070709] text-zinc-100 selection:bg-amber-500 selection:text-black">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/3 h-[400px] w-[700px] rounded-full bg-gradient-to-tr from-amber-600/10 via-orange-600/10 to-transparent blur-[120px]" />
        <div className="absolute bottom-0 right-[-5%] h-[300px] w-[400px] rounded-full bg-amber-500/5 blur-[100px]" />
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="dashboard-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 max-w-[85vw] shrink-0 flex-col overflow-y-auto border-r border-white/[0.07] bg-[#09090b]/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:transform-none lg:bg-black/40 lg:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Soup className="h-5 w-5 text-zinc-950" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black tracking-tight text-white">
              RK <span className="text-amber-500">MOMO</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Admin Panel</div>
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3 pt-4">
          {navItems.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setSidebarOpen(false);
              }}
              className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                tab === id
                  ? "bg-amber-500/15 border border-amber-500/25 text-amber-400 shadow-sm"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Icon className={`h-4 w-4 ${tab === id ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
              <span className="flex-1 text-left">{label}</span>
              {count !== undefined && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  tab === id ? "bg-amber-500/25 text-amber-300" : "bg-white/[0.07] text-zinc-400"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="space-y-1 border-t border-white/[0.07] px-3 py-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 transition-all"
          >
            <Package className="h-3.5 w-3.5" />
            Back to Storefront
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="relative z-10 min-w-0 flex-1 overflow-auto">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.07] bg-[#070709]/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-controls="dashboard-navigation"
            aria-expanded={sidebarOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-200 transition-colors hover:bg-white/[0.08]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{activeNavItem?.label}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">RK MOMO Admin</p>
          </div>
        </div>

        {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-black text-white sm:text-3xl">Dashboard Overview</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Real-time snapshot of your momo business.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
              <StatCard icon={Soup} label="Total Momos" value={momos.length} sub="In the catalog" color="bg-amber-500/15 text-amber-400 border border-amber-500/25" />
              <StatCard icon={ShoppingBag} label="Total Orders" value={orders.length} sub="All time" color="bg-blue-500/15 text-blue-400 border border-blue-500/25" />
              <StatCard icon={TrendingUp} label="Active Orders" value={activeOrders} sub="In progress" color="bg-orange-500/15 text-orange-400 border border-orange-500/25" />
              <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(totalRevenue)} sub="Excl. cancelled" color="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" />
              <StatCard icon={X} label="Cancelled Orders" value={cancelledOrdersCount} sub="Can be deleted" color="bg-rose-500/15 text-rose-400 border border-rose-500/25" />
              <StatCard icon={DollarSign} label="Market Dues" value={formatCurrency(totalPendingDebt)} sub={`${pendingDebtOrders.length} customer${pendingDebtOrders.length !== 1 ? "s" : ""} pending`} color="bg-red-500/15 text-red-400 border border-red-500/25" />
            </div>

            {/* Pending Customer Dues Breakdown */}
            {pendingDebtOrders.length > 0 && (
              <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-4 backdrop-blur-xl sm:p-6">
                <div className="mb-4 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <h2 className="text-base font-bold text-white">Pending Customer Payments (Baki List)</h2>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                    Total: {formatCurrency(totalPendingDebt)}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendingDebtOrders.slice(0, 9).map((o) => {
                    const custName = o.customer.name || o.customer.ownerName || o.customer.businessName || "Customer";
                    const baki = typeof o.bakiAmount === "number" ? o.bakiAmount : o.total;
                    const paid = typeof o.paidAmount === "number" ? o.paidAmount : 0;
                    return (
                      <div key={o._id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <span className="font-bold text-sm text-white">{custName}</span>
                            <span className="font-mono text-xs font-black text-rose-400">{formatCurrency(baki)}</span>
                          </div>
                          {o.customer.businessName && <p className="text-xs text-amber-400/80 mt-0.5">{o.customer.businessName}</p>}
                          <p className="text-[11px] text-zinc-500 mt-1">📞 {o.customer.phone}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-zinc-400">
                          <span>Total: {formatCurrency(o.total)} | Paid: {formatCurrency(paid)}</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${PAYMENT_STATUS_STYLES[o.paymentStatus || "Pending"]}`}>
                            {o.paymentStatus || "Pending"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-bold text-white">Recent Orders</h2>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-16 text-zinc-600">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-zinc-600">
                    <ShoppingBag className="h-8 w-8" />
                    <p className="text-sm">No orders yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 p-3 xl:hidden">
                      {orders.slice(0, 6).map((order) => {
                        const isBulk = order.orderType === "bulk" || (order.totalPieces ?? 0) >= 500;
                        const customerName =
                          order.customer.name || order.customer.ownerName || order.customer.businessName || "Customer";

                        return (
                          <article
                            key={order._id}
                            className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                          >
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="break-words font-semibold text-white">{customerName}</h3>
                                <p className="mt-1 break-all text-xs text-zinc-500">
                                  {order.customer.businessName || order.customer.phone}
                                </p>
                              </div>
                              <span className="shrink-0 text-right font-bold text-amber-400">
                                {formatCurrency(order.total)}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className={`rounded border px-2 py-1 text-[10px] font-bold ${
                                isBulk
                                  ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-300"
                                  : "border-blue-500/25 bg-blue-500/15 text-blue-300"
                              }`}>
                                {isBulk ? "Bulk (500+)" : "Retail"} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                              </span>
                              <span className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                PAYMENT_STATUS_STYLES[order.paymentStatus || "Pending"] || PAYMENT_STATUS_STYLES.Pending
                              }`}>
                                {order.paymentStatus || "Pending"}
                              </span>
                              <span className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[order.status]}`}>
                                {order.status}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs">
                              {order.bakiAmount !== undefined && order.bakiAmount > 0 ? (
                                <span className="font-semibold text-rose-400">Baki: {formatCurrency(order.bakiAmount)}</span>
                              ) : (
                                <span className="text-zinc-600">No outstanding balance</span>
                              )}
                              <span className="text-zinc-500">{timeAgo(order.createdAt)}</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="hidden overflow-x-auto xl:block">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.07] text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                            <th className="px-5 py-3.5">Customer / Business</th>
                            <th className="px-5 py-3.5">Items</th>
                            <th className="px-5 py-3.5">Total Bill</th>
                            <th className="px-5 py-3.5">Payment (Telegram)</th>
                            <th className="px-5 py-3.5">Order Status</th>
                            <th className="px-5 py-3.5">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 6).map((order) => (
                            <tr key={order._id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                              <td className="px-5 py-3.5">
                                <div className="font-semibold text-white">
                                  {order.customer.name || order.customer.ownerName || order.customer.businessName || "Customer"}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {order.customer.businessName || order.customer.phone}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-zinc-400">
                                <div>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</div>
                                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  order.orderType === "bulk" || (order.totalPieces && order.totalPieces >= 500)
                                    ? "border border-emerald-500/25 bg-emerald-500/15 text-emerald-300"
                                    : "border border-blue-500/25 bg-blue-500/15 text-blue-300"
                                }`}>
                                  {order.orderType === "bulk" || (order.totalPieces && order.totalPieces >= 500)
                                    ? "Bulk (500+)"
                                    : "Retail"}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 font-bold text-amber-400">{formatCurrency(order.total)}</td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                                  PAYMENT_STATUS_STYLES[order.paymentStatus || "Pending"] || PAYMENT_STATUS_STYLES.Pending
                                }`}>
                                  {order.paymentStatus || "Pending"}
                                </span>
                                {order.bakiAmount !== undefined && order.bakiAmount > 0 && (
                                  <div className="mt-0.5 text-[10px] font-semibold text-rose-400">
                                    Baki: {formatCurrency(order.bakiAmount)}
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLES[order.status]}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-zinc-500">{timeAgo(order.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="mt-6">
              <h2 className="mb-4 text-lg font-bold text-white">Catalog Breakdown</h2>
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-4">
                {CATEGORIES.map((cat) => {
                  const count = momos.filter((m) => m.category === cat).length;
                  return (
                    <div key={cat} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                      <div className="text-2xl font-black text-white">{count}</div>
                      <div className="mt-1 text-xs font-medium text-zinc-500">{cat}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MOMO CATALOG ───────────────────────────────────────────────── */}
        {tab === "momos" && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-black text-white sm:text-3xl">Momo Catalog</h1>
                <p className="mt-1 text-sm text-zinc-500">{momos.length} items in catalog</p>
              </div>
              <button
                onClick={() => { setEditingMomo(null); setModalOpen(true); }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-zinc-950 shadow-lg hover:opacity-90 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add New Momo
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-5">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                placeholder="Search momos by name or category…"
                value={momoSearch}
                onChange={(e) => setMomoSearch(e.target.value)}
              />
            </div>

            {loadingMomos ? (
              <div className="flex items-center justify-center py-24 text-zinc-600">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredMomos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-600">
                <Soup className="h-10 w-10" />
                <p className="text-sm">No momos found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMomos.map((momo) => (
                  <div
                    key={momo.id}
                    className="group flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] lg:flex-nowrap lg:gap-4 lg:p-4"
                  >
                    {/* Image */}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-16">
                      <Image src={momo.image} alt={momo.name} fill className="object-cover" unoptimized />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="max-w-full truncate font-bold text-white">{momo.name}</span>
                        {momo.badge && (
                          <span className="shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                            {momo.badge}
                          </span>
                        )}
                        {momo.isVeg ? (
                          <Leaf className="shrink-0 h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Flame className="shrink-0 h-3.5 w-3.5 text-rose-400" />
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                        <span>{momo.category}</span>
                        <span>•</span>
                        <span>{momo.pieces} pcs</span>
                        <span>•</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex w-full items-center justify-between gap-3 border-t border-white/[0.07] pt-3 lg:w-auto lg:shrink-0 lg:justify-end lg:border-0 lg:pt-0">
                      <div className="min-w-0 text-left lg:text-right">
                        <div className="text-base font-black text-amber-400">{formatCurrency(momo.price)}</div>
                        <div className="text-[11px] text-zinc-500">Retail / plate</div>
                        <div className="mt-1 flex items-center lg:justify-end">
                          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            ₹{momo.wholesalePricePerPiece ?? 3}/pc (500+)
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => { setEditingMomo(momo); setModalOpen(true); }}
                          type="button"
                          aria-label={`Edit ${momo.name}`}
                          title={`Edit ${momo.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {deleteConfirm === momo.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteMomo(momo.id)}
                              type="button"
                              aria-label={`Confirm delete ${momo.name}`}
                              className="flex h-9 items-center gap-1 rounded-xl bg-rose-500/20 border border-rose-500/40 px-3 text-xs font-bold text-rose-400 hover:bg-rose-500/30 transition-all"
                            >
                              <Check className="h-3 w-3" /> Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              type="button"
                              aria-label="Cancel delete"
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white transition-all"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(momo.id)}
                            type="button"
                            aria-label={`Delete ${momo.name}`}
                            title={`Delete ${momo.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ─────────────────────────────────────────────────────── */}
        {tab === "orders" && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-black text-white sm:text-3xl">Orders</h1>
                <p className="mt-1 text-sm text-zinc-500">{orders.length} total orders</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={toggleNotifications}
                  disabled={isConfiguringAlerts}
                  aria-pressed={audioEnabled}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all shadow-sm disabled:cursor-wait disabled:opacity-60 ${
                    audioEnabled
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 animate-pulse"
                  }`}
                  title={audioEnabled ? "Disable background order notifications on this device" : "Enable background order notifications on this device"}
                >
                  <Bell className="h-4 w-4" />
                  {isConfiguringAlerts
                    ? "Setting up alerts…"
                    : audioEnabled
                      ? "Order Alerts On · Tap to Disable"
                      : "Enable Order Notifications"}
                </button>
                <button
                  onClick={() => fetchOrders(false)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.07] transition-all"
                >
                  <Users className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  placeholder="Search by business name, owner or order ID…"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
              </div>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-9 text-sm text-zinc-100 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all sm:w-44"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
                >
                  <option value="all">All Statuses</option>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </div>
            </div>

            {loadingOrders ? (
              <div className="flex items-center justify-center py-24 text-zinc-600">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-600">
                <ShoppingBag className="h-10 w-10" />
                <p className="text-sm">No orders match your filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div
                    key={order._id}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-all duration-200"
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      {/* Customer Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-base">
                            {order.customer.name || order.customer.ownerName || order.customer.businessName || "Customer"}
                          </span>
                          <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            order.orderType === "bulk" || (order.totalPieces && order.totalPieces >= 500)
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          }`}>
                            {order.orderType === "bulk" || (order.totalPieces && order.totalPieces >= 500)
                              ? "Bulk (500+ pcs)"
                              : "Retail Order"}
                          </span>
                          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[order.status]}`}>
                            {order.status}
                          </span>
                          {order.scheduledDate && (
                            <span className="inline-flex items-center rounded-lg border border-purple-500/30 bg-purple-500/15 px-2.5 py-1 text-[10px] font-bold text-purple-300">
                              📅 Slot: {order.scheduledDate}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {order.customer.businessName && <span className="font-medium text-amber-400">{order.customer.businessName} · </span>}
                          <span>📞 {order.customer.phone}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500">📍 {order.customer.address}</div>
                        <div className="mt-2 text-[10px] font-mono text-zinc-600">ID: {order._id}</div>
                      </div>

                      {/* Order Details */}
                      <div className="shrink-0 text-right">
                        <div className="text-xl font-black text-amber-400">{formatCurrency(order.total)}</div>
                        <div className="text-xs text-zinc-600 mt-0.5">{order.items.length} item type{order.items.length !== 1 ? "s" : ""}</div>
                        <div className="text-xs text-zinc-600">{timeAgo(order.createdAt)}</div>

                        {/* Telegram Payment Badge */}
                        <div className="mt-2 flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            PAYMENT_STATUS_STYLES[order.paymentStatus || "Pending"] || PAYMENT_STATUS_STYLES.Pending
                          }`}>
                            Telegram: {order.paymentStatus || "Pending"}
                          </span>
                          {order.bakiAmount !== undefined && order.bakiAmount > 0 && (
                            <span className="text-[11px] font-semibold text-rose-400">
                              Baki: {formatCurrency(order.bakiAmount)}
                            </span>
                          )}
                          {order.paidAmount !== undefined && order.paidAmount > 0 && (
                            <span className="text-[10px] text-emerald-400">
                              Paid: {formatCurrency(order.paidAmount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.items.map((item, i) => (
                        <span key={i} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-400">
                          {item.name} × {item.quantity.toLocaleString()}
                        </span>
                      ))}
                    </div>

                    {/* Status changer & Actions */}
                    <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Update status:</span>
                        {ORDER_STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(order._id, s)}
                            disabled={order.status === s}
                            className={`rounded-lg border px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                              order.status === s
                                ? STATUS_STYLES[s]
                                : "border-white/[0.07] text-zinc-600 hover:border-white/20 hover:text-zinc-300"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        {order.paymentStatus === "Paid" && (
                          <button
                            type="button"
                            onClick={() => downloadReceipt(order._id, { dashboardPaidOnly: true })}
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
                            title="Download paid receipt"
                          >
                            <FileText className="h-3.5 w-3.5 text-amber-400" />
                            Paid Receipt
                          </button>
                        )}

                        {/* Delete button (Only for Cancelled orders) */}
                        {order.status === "cancelled" && (
                        <div>
                          {orderDeleteConfirm === order._id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-rose-400 font-semibold">Confirm delete?</span>
                              <button
                                onClick={() => handleDeleteOrder(order._id)}
                                className="rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-600 transition-colors"
                              >
                                Yes, Delete
                              </button>
                              <button
                                onClick={() => setOrderDeleteConfirm(null)}
                                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-400 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setOrderDeleteConfirm(order._id)}
                              className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Cancelled Order
                            </button>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Momo Form Modal */}
      {modalOpen && (
        <MomoFormModal
          initial={editingMomo}
          onSave={handleSaveMomo}
          onClose={() => { setModalOpen(false); setEditingMomo(null); }}
          isSaving={isSaving}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          key={toastKey.current}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
        select option { background: #0e0e10; color: #e4e4e7; }
      `}</style>
    </div>
  );
}
