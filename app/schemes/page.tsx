/**
 * app/schemes/page.tsx
 * ============================================================
 * Government Support Ecosystem Page — fully functional.
 *
 * Features:
 *  - Interactive Search & Category Filter pills (with live count)
 *  - Interactive Deadlines shortcut & Applied count tracking
 *  - Application Status Modal with timeline stages & printable receipt
 *  - Scheme Details & Eligibility Modal with document checklist & AI advice
 *  - Legal & Compliance Hub Modals (Guidelines, Privacy, Help Center)
 *  - Profile Match quick link to complete profile
 * ============================================================
 */

"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  Search,
  ClipboardList,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Shield,
  CreditCard,
  Leaf,
  FileText,
  ChevronRight,
  Scale,
  X,
  ExternalLink,
  PhoneCall,
  Lock,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  Printer,
  Droplets,
  Sun,
  Sprout,
  Tractor,
  Building2,
  FileCheck2,
  BadgeCheck,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_SCHEMES } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import type { GovernmentScheme } from "@/types";

// ─── Scheme icon mapping ──────────────────────────────────────────────────────

const SCHEME_ICONS: Record<string, React.FC<LucideProps>> = {
  "pm-kisan":        Banknote,
  "fasal-bima":      Shield,
  "kcc":             CreditCard,
  "soil-health-card": Leaf,
  "pmksy":            Droplets,
  "pm-kusum":         Sun,
  "pkvy":             Sprout,
  "smam":             Tractor,
  "midh":             Leaf,
  "ahidf":            Building2,
};

const SCHEME_CATEGORIES: Record<string, { label: string; color: string }> = {
  "pm-kisan":         { label: "Income Support",      color: "text-amber-800 bg-amber-100/90 border-amber-300 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800/60"  },
  "fasal-bima":       { label: "Crop Insurance",      color: "text-blue-800 bg-blue-100/90 border-blue-300 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800/60"   },
  "kcc":              { label: "Low Interest Loans",  color: "text-emerald-800 bg-emerald-100/90 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/60"  },
  "soil-health-card": { label: "Organic Farming",     color: "text-emerald-800 bg-emerald-100/90 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/60"  },
  "pmksy":            { label: "Irrigation & Solar",  color: "text-cyan-800 bg-cyan-100/90 border-cyan-300 dark:text-cyan-300 dark:bg-cyan-950/40 dark:border-cyan-800/60"  },
  "pm-kusum":         { label: "Irrigation & Solar",  color: "text-amber-800 bg-amber-100/90 border-amber-300 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800/60"  },
  "pkvy":             { label: "Organic Farming",     color: "text-emerald-800 bg-emerald-100/90 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/60"  },
  "smam":             { label: "Farm Machinery",      color: "text-orange-800 bg-orange-100/90 border-orange-300 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-800/60"  },
  "midh":             { label: "Organic Farming",     color: "text-emerald-800 bg-emerald-100/90 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/60"  },
  "ahidf":            { label: "Low Interest Loans",  color: "text-purple-800 bg-purple-100/90 border-purple-300 dark:text-purple-300 dark:bg-purple-950/40 dark:border-purple-800/60"  },
};

const SCHEME_DEADLINES: Record<string, { label: string; urgent: boolean }> = {
  "pm-kisan":         { label: "Next Instalment Nov 2024", urgent: false },
  "fasal-bima":       { label: "14 Days Left (Rabi Season)", urgent: true  },
  "kcc":              { label: "Always Open (Year-round)", urgent: false },
  "soil-health-card": { label: "Closes Apr 15",             urgent: false },
  "pmksy":            { label: "FY 2024-25 Allotment Open", urgent: false },
  "pm-kusum":         { label: "Ending this week (Batch 3)", urgent: true  },
  "pkvy":             { label: "Cluster Enrolment Active",  urgent: false },
  "smam":             { label: "Token Generation Open",    urgent: false },
  "midh":             { label: "State Quota Active",        urgent: false },
  "ahidf":            { label: "Always Open",               urgent: false },
};

// ─── Scheme card ──────────────────────────────────────────────────────────────

