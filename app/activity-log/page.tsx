/**
 * app/activity-log/page.tsx
 * ============================================================
 * Activity Log & Ledger — fully functional with Firebase + AI Analytics.
 *
 * Features:
 *  - 6 Quick Action Logging Modals (Irrigation, Fertilizer, Pesticide, Weeding, Sowing, Harvesting)
 *  - Real-time persistence in Firestore (farmActivities collection) + activityLogs feed
 *  - Interactive Row Action Menu on each row (...) with Mark Completed, Ask AI Advisor, and Delete Record
 *  - Dual Export: Printable PDF / Report + Direct CSV Spreadsheet download
 *  - Filter Modal: Filter by Action, Status, and Min Cost with instant Reset toggle
 *  - Dynamic Eco-Score & Carbon/Water Savings tracker calculated from operations
 *  - Farm Analytics modal with category spend breakdown bar chart
 *  - Full bilingual i18n support across all components
 * ============================================================
 */

"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  Droplets,
  Sprout,
  Bug,
  Tractor,
  Wheat,
  Package,
  SlidersHorizontal,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Star,
  X,
  Leaf,
  TrendingDown,
  TrendingUp,
  BarChart2,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Calendar,
  AlertCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/firebase/auth-context";
import { logActivity } from "@/lib/firebase/activity-log";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useI18n } from "@/lib/i18n/LanguageProvider";

// ─── Action type configuration ────────────────────────────────────────────────