function SchemeCard({
  scheme,
  onCheckEligibility,
}: {
  scheme: GovernmentScheme;
  onCheckEligibility: (scheme: GovernmentScheme) => void;
}) {
  const { t } = useI18n();
  const Icon = SCHEME_ICONS[scheme.id] ?? FileText;
  const category = SCHEME_CATEGORIES[scheme.id];
  const deadline = SCHEME_DEADLINES[scheme.id];
  const isAlwaysOpen = deadline?.label?.includes("Always Open");

  return (
    <div className="rounded-xl bg-cropwise-surface border border-cropwise-border p-5 flex flex-col justify-between gap-4 hover:border-emerald-600/40 dark:hover:border-cropwise-green/40 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)] group">
      <div>
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-cropwise-elevated border border-cropwise-border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Icon className="w-5 h-5 text-emerald-700 dark:text-cropwise-green-light" strokeWidth={1.5} />
          </div>
          {category && (
            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wide", category.color)}>
              {t(category.label)}
            </span>
          )}
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-cropwise-text mb-1 leading-snug group-hover:text-emerald-700 dark:group-hover:text-cropwise-green-light transition-colors">
          {t(scheme.name)}
        </h3>
        <p className="text-[11px] text-cropwise-muted mb-2 font-medium">
          {t(scheme.ministry)}
        </p>
        <p className="text-xs text-cropwise-muted leading-relaxed line-clamp-3 mb-3">
          {t(scheme.description)}
        </p>

        {/* Eligibility tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {scheme.eligibility.slice(0, 2).map((e: string) => (
            <span
              key={e}
              className="px-2.5 py-1 rounded-lg border border-cropwise-border bg-cropwise-elevated text-[11px] text-cropwise-muted font-medium"
            >
              {t(e)}
            </span>
          ))}
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-3 border-t border-cropwise-border-muted flex-wrap gap-2">
        {/* Deadline */}
        <div className={cn("flex items-center gap-1.5 text-xs font-medium",
          isAlwaysOpen ? "text-emerald-700 dark:text-cropwise-green-light font-semibold" : deadline?.urgent ? "text-amber-700 dark:text-amber-400 font-semibold" : "text-cropwise-muted"
        )}>
          {isAlwaysOpen
            ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
            : deadline?.urgent
              ? <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" strokeWidth={2} />
              : <CalendarDays  className="w-3.5 h-3.5" strokeWidth={2} />
          }
          <span>{deadline?.label ? t(deadline.label) : ""}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCheckEligibility(scheme)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-cropwise-border text-cropwise-muted hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:border-cropwise-green-light dark:hover:text-cropwise-green-light dark:hover:bg-cropwise-green/10 transition-all cursor-pointer"
          >
            {t("Details & Eligibility")}
          </button>
          <a
            href={scheme.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95",
              deadline?.urgent
                ? "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-cropwise-green dark:text-cropwise-bg dark:hover:bg-cropwise-green-light shadow-sm"
                : "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 dark:bg-cropwise-elevated dark:text-cropwise-green-light dark:border-cropwise-green/30 dark:hover:bg-cropwise-green/20"
            )}
          >
            {t("Apply")}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = [
  "All",
  "Income Support",
  "Crop Insurance",
  "Low Interest Loans",
  "Organic Farming",
  "Irrigation & Solar",
  "Farm Machinery",
];

export default function SchemesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTabFilter, setStatusTabFilter] = useState<"all" | "under_review" | "approved">("all");
  const [selectedScheme, setSelectedScheme] = useState<GovernmentScheme | null>(null);
  const [legalModalType, setLegalModalType] = useState<"guidelines" | "privacy" | "help" | null>(null);

  const filtered = useMemo(() => {
    return MOCK_SCHEMES.filter((s) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.ministry.toLowerCase().includes(q) ||
        s.benefits.some((b) => b.toLowerCase().includes(q)) ||
        s.eligibility.some((e) => e.toLowerCase().includes(q));

      const matchCat =
        activeCategory === "All" ||
        SCHEME_CATEGORIES[s.id]?.label === activeCategory;

      const matchUrgent = !onlyUrgent || SCHEME_DEADLINES[s.id]?.urgent === true;

      return matchSearch && matchCat && matchUrgent;
    });
  }, [search, activeCategory, onlyUrgent]);

  // Printable application status slip generator
  const handleDownloadStatus = () => {
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
          <title>${t("Application Status Report")} - KrishiSetu</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #111; max-width: 800px; margin: 0 auto; background: #fff; }
            .header-bar { border-bottom: 2px solid #1a4d1a; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start; }
            h1 { color: #1a4d1a; margin: 0 0 4px 0; font-size: 24px; }
            .badge { background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; border: 1px solid #bbf7d0; display: inline-block; }
            .section { margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; }
            h2 { margin-top: 0; color: #166534; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
            .app-item { padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
            .app-item:last-child { border-bottom: none; }
            .meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
            .status-tag { font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; display: inline-block; }
            .tag-review { background: #fef3c7; color: #92400e; }
            .tag-approved { background: #dcfce7; color: #166534; }
            .btn-print { background: #166534; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
          </div>
          <div class="header-bar">
            <div>
              <h1>🌾 KrishiSetu — Government Support Tracking Slip</h1>
              <div style="font-size: 13px; color: #4b5563;">Official Direct Benefit Transfer (DBT) & Subsidy Verification Record</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">VERIFIED BENEFICIARY</span>
              <div style="font-size: 12px; color: #6b7280; margin-top: 6px;">Date: ${printDate}</div>
            </div>
          </div>
          
          <div class="section">
            <h2>⏳ Currently Under Verification (2 Applications)</h2>
            <div class="app-item">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>Pradhan Mantri Fasal Bima Yojana (PMFBY)</strong>
                <span class="status-tag tag-review">Under Review</span>
              </div>
              <div class="meta">App Ref: <strong>PMFBY-2024-884920</strong> • Applied: Oct 15, 2024 • Premium Paid: ₹840 • Insured Sum: ₹42,000</div>
              <div style="font-size: 12px; color: #374151; margin-top: 4px;">Status: Physical crop inspection by Agricultural Extension Officer scheduled for current week.</div>
            </div>
            <div class="app-item">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>Soil Health Card Scheme (SHC)</strong>
                <span class="status-tag tag-review">Lab Testing Active</span>
              </div>
              <div class="meta">App Ref: <strong>SHC-2024-110293</strong> • Applied: Oct 20, 2024 • Testing Center: KVK Ghaziabad</div>
              <div style="font-size: 12px; color: #374151; margin-top: 4px;">Status: NPK, pH & Micronutrient assay in progress. Digital card report issuance expected by next week.</div>
            </div>
          </div>
          
          <div class="section">
            <h2>✅ Benefitted & Sanctioned Subsidies (1 Application)</h2>
            <div class="app-item">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)</strong>
                <span class="status-tag tag-approved">Active • DBT Disbursed</span>
              </div>
              <div class="meta">Beneficiary ID: <strong>PMKISAN-2024-771822</strong> • Bank: Bank of Baroda (Aadhaar Seeded)</div>
              <div style="font-size: 12px; color: #374151; margin-top: 4px;">Last Instalment (17th): ₹2,000 credited on Sep 05, 2024. Next instalment scheduled for Nov 2024.</div>
            </div>
          </div>

          <div style="font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between;">
            <div>Farmer Helpline: 1800-180-1551 (Kisan Call Centre)</div>
            <div>Generated via KrishiSetu Support Ecosystem</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-cropwise-text">
              {t("Government Support Ecosystem")}
            </h1>
            <p className="text-sm text-cropwise-faint mt-1 max-w-xl leading-relaxed">
              {t("Access a curated directory of agricultural financial aid and development programs. We analyse your farm profile to match you with the most relevant schemes.")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="btn-primary text-xs py-2 gap-1.5 cursor-pointer shadow-sm hover:shadow-md transition-all"
              onClick={() => setIsStatusModalOpen(true)}
            >
              <ClipboardList className="w-3.5 h-3.5" /> {t("Application Status")}
            </button>
          </div>
        </div>

        {/* ── Search bar ──────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cropwise-faint" />
          <input
            type="text"
            placeholder={t("Search schemes, benefits, or eligibility (e.g., drip, solar, kcc, pm-kisan)...")}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="input-field pl-10 pr-9 text-sm w-full"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cropwise-faint hover:text-cropwise-text p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Profile Match + Stats banner ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
          {/* Profile match */}
          <div
            className="rounded-xl p-5 relative overflow-hidden"
            style={{ background: "linear-gradient(120deg, #1a4d1a 0%, #0c330c 100%)", border: "1px solid rgba(46,168,46,0.2)" }}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#82d882]/60">
                  {t("Profile Match")}
                </span>
                <button
                  onClick={() => router.push("/profile")}
                  className="text-[11px] font-semibold text-cropwise-green-light hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {t("Complete Profile")} (15% {t("left")}) <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <h2 className="text-lg font-bold text-white mt-1 leading-snug">
                {t("You are eligible for")} <span className="text-cropwise-green-light">10 {t("schemes")}</span> {t("worth approx.")}{" "}
                <span className="text-cropwise-green-light">₹45,000+</span> {t("in benefits.")}
              </h2>
              {/* Progress */}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-2xl font-bold text-cropwise-green-light">85%</span>
                <div className="flex-1">
                  <div className="h-1.5 w-full rounded-full bg-cropwise-border overflow-hidden">
                    <div className="h-full w-[85%] rounded-full bg-cropwise-green" />
                  </div>
                  <p className="text-[10px] text-[#82d882]/60 mt-1">{t("Completion of profile data")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Applied stat — click opens Application Status Modal */}
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className="rounded-xl bg-cropwise-surface border border-cropwise-border px-6 py-5 flex flex-col justify-between min-w-[140px] text-left hover:border-cropwise-green/50 hover:bg-cropwise-elevated transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint group-hover:text-cropwise-text">{t("Applied")}</p>
              <ChevronRight className="w-3.5 h-3.5 text-cropwise-faint group-hover:text-cropwise-green-light group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-4xl font-bold text-cropwise-text my-2 group-hover:text-cropwise-green-light transition-colors">03</p>
            <div className="flex items-center gap-1.5 text-xs text-cropwise-green-light font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{t("2 Under Review")}</span>
            </div>
          </button>

          {/* Deadlines stat — click filters urgent closing schemes */}
          <button
            onClick={() => setOnlyUrgent((prev) => !prev)}
            className={cn(
              "rounded-xl bg-cropwise-surface border px-6 py-5 flex flex-col justify-between min-w-[140px] text-left transition-all cursor-pointer group",
              onlyUrgent
                ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-[0_0_15px_rgba(217,119,6,0.15)]"
                : "border-cropwise-border hover:border-amber-500/50 hover:bg-cropwise-elevated"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-muted group-hover:text-cropwise-text">{t("Deadlines")}</p>
              {onlyUrgent ? (
                <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300 px-1.5 py-0.2 rounded font-semibold border border-amber-300 dark:border-amber-400/30">Active</span>
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-cropwise-muted group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              )}
            </div>
            <p className="text-4xl font-bold text-cropwise-text my-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">02</p>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{onlyUrgent ? t("Filter Active") : t("Ending this week")}</span>
            </div>
          </button>
        </div>

        {/* ── Urgent Filter Banner (if toggled) ───────────────────────── */}
        {onlyUrgent && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{t("Showing 2 schemes closing soon this week (PMFBY & PM-KUSUM Solar)")}</span>
            </div>
            <button
              onClick={() => setOnlyUrgent(false)}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
            >
              {t("Show All Schemes")} ✕
            </button>
          </div>
        )}

        {/* ── Category filter pills ─────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ALL_CATEGORIES.map((cat) => {
            const count =
              cat === "All"
                ? MOCK_SCHEMES.length
                : MOCK_SCHEMES.filter((s) => SCHEME_CATEGORIES[s.id]?.label === cat).length;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setOnlyUrgent(false);
                }}
                className={cn(
                  "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer",
                  activeCategory === cat && !onlyUrgent
                    ? "bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-cropwise-green/20 dark:text-cropwise-green-light dark:border-cropwise-green/40 shadow-sm"
                    : "text-cropwise-muted border-cropwise-border hover:border-emerald-500/40 hover:text-cropwise-text bg-cropwise-surface"
                )}
              >
                <span>{t(cat)}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cropwise-elevated border border-cropwise-border text-cropwise-muted">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Scheme cards grid ─────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl bg-cropwise-surface border border-cropwise-border">
            <Search className="w-10 h-10 text-cropwise-faint mb-3 opacity-60" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-cropwise-text">{t("No schemes match your search")}</p>
            <p className="text-xs text-cropwise-faint mt-1 max-w-sm">
              {t("Try clearing your search query or switching categories to explore other central and state schemes.")}
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("All");
                setOnlyUrgent(false);
              }}
              className="btn-secondary text-xs py-1.5 px-3 mt-4"
            >
              {t("Reset Filters")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((scheme) => (
              <SchemeCard
                key={scheme.id}
                scheme={scheme}
                onCheckEligibility={(s) => setSelectedScheme(s)}
              />
            ))}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer className="border-t border-cropwise-border-muted pt-5 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cropwise-elevated border border-cropwise-border flex items-center justify-center">
                <Scale className="w-3.5 h-3.5 text-cropwise-faint" strokeWidth={2} />
              </div>
              <span className="text-sm font-semibold text-cropwise-muted">{t("Legal & Compliance Hub")}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => setLegalModalType("guidelines")}
                className="text-xs text-cropwise-faint hover:text-cropwise-green-light transition-colors cursor-pointer"
              >
                {t("Scheme Guidelines")}
              </button>
              <button
                onClick={() => setLegalModalType("privacy")}
                className="text-xs text-cropwise-faint hover:text-cropwise-green-light transition-colors cursor-pointer"
              >
                {t("Data Privacy")}
              </button>
              <button
                onClick={() => setLegalModalType("help")}
                className="text-xs text-cropwise-faint hover:text-cropwise-green-light transition-colors cursor-pointer"
              >
                {t("Help Center")}
              </button>
              <span className="text-xs text-cropwise-faint">
                {t("© 2026 KrishiSetu. Official Agritech Partner.")}
              </span>
            </div>
          </div>
        </footer>

      </div>

      {/* ── 1. Application Status & Tracking Modal ────────────────────── */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-2xl rounded-2xl bg-cropwise-surface border border-cropwise-border dark:border-cropwise-green/30 p-6 shadow-2xl space-y-5 my-8"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-cropwise-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-cropwise-green/20 dark:border-cropwise-green/40 dark:text-cropwise-green-light flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-cropwise-text">
                    {t("Farmer Application Status & Tracking")}
                  </h2>
                  <p className="text-xs text-cropwise-muted mt-0.5">
                    {t("Track official Direct Benefit Transfer (DBT) subsidies and policy claims")}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsStatusModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-cropwise-elevated border border-cropwise-border flex items-center justify-center text-cropwise-muted hover:text-cropwise-text hover:border-cropwise-green/40 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-cropwise-border-muted pb-2">
              {[
                { id: "all", label: "All Applications", count: 3 },
                { id: "under_review", label: "Under Review", count: 2 },
                { id: "approved", label: "Sanctioned / Active", count: 1 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusTabFilter(tab.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    statusTabFilter === tab.id
                      ? "bg-cropwise-green/20 text-cropwise-green-light border border-cropwise-green/30"
                      : "text-cropwise-faint hover:text-cropwise-muted"
                  )}
                >
                  {t(tab.label)} ({tab.count})
                </button>
              ))}
            </div>

            {/* Applications List */}
            <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
              {/* App 1: PMFBY */}
              {(statusTabFilter === "all" || statusTabFilter === "under_review") && (
                <div className="p-4 rounded-xl bg-cropwise-surface border border-cropwise-border space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cropwise-text">Pradhan Mantri Fasal Bima Yojana (PMFBY)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
                          {t("Under Review")}
                        </span>
                      </div>
                      <p className="text-[11px] text-cropwise-faint mt-0.5">
                        Application Ref: <strong className="text-cropwise-muted font-mono">PMFBY-2024-884920</strong> • Submitted: 15 Oct 2024
                      </p>
                    </div>
                    <span className="text-xs font-bold text-blue-400">Sum Insured: ₹42,000</span>
                  </div>

                  {/* Stage Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-cropwise-faint">
                      <span className="text-cropwise-green-light font-semibold">1. Submitted ✓</span>
                      <span className="text-cropwise-green-light font-semibold">2. Aadhaar KYC ✓</span>
                      <span className="text-amber-400 font-semibold animate-pulse">3. Land Survey Active</span>
                      <span className="text-cropwise-faint">4. Claim Sanction</span>
                    </div>
                    <div className="h-1.5 w-full bg-cropwise-elevated rounded-full overflow-hidden">
                      <div className="h-full w-[65%] bg-amber-400 rounded-full" />
                    </div>
                  </div>

                  <p className="text-[11px] text-cropwise-muted">
                    {t("Physical verification scheduled by Tehsil Patwari & Agricultural Extension Officer. SMS alert will be sent on dispatch.")}
                  </p>
                </div>
              )}

              {/* App 2: Soil Health Card */}
              {(statusTabFilter === "all" || statusTabFilter === "under_review") && (
                <div className="p-4 rounded-xl bg-cropwise-surface border border-cropwise-border space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cropwise-text">Soil Health Card Scheme</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-300 font-semibold border border-blue-400/30">
                          {t("Lab Testing")}
                        </span>
                      </div>
                      <p className="text-[11px] text-cropwise-faint mt-0.5">
                        Sample Ref: <strong className="text-cropwise-muted font-mono">SHC-2024-110293</strong> • Collected: 20 Oct 2024
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">Sample: Plot #42 (Muradnagar)</span>
                  </div>

                  {/* Stage Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-cropwise-faint">
                      <span className="text-cropwise-green-light font-semibold">1. Sample Collected ✓</span>
                      <span className="text-blue-400 font-semibold animate-pulse">2. Chemical Assay Active</span>
                      <span className="text-cropwise-faint">3. Card Ready</span>
                    </div>
                    <div className="h-1.5 w-full bg-cropwise-elevated rounded-full overflow-hidden">
                      <div className="h-full w-[50%] bg-blue-400 rounded-full" />
                    </div>
                  </div>

                  <p className="text-[11px] text-cropwise-muted">
                    {t("NPK & Micronutrient analysis underway at Regional Soil Testing Laboratory (KVK Ghaziabad). Card expected in 6 days.")}
                  </p>
                </div>
              )}

              {/* App 3: PM-KISAN */}
              {(statusTabFilter === "all" || statusTabFilter === "approved") && (
                <div className="p-4 rounded-xl bg-cropwise-surface border border-cropwise-green/30 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cropwise-text">PM-KISAN Samman Nidhi</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cropwise-green/20 text-cropwise-green-light font-semibold border border-cropwise-green/30">
                          {t("Active Beneficiary")}
                        </span>
                      </div>
                      <p className="text-[11px] text-cropwise-faint mt-0.5">
                        Registration ID: <strong className="text-cropwise-muted font-mono">PMKISAN-2024-771822</strong> • Linked: Bank of Baroda
                      </p>
                    </div>
                    <span className="text-xs font-bold text-cropwise-green-light">₹2,000 / 4 Months</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-cropwise-elevated text-[11px] text-cropwise-muted flex items-center justify-between">
                    <div>
                      <span className="text-cropwise-text font-semibold">17th Instalment Credited</span> on Sep 05, 2024 via Aadhaar DBT.
                    </div>
                    <span className="text-cropwise-green-light font-bold">₹2,000.00 Paid</span>
                  </div>

                  <p className="text-[11px] text-cropwise-faint">
                    {t("Next 18th instalment is scheduled for disbursement in Nov 2024. e-KYC status: Verified.")}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-cropwise-green/20 flex-wrap gap-3">
              <button
                onClick={handleDownloadStatus}
                className="btn-secondary text-xs py-2 px-3.5 gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t("Print Status Slip (PDF)")}</span>
              </button>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="btn-primary text-xs py-2 px-4 cursor-pointer"
              >
                {t("Done")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Scheme Details & Eligibility Modal ────────────────────── */}
      {selectedScheme && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-2xl rounded-2xl bg-cropwise-surface border border-cropwise-border dark:border-cropwise-green/30 p-6 shadow-2xl space-y-5 my-8"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-cropwise-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-cropwise-green/20 dark:border-cropwise-green/40 dark:text-cropwise-green-light flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-cropwise-text leading-snug">
                    {t(selectedScheme.name)}
                  </h2>
                  <p className="text-xs text-cropwise-muted mt-0.5">
                    {t(selectedScheme.ministry)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedScheme(null)}
                className="w-8 h-8 rounded-lg bg-cropwise-elevated border border-cropwise-border flex items-center justify-center text-cropwise-muted hover:text-cropwise-text hover:border-cropwise-green/40 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {/* Description */}
              <div className="p-3.5 rounded-xl bg-cropwise-elevated border border-cropwise-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-cropwise-green-light mb-1">
                  {t("Scheme Overview")}
                </h4>
                <p className="text-xs text-cropwise-text leading-relaxed">
                  {t(selectedScheme.description)}
                </p>
              </div>

              {/* Financial Benefits */}
              <div className="p-3.5 rounded-xl bg-cropwise-elevated border border-cropwise-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                  {t("Key Benefits & Financial Assistance")}
                </h4>
                <ul className="space-y-1.5 text-xs text-cropwise-text">
                  {selectedScheme.benefits.map((b, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-cropwise-green-light shrink-0" />
                      <span>{t(b)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Eligibility Criteria */}
              <div className="p-3.5 rounded-xl bg-cropwise-elevated border border-cropwise-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2">
                  {t("Eligibility Criteria")}
                </h4>
                <ul className="space-y-1.5 text-xs text-cropwise-text">
                  {selectedScheme.eligibility.map((e, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                      <span>{t(e)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Required Documents */}
              <div className="p-3.5 rounded-xl bg-cropwise-elevated border border-cropwise-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-2">
                  {t("Required Documentation (Checklist)")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-cropwise-text">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-cropwise-surface border border-cropwise-border">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-700 dark:text-cropwise-green-light shrink-0" />
                    <span>Aadhaar Card (UIDAI Linked)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-cropwise-surface border border-cropwise-border">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-700 dark:text-cropwise-green-light shrink-0" />
                    <span>Khasra / Khatauni Land Record</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-cropwise-surface border border-cropwise-border">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-700 dark:text-cropwise-green-light shrink-0" />
                    <span>Active Bank Passbook (IFSC)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-cropwise-surface border border-cropwise-border">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-700 dark:text-cropwise-green-light shrink-0" />
                    <span>Crop Sowing Declaration</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-cropwise-green/20 flex-wrap gap-3">
              <button
                onClick={() => {
                  const prompt = `Can you guide me step-by-step on how to apply for the "${selectedScheme.name}" scheme, what documents I need, and how to verify my DBT bank account?`;
                  router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
                }}
                className="btn-secondary text-xs py-2 px-3.5 gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cropwise-green-light" />
                <span>{t("Ask AI Advisor for Help")}</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="btn-secondary text-xs py-2 px-3 cursor-pointer"
                >
                  {t("Close")}
                </button>
                <a
                  href={selectedScheme.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs py-2 px-4 gap-1.5 cursor-pointer"
                >
                  <span>{t("Apply on Official Portal")}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Legal & Compliance Modal (Guidelines / Privacy / Help) ─── */}
      {legalModalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-xl rounded-2xl bg-cropwise-surface border border-cropwise-border dark:border-cropwise-green/30 p-6 shadow-2xl space-y-4 my-8"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-cropwise-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-cropwise-green/20 dark:border-cropwise-green/40 dark:text-cropwise-green-light flex items-center justify-center">
                  {legalModalType === "guidelines" && <BookOpen className="w-5 h-5" />}
                  {legalModalType === "privacy" && <Lock className="w-5 h-5" />}
                  {legalModalType === "help" && <PhoneCall className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-cropwise-text">
                    {legalModalType === "guidelines" && t("Official Scheme Guidelines & DBT Norms")}
                    {legalModalType === "privacy" && t("Farmer Data Privacy & Government Compliance")}
                    {legalModalType === "help" && t("Farmer Support & Helpline Directory")}
                  </h2>
                  <p className="text-xs text-cropwise-muted">
                    KrishiSetu • National Agricultural Knowledge Portal
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setLegalModalType(null)}
                className="w-7 h-7 rounded-lg bg-cropwise-elevated border border-cropwise-border flex items-center justify-center text-cropwise-muted hover:text-cropwise-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="text-xs text-cropwise-muted space-y-3 leading-relaxed">
              {legalModalType === "guidelines" && (
                <>
                  <p>
                    All government subsidy allotments in India are processed strictly via <strong>Public Financial Management System (PFMS)</strong> and <strong>Aadhaar Payment Bridge (APB)</strong>.
                  </p>
                  <div className="p-3 rounded-lg bg-cropwise-surface border border-cropwise-border space-y-2">
                    <strong className="text-cropwise-text block">Key Farmer Rules:</strong>
                    <div>1. <strong>e-KYC Mandate:</strong> Biometric or OTP-based e-KYC must be completed on official portals (e.g. pmkisan.gov.in) every financial cycle.</div>
                    <div>2. <strong>NPCI Bank Seeding:</strong> Your Aadhaar must be linked to your primary bank account via the NPCI mapper to receive DBT transfers without rejection.</div>
                    <div>3. <strong>Land Record Seeding:</strong> Ensure Khasra/Khatauni numbers match state digital land records (Bhulekh / Meebhoomi / AnyRoR).</div>
                  </div>
                </>
              )}

              {legalModalType === "privacy" && (
                <>
                  <p>
                    KrishiSetu prioritizes the security and sovereign ownership of farmer data in compliance with the <strong>Digital Personal Data Protection (DPDP) Act</strong>.
                  </p>
                  <div className="p-3 rounded-lg bg-cropwise-surface border border-cropwise-border space-y-2">
                    <strong className="text-cropwise-text block">Data Protection Principles:</strong>
                    <div>• <strong>Zero Third-Party Sharing:</strong> Your landholding dimensions and bank details are never shared with or sold to commercial third parties.</div>
                    <div>• <strong>256-Bit Encryption:</strong> All sensitive profile parameters are encrypted at rest and in transit.</div>
                    <div>• <strong>Direct Portal Redirection:</strong> All subsidy applications are processed on authorized government domains (<code className="text-cropwise-green-light">.gov.in</code> / <code className="text-cropwise-green-light">.nic.in</code>).</div>
                  </div>
                </>
              )}

              {legalModalType === "help" && (
                <>
                  <p>
                    Need immediate assistance with application filling, biometric KYC, or grievance redressal? Contact official toll-free farmer helplines:
                  </p>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-cropwise-surface border border-cropwise-border flex justify-between items-center">
                      <div>
                        <strong className="text-cropwise-text block">Kisan Call Centre (KCC)</strong>
                        <span className="text-[11px] text-cropwise-faint">Toll-free 24x7 in 22 regional languages</span>
                      </div>
                      <a href="tel:18001801551" className="text-cropwise-green-light font-bold hover:underline">1800-180-1551</a>
                    </div>
                    <div className="p-2.5 rounded-lg bg-cropwise-surface border border-cropwise-border flex justify-between items-center">
                      <div>
                        <strong className="text-cropwise-text block">PM-KISAN Helpline</strong>
                        <span className="text-[11px] text-cropwise-faint">Direct Benefit Transfer inquiries</span>
                      </div>
                      <a href="tel:155261" className="text-cropwise-green-light font-bold hover:underline">155261</a>
                    </div>
                    <div className="p-2.5 rounded-lg bg-cropwise-surface border border-cropwise-border flex justify-between items-center">
                      <div>
                        <strong className="text-cropwise-text block">PMFBY Insurance Helpline</strong>
                        <span className="text-[11px] text-cropwise-faint">Crop loss intimation within 72 hours</span>
                      </div>
                      <a href="tel:14447" className="text-cropwise-green-light font-bold hover:underline">14447</a>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-cropwise-green/20">
              <button
                onClick={() => setLegalModalType(null)}
                className="btn-primary text-xs py-1.5 px-4 cursor-pointer"
              >
                {t("Close")}
              </button>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}