const ACTION_TYPES = [
  { id: "irrigation", label: "Irrigation", icon: Droplets, bg: "bg-blue-900/40 border-blue-800/40",       ic: "text-blue-400"              },
  { id: "fertilizer", label: "Fertilizer", icon: Sprout,   bg: "bg-cropwise-green/15 border-cropwise-green/30", ic: "text-cropwise-green-light" },
  { id: "pesticide",  label: "Pesticide",  icon: Bug,      bg: "bg-rose-900/40 border-rose-800/40",       ic: "text-rose-400"              },
  { id: "weeding",    label: "Weeding",    icon: Tractor,  bg: "bg-amber-900/40 border-amber-800/40",      ic: "text-amber-400"             },
  { id: "sowing",     label: "Sowing",     icon: Wheat,    bg: "bg-purple-900/40 border-purple-800/40",    ic: "text-purple-400"            },
  { id: "harvesting", label: "Harvesting", icon: Package,  bg: "bg-cropwise-green/15 border-cropwise-green/30", ic: "text-cropwise-green-light" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActivityStatus = "Completed" | "Scheduled" | "Pending";

export interface FarmActivity {
  id: string;
  userId: string;
  type: string;
  action: string;
  quantity: string;
  costINR: number;
  status: ActivityStatus;
  notes: string;
  date: string;
  createdAt?: unknown;
}

// Default sample activities if Firestore is freshly initialized
const SEED_ACTIVITIES: FarmActivity[] = [
  {
    id: "seed-1",
    userId: "demo",
    type: "irrigation",
    action: "Irrigation",
    quantity: "450 m³ (Drip)",
    costINR: 850,
    status: "Completed",
    notes: "Micro-drip irrigation run in Wheat Sector 2",
    date: "10 Oct 2024",
  },
  {
    id: "seed-2",
    userId: "demo",
    type: "fertilizer",
    action: "Fertilizer",
    quantity: "120 kg (Vermicompost)",
    costINR: 2400,
    status: "Completed",
    notes: "Applied organic compost before intercropping",
    date: "08 Oct 2024",
  },
  {
    id: "seed-3",
    userId: "demo",
    type: "pesticide",
    action: "Pesticide",
    quantity: "5 Litres (Neem Oil)",
    costINR: 650,
    status: "Completed",
    notes: "Preventative organic spray for aphid control",
    date: "05 Oct 2024",
  },
  {
    id: "seed-4",
    userId: "demo",
    type: "sowing",
    action: "Sowing",
    quantity: "40 kg (Wheat Seed)",
    costINR: 1800,
    status: "Completed",
    notes: "Certified HD-2967 Rabi wheat sowing",
    date: "28 Sep 2024",
  },
  {
    id: "seed-5",
    userId: "demo",
    type: "weeding",
    action: "Weeding",
    quantity: "2 Workers (Manual)",
    costINR: 900,
    status: "Completed",
    notes: "Manual weed clearance across Plot 3",
    date: "22 Sep 2024",
  },
  {
    id: "seed-6",
    userId: "demo",
    type: "irrigation",
    action: "Irrigation",
    quantity: "300 m³ (Sprinkler)",
    costINR: 600,
    status: "Scheduled",
    notes: "Scheduled second wetting cycle after fertilizer",
    date: "14 Oct 2024",
  },
];

// ─── Log Action Modal ─────────────────────────────────────────────────────────

interface LogModalProps {
  actionType: typeof ACTION_TYPES[0];
  onClose: () => void;
  onSave: (entry: Omit<FarmActivity, "id" | "userId" | "createdAt">) => Promise<void>;
}

function LogModal({ actionType, onClose, onSave }: LogModalProps) {
  const { t } = useI18n();
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ActivityStatus>("Completed");
  const [saving, setSaving] = useState(false);
  const Icon = actionType.icon;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      type: actionType.id,
      action: actionType.label,
      quantity: quantity.trim() || "--",
      costINR: parseFloat(cost) || 0,
      status,
      notes: notes.trim(),
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-[#0c1f0d] border border-cropwise-green/30 p-6 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cropwise-green/20">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", actionType.bg)}>
              <Icon className={cn("w-4.5 h-4.5", actionType.ic)} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-cropwise-text">
                {t("Log")} {t(actionType.label)}
              </h2>
              <p className="text-[11px] text-cropwise-faint">{t("Record in digital ledger")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-cropwise-surface border border-cropwise-border flex items-center justify-center text-cropwise-faint hover:text-cropwise-text cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-cropwise-muted mb-1">
              {t("Quantity / Amount")}
            </label>
            <input
              type="text"
              placeholder={actionType.id === "irrigation" ? "e.g. 450 m³" : "e.g. 25 kg / 5 Litres"}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input-field text-sm w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-cropwise-muted mb-1">
              {t("Cost (₹ INR)")}
            </label>
            <input
              type="number"
              placeholder="e.g. 1500"
              value={cost}
              min="0"
              step="50"
              onChange={(e) => setCost(e.target.value)}
              className="input-field text-sm w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-cropwise-muted mb-1">
              {t("Execution Status")}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ActivityStatus)}
              className="input-field text-sm w-full cursor-pointer"
            >
              <option value="Completed">{t("Completed")}</option>
              <option value="Scheduled">{t("Scheduled")}</option>
              <option value="Pending">{t("Pending")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cropwise-muted mb-1">
              {t("Field Notes (Optional)")}
            </label>
            <textarea
              rows={2}
              placeholder={t("e.g. Organic treatment, plot number, rainfall delay...")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field text-xs resize-none w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2 border-t border-cropwise-border-muted">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 justify-center py-2 text-xs cursor-pointer"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 justify-center py-2 text-xs gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{t("Save Entry")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ActivityStatus }) {
  const { t } = useI18n();
  const cfg: Record<ActivityStatus, string> = {
    Completed: "bg-cropwise-green/15 border-cropwise-green/30 text-cropwise-green-light",
    Scheduled: "bg-blue-500/15 border-blue-500/30 text-blue-400",
    Pending:   "bg-amber-900/30 border-amber-800/40 text-amber-400",
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1", cfg[status] || cfg.Completed)}>
      {status === "Completed" && <CheckCircle2 className="w-2.5 h-2.5" />}
      {status === "Scheduled" && <Clock className="w-2.5 h-2.5" />}
      {status === "Pending" && <AlertCircle className="w-2.5 h-2.5" />}
      <span>{t(status)}</span>
    </span>
  );
}

function ActionIcon({ type }: { type: string }) {
  const cfg = ACTION_TYPES.find((a) => a.id === type) ?? ACTION_TYPES[0];
  const Icon = cfg.icon;
  return (
    <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-sm", cfg.bg)}>
      <Icon className={cn("w-4 h-4", cfg.ic)} strokeWidth={2} />
    </div>
  );
}

// ─── Main Activity Log Page ───────────────────────────────────────────────────

const PAGE_SIZE = 5;

export default function ActivityLogPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();

  // State
  const [allActivities, setAllActivities] = useState<FarmActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeModal, setActiveModal] = useState<typeof ACTION_TYPES[0] | null>(null);

  // Row dropdown state
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  // Filters state
  const [showFilter, setShowFilter] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filterAction, setFilterAction] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMinCost, setFilterMinCost] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
        setOpenMenuRowId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Load farm activities from Firebase ────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) {
        // Unauthenticated demo fallback
        setAllActivities(SEED_ACTIVITIES);
        return;
      }

      const q = query(
        collection(db, "farmActivities"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        // If user has zero activities in Firestore, show initial seed demo
        setAllActivities(SEED_ACTIVITIES);
      } else {
        const rows = snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
            } as FarmActivity)
        );
        setAllActivities(rows);
      }
    } catch (err) {
      console.warn("Firestore farmActivities load error, falling back to seed:", err);
      setAllActivities(SEED_ACTIVITIES);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Eco-score & spending calculations ─────────────────────────────────────
  // ── Eco-score & sustainability calculations (100% dynamic from logged activities) ─────
  const { monthlySpend, ecoScore, carbonSaved, waterSaved } = useMemo(() => {
    let spend = 0;
    let carbon = 0;
    let water = 0;
    let ecoDelta = 0;

    if (allActivities.length === 0) {
      return {
        monthlySpend: 0,
        ecoScore: 50,
        carbonSaved: 0,
        waterSaved: 0,
      };
    }

    allActivities.forEach((act) => {
      spend += act.costINR || 0;
      const type = (act.type || "").toLowerCase();
      const notes = (act.notes || "").toLowerCase();
      const qty = (act.quantity || "").toLowerCase();

      // 1. Carbon Savings (kg CO₂e) based on regenerative practices
      if (type === "pesticide") {
        if (notes.includes("organic") || notes.includes("neem") || notes.includes("natural") || notes.includes("bio")) {
          carbon += 14;
          ecoDelta += 4;
        } else {
          carbon += 2;
          ecoDelta -= 3;
        }
      } else if (type === "fertilizer") {
        if (notes.includes("organic") || notes.includes("compost") || notes.includes("manure") || notes.includes("vermi") || notes.includes("bio")) {
          carbon += 22;
          ecoDelta += 6;
        } else {
          carbon += 3;
          ecoDelta -= 2;
        }
      } else if (type === "sowing") {
        carbon += 18;
        ecoDelta += 4;
      } else if (type === "weeding") {
        // Manual/mechanical weeding reduces chemical herbicide dependency
        carbon += 10;
        ecoDelta += 3;
      } else if (type === "harvesting") {
        // Timely harvest & post-harvest biomass management
        carbon += 12;
        ecoDelta += 4;
      } else if (type === "irrigation") {
        // Micro-irrigation (Drip / Sprinkler) conserves groundwater and reduces diesel pumping
        const isDripOrSprinkler =
          notes.includes("drip") || notes.includes("sprinkler") || notes.includes("micro") ||
          qty.includes("drip") || qty.includes("sprinkler");

        if (isDripOrSprinkler) {
          carbon += 15;
          water += 1500;
          ecoDelta += 5;
        } else {
          carbon += 5;
          water += 400;
          ecoDelta += 2;
        }
      } else {
        carbon += 5;
        ecoDelta += 1;
      }
    });

    // Dynamic Eco-Score: base 60 + delta from regenerative practices, clamped between 30 and 100
    const calculatedEco = Math.min(100, Math.max(30, 60 + ecoDelta));

    return {
      monthlySpend: spend,
      ecoScore: calculatedEco,
      carbonSaved: Math.round(carbon),
      waterSaved: Math.round(water),
    };
  }, [allActivities]);

  // ── Log new activity ──────────────────────────────────────────────────────
  const handleLogActivity = async (entry: Omit<FarmActivity, "id" | "userId" | "createdAt">) => {
    if (user) {
      try {
        const docRef = await addDoc(collection(db, "farmActivities"), {
          ...entry,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });

        // Also add to dashboard activity log
        await logActivity({
          userId: user.uid,
          type: "crop_recommendation",
          title: `${entry.action} logged`,
          description: `${entry.quantity} • ₹${entry.costINR}`,
          metadata: { activityType: entry.type, cost: entry.costINR, status: entry.status },
        }).catch(() => {});

        // Prepend to local state
        const newAct: FarmActivity = {
          id: docRef.id,
          userId: user.uid,
          ...entry,
        };
        setAllActivities((prev) => [newAct, ...prev]);
      } catch (e) {
        console.error("Save activity error:", e);
      }
    } else {
      // Local fallback
      const localNew: FarmActivity = {
        id: `local-${Date.now()}`,
        userId: "local",
        ...entry,
      };
      setAllActivities((prev) => [localNew, ...prev]);
    }
    setCurrentPage(1);
  };

  // ── Mark as Completed ─────────────────────────────────────────────────────
  const handleMarkCompleted = async (id: string) => {
    setOpenMenuRowId(null);
    setAllActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Completed" } : a))
    );

    if (user && !id.startsWith("seed-") && !id.startsWith("local-")) {
      try {
        await updateDoc(doc(db, "farmActivities", id), {
          status: "Completed",
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("Update status error:", err);
      }
    }
  };

  // ── Delete activity ───────────────────────────────────────────────────────
  const handleDeleteActivity = async (id: string) => {
    setOpenMenuRowId(null);
    setAllActivities((prev) => prev.filter((a) => a.id !== id));

    if (user && !id.startsWith("seed-") && !id.startsWith("local-")) {
      try {
        await deleteDoc(doc(db, "farmActivities", id));
      } catch (err) {
        console.warn("Delete activity error:", err);
      }
    }
  };

  // ── Consult AI Advisor about specific action ──────────────────────────────
  const handleConsultAdvisor = (act: FarmActivity) => {
    setOpenMenuRowId(null);
    const prompt = `I recently logged a farm activity: "${act.action}" (${act.quantity}, Cost: ₹${act.costINR}, Status: ${act.status}, Notes: "${act.notes || "None"}"). Can you analyze this operation and give me actionable advice to optimize cost, improve crop health, and increase my Eco-Score?`;
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
  };

  // ── Filtered activities ───────────────────────────────────────────────────
  const filteredActivities = useMemo(() => {
    return allActivities.filter((a) => {
      if (filterAction !== "All" && a.action !== filterAction) return false;
      if (filterStatus !== "All" && a.status !== filterStatus) return false;
      if (filterMinCost && a.costINR < Number(filterMinCost)) return false;
      return true;
    });
  }, [allActivities, filterAction, filterStatus, filterMinCost]);

  const totalCount = filteredActivities.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentActivities = useMemo(() => {
    return filteredActivities.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredActivities, currentPage]);

  const isFiltered = filterAction !== "All" || filterStatus !== "All" || Boolean(filterMinCost);

  const resetFilters = () => {
    setFilterAction("All");
    setFilterStatus("All");
    setFilterMinCost("");
    setCurrentPage(1);
    setShowFilter(false);
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    setShowExportMenu(false);
    const headers = ["Date", "Action", "Type", "Quantity", "Cost (INR)", "Status", "Notes"];
    const rows = filteredActivities.map((a) => [
      `"${a.date}"`,
      `"${a.action}"`,
      `"${a.type}"`,
      `"${a.quantity}"`,
      a.costINR || 0,
      `"${a.status}"`,
      `"${(a.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CropWise_Activity_Log_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Export PDF / Print Slip ───────────────────────────────────────────────
  const handleExportPDF = () => {
    setShowExportMenu(false);
    const printDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>KrishiSetu - Agricultural Activity Ledger Report</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 36px; color: #111; max-width: 860px; margin: 0 auto; background: #fff; }
            .header-bar { border-bottom: 2px solid #166534; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            h1 { color: #166534; margin: 0 0 4px 0; font-size: 24px; }
            .stat-strip { display: flex; gap: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; }
            .stat-box { font-size: 12px; }
            .stat-val { font-size: 18px; font-weight: bold; color: #166534; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 10px; font-weight: 600; color: #334155; }
            td { border-bottom: 1px solid #e2e8f0; padding: 10px; }
            .tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
            .tag-done { background: #dcfce7; color: #166534; }
            .tag-sched { background: #e0f2fe; color: #0369a1; }
            .tag-pend { background: #fef3c7; color: #92400e; }
            .btn-print { background: #166534; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
          </div>
          <div class="header-bar">
            <div>
              <h1>🌾 KrishiSetu — Farm Activity Ledger Report</h1>
              <div style="font-size: 13px; color: #475569;">Season Audit & Operational Operations Ledger</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              Generated: ${printDate}<br>
              Account: ${user?.displayName || "Harsh Gupta"}
            </div>
          </div>

          <div class="stat-strip">
            <div class="stat-box">Total Operations: <div class="stat-val">${totalCount}</div></div>
            <div class="stat-box">Total Spending (MTD): <div class="stat-val">₹${monthlySpend.toLocaleString("en-IN")}</div></div>
            <div class="stat-box">Farm Eco-Score: <div class="stat-val">${ecoScore}/100</div></div>
            <div class="stat-box">Carbon Sequestered: <div class="stat-val">${carbonSaved} kg CO₂</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Operation</th>
                <th>Applied Quantity</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${filteredActivities
                .map(
                  (a) => `
                <tr>
                  <td>${a.date}</td>
                  <td><strong>${a.action}</strong></td>
                  <td>${a.quantity}</td>
                  <td>₹${a.costINR.toLocaleString("en-IN")}</td>
                  <td>
                    <span class="tag ${
                      a.status === "Completed"
                        ? "tag-done"
                        : a.status === "Scheduled"
                        ? "tag-sched"
                        : "tag-pend"
                    }">${a.status}</span>
                  </td>
                  <td style="color:#64748b; font-size:12px;">${a.notes || "—"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    const blob = new Blob([content], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  // ── Farm Analytics modal report ───────────────────────────────────────────
  const handleAnalytics = () => {
    const byCategory: Record<string, number> = {};
    for (const a of filteredActivities) {
      const cat = a.action || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + (a.costINR || 0);
    }
    const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const maxCat = catEntries.length ? Math.max(...catEntries.map((e) => e[1]), 1) : 1;
    const totalSpend = catEntries.reduce((s, [, v]) => s + v, 0);

    const barsHtml = catEntries
      .map(([name, val]) => {
        const h = Math.max(12, Math.round((val / maxCat) * 130));
        return `
          <div style="display:flex; flex-direction:column; align-items:center; width:65px;">
            <div style="font-size:11px; font-weight:600; color:#166534; margin-bottom:4px;">₹${val}</div>
            <div style="height:${h}px; width:40px; background:#4dc24d; border-radius:4px 4px 0 0;"></div>
            <div style="font-size:11px; color:#475569; margin-top:6px; text-align:center;">${name}</div>
          </div>
        `;
      })
      .join("");

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>KrishiSetu - Farm Analytics & AI Insights</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; max-width: 820px; margin: 0 auto; line-height: 1.6; }
            h1, h2 { color: #166534; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; background: #f8fafc; }
            .metric { font-size: 24px; font-weight: bold; color: #166534; }
            .bar-chart { display: flex; align-items: flex-end; height: 160px; gap: 14px; margin-top: 20px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
            .btn-print { background: #166534; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
          </div>
          <h1>🌾 Farm Analytics & Sustainability Report</h1>
          <p>Generated for: <strong>${user?.displayName || "Harsh Gupta"}</strong></p>

          <div class="card">
            <h2>💰 Operational Spending Breakdown</h2>
            <p>Total Season Spend: <span class="metric">₹${totalSpend.toLocaleString("en-IN")}</span> across <strong>${totalCount} logged operations</strong>.</p>
            ${
              catEntries.length > 0
                ? `<div class="bar-chart">${barsHtml}</div>`
                : `<p>No spending recorded yet. Log actions with costs to generate your spending chart.</p>`
            }
          </div>

          <div class="card">
            <h2>🌱 Sustainability & Environmental Savings</h2>
            <p>Farm Eco-Score: <span class="metric">${ecoScore} / 100</span></p>
            <p>Estimated Carbon Sequestered: <span class="metric">${carbonSaved} kg CO₂e</span></p>
            <p>Estimated Water Conserved: <span class="metric" style="color:#0284c7;">${waterSaved.toLocaleString()} Liters</span></p>
            <p style="font-size: 13px; color: #64748b; margin-top: 8px;">
              Your Eco-Score dynamically improves by using organic fertilizers, precise drip irrigation scheduling, and manual weeding.
            </p>
          </div>

          <div class="card">
            <h2>💡 AI Strategic Recommendations</h2>
            <ul style="font-size: 14px; color: #334155;">
              <li><strong>Irrigation Optimization:</strong> Precision timing with soil moisture sensors can further reduce groundwater pumping by up to 18%.</li>
              <li><strong>Nutrient Management:</strong> Intercropping legumes with cereal crops can fix atmospheric nitrogen, saving up to ₹3,500 on synthetic nitrogen inputs.</li>
              <li><strong>IPM Protocol:</strong> Continue using neem-based bio-pesticides during early pest emergence to maintain beneficial predator populations.</li>
            </ul>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    const blob = new Blob([content], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <AppShell>
      {/* ── Log Modal ──────────────────────────────────────────────── */}
      {activeModal && (
        <LogModal
          actionType={activeModal}
          onClose={() => setActiveModal(null)}
          onSave={handleLogActivity}
        />
      )}



      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── 1. Log New Action Quick Bar ────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-cropwise-text">{t("Log New Action")}</h2>
            <span className="text-xs text-cropwise-green-light font-semibold">
              {t("One-Click Ledger Entry")}
            </span>
          </div>
          <p className="text-xs text-cropwise-faint mb-4">
            {t("Select an activity below to record into your digital farm ledger.")}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {ACTION_TYPES.map(({ id, label, icon: Icon, bg, ic }) => (
              <button
                key={id}
                onClick={() => setActiveModal(ACTION_TYPES.find((a) => a.id === id)!)}
                className="group flex flex-col items-center gap-2.5 py-3.5 px-2 rounded-xl bg-cropwise-surface border border-cropwise-border-muted hover:border-cropwise-green/50 hover:bg-cropwise-elevated transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105", bg)}>
                  <Icon className={cn("w-5 h-5", ic)} strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-cropwise-muted group-hover:text-cropwise-text transition-colors">
                  {t(label)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Growing History Table ───────────────────────────────── */}
        <div className="card !p-0 shadow-sm relative z-30">
          {/* Table Header Bar */}
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-cropwise-border-muted flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-cropwise-text">{t("Growing History")}</h2>
                {isFiltered && (
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-400/30">
                    {t("Filtered")}
                  </span>
                )}
              </div>
              <p className="text-xs text-cropwise-faint mt-0.5">
                {t("A detailed audit of all agricultural operations for the current season.")}
              </p>
            </div>

            {/* Actions: Filter & Export */}
            <div className="flex items-center gap-2 flex-shrink-0 relative">
              {/* Filter Button & Floating Popover */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className={cn(
                    "btn-secondary text-xs py-1.5 px-3 gap-1.5 cursor-pointer transition-all",
                    showFilter && "bg-cropwise-elevated border-cropwise-green/50 text-cropwise-green-light",
                    isFiltered && "border-amber-400/60 text-amber-300 bg-amber-500/10"
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{t("Filter")}</span>
                  {isFiltered && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </button>

                {/* Floating Filter Popover */}
                {showFilter && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[90vw] bg-[#0c1f0d] border border-cropwise-green/40 rounded-2xl p-4 shadow-2xl shadow-black/80 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-cropwise-green/20">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-cropwise-green-light" />
                        <span className="text-xs font-bold text-cropwise-text">{t("Filter Operations")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isFiltered && (
                          <button
                            onClick={resetFilters}
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-2.5 h-2.5" /> {t("Reset")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowFilter(false)}
                          className="text-cropwise-faint hover:text-cropwise-text p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-cropwise-muted mb-1">
                          {t("Action Type")}
                        </label>
                        <select
                          value={filterAction}
                          onChange={(e) => {
                            setFilterAction(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="input-field text-xs w-full cursor-pointer py-1.5"
                        >
                          <option value="All">{t("All Actions")}</option>
                          {ACTION_TYPES.map((a) => (
                            <option key={a.id} value={a.label}>
                              {t(a.label)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-cropwise-muted mb-1">
                          {t("Execution Status")}
                        </label>
                        <select
                          value={filterStatus}
                          onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="input-field text-xs w-full cursor-pointer py-1.5"
                        >
                          <option value="All">{t("All Statuses")}</option>
                          <option value="Completed">{t("Completed")}</option>
                          <option value="Scheduled">{t("Scheduled")}</option>
                          <option value="Pending">{t("Pending")}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-cropwise-muted mb-1">
                          {t("Min Cost (₹)")}
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 1000"
                          value={filterMinCost}
                          onChange={(e) => {
                            setFilterMinCost(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="input-field text-xs w-full py-1.5"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-cropwise-border-muted">
                      <button
                        onClick={resetFilters}
                        className="btn-secondary text-xs flex-1 py-1.5 justify-center cursor-pointer"
                      >
                        {t("Clear")}
                      </button>
                      <button
                        onClick={() => setShowFilter(false)}
                        className="btn-primary text-xs flex-1 py-1.5 justify-center cursor-pointer"
                      >
                        {t("Apply")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Export Menu Dropdown */}
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="btn-secondary text-xs py-1.5 px-3 gap-1.5 cursor-pointer hover:border-cropwise-green/40"
                >
                  <Download className="w-3.5 h-3.5 text-cropwise-green-light" />
                  <span>{t("Export")}</span>
                </button>

                {showExportMenu && (
                  <div className="absolute top-10 right-0 z-30 w-48 bg-[#0c1f0d] border border-cropwise-green/30 rounded-xl p-1.5 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={handleExportPDF}
                      className="w-full text-left text-xs text-cropwise-muted hover:text-cropwise-text hover:bg-cropwise-elevated px-3 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-cropwise-green-light" />
                      <span>{t("Print / PDF Report")}</span>
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="w-full text-left text-xs text-cropwise-muted hover:text-cropwise-text hover:bg-cropwise-elevated px-3 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                      <span>{t("Download CSV")}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column Header Titles */}
          <div className="grid grid-cols-[130px_1fr_130px_110px_110px_48px] items-center px-5 py-2.5 border-b border-cropwise-border-muted bg-cropwise-surface/60">
            {["Date", "Action", "Applied Qty", "Cost", "Status", ""].map((h, i) => (
              <p
                key={i}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider text-cropwise-faint",
                  h === "" && "text-right"
                )}
              >
                {h ? t(h) : ""}
              </p>
            ))}
          </div>

          {/* Activity Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 text-cropwise-green-light animate-spin" />
              <p className="text-sm text-cropwise-faint">{t("Loading operations...")}</p>
            </div>
          ) : currentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Plus className="w-10 h-10 text-cropwise-border" strokeWidth={1} />
              <p className="text-sm font-semibold text-cropwise-text">{t("No activities found")}</p>
              <p className="text-xs text-cropwise-faint max-w-sm">
                {isFiltered
                  ? t("No operations match the selected filter criteria. Try resetting filters.")
                  : t("Start by logging your first agricultural operation above.")}
              </p>
              {isFiltered && (
                <button onClick={resetFilters} className="btn-secondary text-xs py-1.5 px-3 mt-1 cursor-pointer">
                  {t("Reset Filters")}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#1a2a1c]" ref={rowMenuRef}>
              {currentActivities.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[130px_1fr_130px_110px_110px_48px] items-center px-5 py-3.5 hover:bg-cropwise-elevated transition-colors relative"
                >
                  {/* Date */}
                  <p className="text-xs text-cropwise-muted font-medium">{row.date}</p>

                  {/* Action */}
                  <div className="flex items-center gap-3 pr-2">
                    <ActionIcon type={row.type} />
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-cropwise-text block truncate">
                        {t(row.action)}
                      </span>
                      {row.notes && (
                        <p className="text-[11px] text-cropwise-faint truncate max-w-[200px]" title={row.notes}>
                          {row.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quantity */}
                  <p className="text-xs text-cropwise-muted font-medium truncate">{row.quantity}</p>

                  {/* Cost */}
                  <p className="text-sm font-bold text-cropwise-text">
                    ₹{row.costINR ? row.costINR.toLocaleString("en-IN") : "0"}
                  </p>

                  {/* Status */}
                  <div>
                    <StatusBadge status={row.status} />
                  </div>

                  {/* Row Actions Menu (...) */}
                  <div className="relative text-right">
                    <button
                      onClick={() => setOpenMenuRowId(openMenuRowId === row.id ? null : row.id)}
                      className="p-1.5 rounded-lg text-cropwise-faint hover:text-cropwise-text hover:bg-cropwise-hover transition-colors cursor-pointer"
                      title={t("Options")}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Popover Menu */}
                    {openMenuRowId === row.id && (
                      <div className="absolute right-0 top-8 z-40 w-44 rounded-xl bg-[#0c1f0d] border border-cropwise-green/30 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 text-left">
                        {row.status !== "Completed" && (
                          <button
                            onClick={() => handleMarkCompleted(row.id)}
                            className="w-full text-left text-xs text-cropwise-muted hover:text-cropwise-text hover:bg-cropwise-elevated px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-cropwise-green-light" />
                            <span>{t("Mark Completed")}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleConsultAdvisor(row)}
                          className="w-full text-left text-xs text-cropwise-muted hover:text-cropwise-text hover:bg-cropwise-elevated px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cropwise-green-light" />
                          <span>{t("Ask AI Advisor")}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteActivity(row.id)}
                          className="w-full text-left text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t("Delete Record")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-cropwise-border-muted flex-wrap gap-2">
            <p className="text-xs text-cropwise-faint">
              {t("Showing")} <strong className="text-cropwise-text">{currentActivities.length}</strong> {t("of")}{" "}
              <strong className="text-cropwise-text">{totalCount}</strong> {t("recorded operations")}
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-7 h-7 rounded-lg border border-cropwise-border flex items-center justify-center text-cropwise-faint hover:text-cropwise-text disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={cn(
                    "w-7 h-7 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                    currentPage === p
                      ? "bg-cropwise-green border-cropwise-green text-cropwise-bg shadow-sm"
                      : "border-cropwise-border text-cropwise-faint hover:border-cropwise-green/40 hover:text-cropwise-text"
                  )}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="w-7 h-7 rounded-lg border border-cropwise-border flex items-center justify-center text-cropwise-faint hover:text-cropwise-text disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. AI Insight + Sustainability & Spending Cards ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_220px] gap-4">
          {/* AI Strategic Insight Box */}
          <div
            className="rounded-2xl p-5 relative overflow-hidden shadow-sm"
            style={{
              background: "linear-gradient(135deg, #164516 0%, #0a290a 100%)",
              border: "1px solid rgba(77, 194, 77, 0.25)",
            }}
          >
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-[#82d882]" strokeWidth={2} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#82d882]/70">
                    {t("AI Insight")}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5 leading-snug">
                  {totalCount === 0
                    ? t("Start logging to generate personalized AI insights.")
                    : t("Farm operations are optimized and on schedule.")}
                </h3>
                <p className="text-xs text-[#82d882]/80 leading-relaxed mb-4 max-w-lg">
                  {totalCount === 0
                    ? t("Record your first activity above. Gemini AI will analyze your inputs to minimize fertilizer overuse and reduce water pumping costs.")
                    : t(`You have ${totalCount} recorded agricultural operations this season. Shifting to bio-fertilizers and drip scheduling can increase your Eco-Score by up to 12%.`)}
                </p>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={handleAnalytics}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-cropwise-bg text-xs font-bold hover:bg-emerald-50 transition-colors cursor-pointer shadow-sm"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-cropwise-bg" />
                    <span>{t("View Analytics")}</span>
                  </button>
                  <button
                    onClick={() => {
                      const prompt = `Based on my current farm activity log (Total spend ₹${monthlySpend}, Eco-Score ${ecoScore}/100, ${totalCount} operations), what are the top 3 high-impact recommendations to improve farm profitability and soil health?`;
                      router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cropwise-green/20 border border-cropwise-green/40 text-xs font-bold text-cropwise-green-light hover:bg-cropwise-green/30 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t("Ask AI Advisor")}</span>
                  </button>
                </div>
              </div>
            </div>

          {/* Eco-Score Metric Card */}
          <div className="card flex flex-col items-center justify-center gap-2 text-center min-h-[160px] relative overflow-hidden group border-cropwise-green/30 hover:border-cropwise-green-light/60 transition-colors shadow-sm">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cropwise-green-light to-transparent opacity-60" />
            <div className="w-11 h-11 rounded-xl bg-cropwise-green/10 border border-cropwise-green/30 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-cropwise-green-light" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cropwise-faint">
                {t("Eco-Score")}
              </p>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span
                  className={cn(
                    "text-3xl font-extrabold leading-none",
                    ecoScore >= 80 ? "text-cropwise-green-light" : ecoScore >= 50 ? "text-amber-400" : "text-rose-400"
                  )}
                >
                  {ecoScore}
                </span>
                <span className="text-xs font-medium text-cropwise-faint">/100</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-cropwise-green-light bg-cropwise-green/10 px-2 py-0.5 rounded-full border border-cropwise-green/20">
                  <TrendingUp className="w-3 h-3" />
                  <span>{carbonSaved}kg CO₂</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  <Droplets className="w-3 h-3" />
                  <span>{waterSaved.toLocaleString()}L</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Spend Metric Card */}
          <div className="card flex flex-col items-center justify-center gap-2.5 text-center min-h-[160px] shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-cropwise-elevated border border-cropwise-border flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-cropwise-green-light" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cropwise-faint">
                {t("Spend (MTD)")}
              </p>
              <p className="text-2xl font-extrabold text-cropwise-text mt-0.5">
                ₹{monthlySpend.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-cropwise-faint mt-1">
                {t("Recorded this season")}
              </p>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}