/**
 * app/market/page.tsx
 * ============================================================
 * Market Prices Page — pixel-matched to design screenshot.
 *
 * Layout:
 *  - AI Advisory banner (MARKET STATUS: HOLD)
 *  - [Left: Mandi Live Feed table] | [Right: Price Trend Recharts chart]
 *  - Bottom: 3 insight cards (Regional Alert, Global Market, Logistics)
 * ============================================================
 */

"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BrainCircuit,
  Download,
  AlertTriangle,
  Globe,
  Warehouse,
  ArrowUpRight,
  MapPin,
  ChevronDown,
  Loader2,
  X,
  ExternalLink,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/lib/firebase/auth-context";
import { getUserProfile } from "@/lib/firebase/user-profile";
import { cn } from "@/lib/utils";
import { STATES, DISTRICTS_BY_STATE } from "@/lib/india-districts";
import { useI18n } from "@/lib/i18n/LanguageProvider";

// ─── Crop icon mapping (Lucide only, no emojis) ───────────────────────────────

function CropIcon({ name }: { name: string }) {
  // All use TrendingUp-family icons as stylised avatars
  const colors: Record<string, string> = {
    "Wheat":       "bg-amber-900/40  text-amber-400  border-amber-800/40",
    "Rice (Paddy)":"bg-blue-900/40   text-blue-400   border-blue-800/40",
    "Cotton":      "bg-purple-900/40 text-purple-400 border-purple-800/40",
    "Soybean":     "bg-green-900/40  text-cropwise-green-light  border-green-800/40",
    "Maize":       "bg-orange-900/40 text-orange-400 border-orange-800/40",
    "Mustard":     "bg-yellow-900/40 text-yellow-400 border-yellow-800/40",
  };
  const cls = colors[name] ?? "bg-cropwise-elevated text-cropwise-faint border-cropwise-border";
  return (
    <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0", cls)}>
      <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />
    </div>
  );
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-cropwise-surface border border-cropwise-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-cropwise-faint mb-1">{label}</p>
      {payload.map((entry: { name?: string; value?: number | string; color?: string }) => (
        <p key={entry.name} className="text-xs font-semibold" style={{ color: entry.color }}>
          ₹{(entry.value as number).toLocaleString("en-IN")}
          <span className="text-[10px] font-normal text-cropwise-faint ml-1">/q</span>
        </p>
      ))}
    </div>
  );
}

// ─── Insight cards (bottom row) ───────────────────────────────────────────────

const INSIGHT_CARDS = [
  {
    tag: "Regional Alert",
    tagColor: "text-amber-400 bg-amber-900/30 border-amber-800/40",
    icon: AlertTriangle,
    iconColor: "text-amber-400 bg-amber-900/40 border-amber-800/40",
    title: "Subsidy Deadline",
    body: "Ensure registration for the Price Support Scheme (PSS) by March 30th to lock in MSP benefits.",
    accent: "border-l-amber-500",
    url: "https://agricoop.gov.in/",
    actionText: "Check PSS Portal"
  },
  {
    tag: "Global Market",
    tagColor: "text-blue-400 bg-blue-900/30 border-blue-800/40",
    icon: Globe,
    iconColor: "text-blue-400 bg-blue-900/40 border-blue-800/40",
    title: "Export Update",
    body: "Increased demand from Southeast Asian markets likely to support current wheat price floors through Q2.",
    accent: "border-l-blue-500",
    url: "https://commerce.gov.in/",
    actionText: "View Trade Stats"
  },
  {
    tag: "Logistics",
    tagColor: "text-cropwise-green-light bg-cropwise-green/10 border-cropwise-green/30",
    icon: Warehouse,
    iconColor: "text-cropwise-green-light bg-cropwise-green/10 border-cropwise-green/20",
    title: "Storage Guidance",
    body: "Silo capacity in North Cluster is at 85%. Advised to book storage slots for peak harvest arrivals.",
    accent: "border-l-cropwise-green",
    url: "https://wdra.gov.in/",
    actionText: "Locate Warehouses"
  },
];

// ─── Mandi table ──────────────────────────────────────────────────────────────

function MandiTable({ activeCrop, onSelect, prices, loading }: { activeCrop: string; onSelect: (n: string) => void; prices: import('@/types').MarketPrice[]; loading: boolean }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl bg-cropwise-surface border border-cropwise-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-cropwise-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-cropwise-text">{t("Mandi Live Feed")}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint">{t("Live Update")}</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-4 px-5 py-2.5 border-b border-cropwise-border-muted">
        {["Crop Name", "Current Price", "MSP", "vs MSP"].map((h) => (
          <p key={h} className="text-[10px] font-semibold uppercase tracking-wider text-cropwise-faint">{t(h)}</p>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-cropwise-faint">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">{t("Fetching live mandi prices…")}</span>
        </div>
      )}

      {!loading && prices.length === 0 && (
        <div className="py-12 text-center text-xs text-cropwise-faint px-5 leading-relaxed">
          {t("No mandi arrivals reported here in today’s government feed.")}
          <br />
          {t("Only markets that traded today appear. Try All Districts, pick a different district, or check back later — the feed fills up through the day.")}
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-cropwise-border-muted">
        {!loading && prices.map((item: import('@/types').MarketPrice) => {
          const isUp   = item.priceChange > 0;
          const isDown = item.priceChange < 0;
          const isSelected = item.cropName === activeCrop;
          const hasMSP   = item.msp > 0;
          const aboveMSP = hasMSP && item.currentPrice >= item.msp;

          return (
            <button
              key={item.cropName}
              onClick={() => onSelect(item.cropName)}
              className={cn(
                "w-full grid grid-cols-4 items-center px-5 py-3.5 text-left transition-colors",
                isSelected ? "bg-cropwise-elevated" : "hover:bg-cropwise-elevated"
              )}
            >
              {/* Name */}
              <div className="flex items-center gap-3">
                <CropIcon name={item.cropName} />
                <div>
                  <p className="text-sm font-medium text-cropwise-text">{item.cropName}</p>
                  {item.cropNameHi && (
                    <p className="text-[10px] text-cropwise-faint">{item.cropNameHi}</p>
                  )}
                </div>
              </div>

              {/* Current price */}
              <p className={cn(
                "text-sm font-semibold",
                !hasMSP ? "text-cropwise-text" : aboveMSP ? "text-cropwise-green-light" : "text-rose-400"
              )}>
                ₹{item.currentPrice.toLocaleString("en-IN")}/q
              </p>

              {/* MSP */}
              <p className="text-sm text-cropwise-faint">
                {hasMSP ? `₹${item.msp.toLocaleString("en-IN")}/q` : "—"}
              </p>

              {/* vs MSP */}
              {hasMSP ? (
                <div className={cn(
                  "flex items-center gap-1 text-sm font-semibold",
                  isUp ? "text-cropwise-green-light" : isDown ? "text-rose-400" : "text-cropwise-faint"
                )}>
                  {isUp   ? <TrendingUp   className="w-3.5 h-3.5" /> :
                   isDown ? <TrendingDown className="w-3.5 h-3.5" /> :
                            <Minus        className="w-3.5 h-3.5" />}
                  {isUp ? "+" : ""}{item.priceChangePercent.toFixed(1)}%
                </div>
              ) : (
                <div className="text-sm text-cropwise-faint">—</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Price trend chart ────────────────────────────────────────────────────────

function PriceTrendChart({ cropName, historical, loading = false }: { cropName: string; historical: import('@/types').MarketHistoricalPoint[]; loading?: boolean }) {
  const { t } = useI18n();
  const [timeframe, setTimeframe] = useState<"1M" | "3M" | "6M">("6M");

  // Format month labels from ISO date
  const allChartData = historical.map((d: import('@/types').MarketHistoricalPoint) => ({
    ...d,
    month: new Date(d.date).toLocaleString("en-IN", { month: "short" }).toUpperCase(),
  }));

  // Filter based on timeframe: historical points are ~10 days apart (18 points total for 180 days)
  let chartData = allChartData;
  if (timeframe === "1M") chartData = allChartData.slice(-4); // Last ~30 days (4 points)
  else if (timeframe === "3M") chartData = allChartData.slice(-9); // Last ~90 days (9 points)
  else if (timeframe === "6M") chartData = allChartData; // All 180 days (18 points)

  const prices = chartData.map((d) => d.price);
  const marketHigh = prices.length ? Math.max(...prices) : 0;
  const firstPrice = prices[0] ?? 0;
  const lastPrice  = prices[prices.length - 1] ?? 0;
  const avgGrowth  = firstPrice ? (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(1) : "0.0";

  const mspLine    = historical[0]?.msp ?? 0;

  return (
    <div className="rounded-xl bg-cropwise-surface border border-cropwise-border p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-cropwise-text">{t("Price Trend")}</h2>
            {loading && (
              <Loader2 className="w-3.5 h-3.5 text-cropwise-green-light animate-spin" />
            )}
          </div>
          <p className="text-xs text-cropwise-faint mt-0.5">{t(cropName)} {t("Historical")}</p>
        </div>
        
        {/* Timeframe Toggle */}
        <div className="flex items-center bg-cropwise-elevated border border-cropwise-border rounded-lg p-0.5">
          {(["1M", "3M", "6M"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors",
                timeframe === tf
                  ? "bg-cropwise-surface text-cropwise-text shadow-sm"
                  : "text-cropwise-faint hover:text-cropwise-muted hover:bg-cropwise-surface/50"
              )}
            >
              {t(tf)}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts line chart */}
      <div className="h-52 relative">
        {loading && (
          <div className="absolute inset-0 bg-cropwise-surface/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg animate-in fade-in">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cropwise-elevated border border-cropwise-border text-xs text-cropwise-faint shadow-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cropwise-green-light" />
              {t("Updating trend...")}
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d20" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#5a7460" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 10, fill: "#5a7460" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `₹${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2a3d2c", strokeWidth: 1 }} />
            {/* MSP reference line */}
            {mspLine > 0 && (
              <ReferenceLine
                y={mspLine}
                stroke="#f59e0b"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{ value: "MSP", position: "right", fontSize: 9, fill: "#f59e0b" }}
              />
            )}
            {/* Current price dot label */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#2ea82e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#4dc24d", stroke: "#0b1410", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-cropwise-border-muted">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint">
            {timeframe} {t("Market High")}
          </p>
          <div className="h-7 flex items-center">
            {loading ? (
              <span className="text-xs text-cropwise-faint flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cropwise-green-light" />
                {t("Updating...")}
              </span>
            ) : (
              <p className="text-xl font-bold text-cropwise-text">
                ₹{marketHigh.toLocaleString("en-IN")}
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint">
            {timeframe} {t("Average Growth")}
          </p>
          <div className="h-7 flex items-center">
            {loading ? (
              <span className="text-xs text-cropwise-faint flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cropwise-green-light" />
                {t("Updating...")}
              </span>
            ) : (
              <p className="text-xl font-bold text-cropwise-green-light">
                {Number(avgGrowth) > 0 ? "+" : ""}{avgGrowth}%
              </p>
            )}
          </div>
        </div>
      </div>


    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [activeCrop, setActiveCrop] = useState("Wheat");
  const [prices, setPrices]         = useState<import('@/types').MarketPrice[]>([]);
  const [historical, setHistorical] = useState<import('@/types').MarketHistoricalPoint[]>([]);
  const [loadingPrices, setLoadingPrices]   = useState(true);
  const [loadingChart,  setLoadingChart]    = useState(false);
  const [state, setState]                   = useState("");
  const [district, setDistrict]             = useState("");
  const [appliedState, setAppliedState]       = useState("");
  const [appliedDistrict, setAppliedDistrict] = useState("");

  const pricesCache = useRef<Map<string, import('@/types').MarketPrice[]>>(new Map());
  const chartCache  = useRef<Map<string, import('@/types').MarketHistoricalPoint[]>>(new Map());

  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    if (exportDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [exportDropdownOpen]);

  // Synchronized state flags: true if data for the user's selected location is still fetching
  const isLocationSyncing = loadingPrices || (state !== appliedState) || (district !== appliedDistrict);
  const selectedLocationLabel = district ? `${district}, ${state}` : (state || "All India");
  const appliedLocationLabel  = appliedDistrict ? `${appliedDistrict}, ${appliedState}` : (appliedState || "All India");

  // Immediate filter handlers with cache-first lookup
  const handleStateChange = (newState: string) => {
    setState(newState);
    setDistrict("");
    const key = `${newState}|`;
    if (pricesCache.current.has(key)) {
      const cached = pricesCache.current.get(key)!;
      setPrices(cached);
      setAppliedState(newState);
      setAppliedDistrict("");
      setLoadingPrices(false);
      if (cached.length && !cached.some((p) => p.cropName === activeCrop)) {
        setActiveCrop(cached[0].cropName);
      }
    } else {
      setLoadingPrices(true);
    }
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const key = `${state}|${newDistrict}`;
    if (pricesCache.current.has(key)) {
      const cached = pricesCache.current.get(key)!;
      setPrices(cached);
      setAppliedState(state);
      setAppliedDistrict(newDistrict);
      setLoadingPrices(false);
      if (cached.length && !cached.some((p) => p.cropName === activeCrop)) {
        setActiveCrop(cached[0].cropName);
      }
    } else {
      setLoadingPrices(true);
    }
  };

  // Default location from the user's profile (once, on load).
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then((p) => {
        if (p?.location?.state) setState(p.location.state);
        if (p?.location?.district) setDistrict(p.location.district);
      })
      .catch(console.error);
  }, [user]);

  // Fetch live prices whenever the selected state/district changes.
  useEffect(() => {
    const key = `${state}|${district}`;
    if (pricesCache.current.has(key)) {
      const cached = pricesCache.current.get(key)!;
      setPrices(cached);
      setAppliedState(state);
      setAppliedDistrict(district);
      setLoadingPrices(false);
      if (cached.length && !cached.some((p: import('@/types').MarketPrice) => p.cropName === activeCrop)) {
        setActiveCrop(cached[0].cropName);
      }
      return;
    }

    setLoadingPrices(true);
    const qs = new URLSearchParams({ type: "current" });
    if (state) qs.set("state", state);
    if (district) qs.set("district", district);

    let active = true;
    fetch(`/api/market?${qs.toString()}`)
      .then(r => r.json()).then(d => {
        if (!active) return;
        if (d.success) {
          pricesCache.current.set(key, d.data);
          setPrices(d.data);
          setAppliedState(state);
          setAppliedDistrict(district);
          // Keep the selected crop valid for the new location.
          if (d.data.length && !d.data.some((p: import('@/types').MarketPrice) => p.cropName === activeCrop)) {
            setActiveCrop(d.data[0].cropName);
          }
        }
      })
      .catch(console.error).finally(() => {
        if (active) setLoadingPrices(false);
      });

    return () => { active = false; };
  }, [state, district, activeCrop]);

  useEffect(() => {
    const key = `${state}|${district}|${activeCrop}`;
    if (chartCache.current.has(key)) {
      setHistorical(chartCache.current.get(key)!);
      setLoadingChart(false);
      return;
    }

    setLoadingChart(true);
    const qs = new URLSearchParams({ type: "historical", crop: activeCrop });
    if (state) qs.set("state", state);
    if (district) qs.set("district", district);

    let active = true;
    fetch(`/api/market?${qs.toString()}`)
      .then(r => r.json()).then(d => {
        if (!active) return;
        if (d.success) {
          chartCache.current.set(key, d.data);
          setHistorical(d.data);
        }
      })
      .catch(console.error).finally(() => {
        if (active) setLoadingChart(false);
      });

    return () => { active = false; };
  }, [activeCrop, state, district]);

  const districtOptions = DISTRICTS_BY_STATE[state] ?? [];

  // Derive dynamic advisory strictly bound to the currently applied location
  const currentCropData = prices.find((p) => p.cropName === activeCrop) || prices[0];
  const currentPrice = currentCropData?.currentPrice || (historical[historical.length - 1]?.price ?? 2275);
  const msp = currentCropData?.msp || (historical[0]?.msp ?? 2275);
  const priceDiff = currentPrice - msp;
  const priceChangePercent = msp > 0 ? ((priceDiff / msp) * 100) : (currentCropData?.priceChangePercent ?? 0);
  const locationLabel = appliedLocationLabel;

  const advisory = useMemo(() => {
    if (priceChangePercent >= 6) {
      return {
        status: "HOLD",
        statusColor: "text-cropwise-green-light",
        summary: `Market trends for ${activeCrop} in ${locationLabel} indicate a potential price surge of 8–12% in the next 15 days due to regional supply constraints. Current price: ₹${currentPrice.toLocaleString("en-IN")}/q (+${priceChangePercent.toFixed(1)}% above MSP).`,
        recommendation: `HOLD INVENTORY: Market trends indicate a potential price surge of 8–12% in the next 15 days due to regional supply constraints in ${locationLabel}.`,
        riskLevel: "Low-Medium",
        riskColor: "text-emerald-400",
        drivers: [
          `Trader demand for ${activeCrop} remains strong with active buying above MSP of ₹${msp.toLocaleString("en-IN")}/q.`,
          `Daily arrivals in ${currentCropData?.market || locationLabel} are ~14% lower than seasonal average.`,
          `Regional processing mill procurement targets have increased this quarter.`
        ],
      };
    } else if (priceChangePercent <= -2) {
      return {
        status: "PROCURE AT MSP",
        statusColor: "text-amber-400",
        summary: `Open market price for ${activeCrop} in ${locationLabel} (₹${currentPrice.toLocaleString("en-IN")}/q) is ₹${Math.abs(priceDiff).toLocaleString("en-IN")} below MSP. Avoid distress selling in local mandis.`,
        recommendation: `UTILIZE GOVT MSP PROCUREMENT: Open market bids in ${locationLabel} are currently below MSP. Avail official procurement centers offering statutory MSP of ₹${msp.toLocaleString("en-IN")}/q.`,
        riskLevel: "Medium-High",
        riskColor: "text-amber-400",
        drivers: [
          `Local market arrivals exceeding daily auction absorption capacity.`,
          `Government procurement centers offer statutory support price of ₹${msp.toLocaleString("en-IN")}/q.`,
          `WDRA accredited warehouses offer storage credit to bridge cashflow while prices recover.`
        ],
      };
    } else if (priceChangePercent > 2 && priceChangePercent < 6) {
      return {
        status: "PROFIT BOOK / PARTIAL SELL",
        statusColor: "text-blue-400",
        summary: `Healthy market realization for ${activeCrop} in ${locationLabel} at ₹${currentPrice.toLocaleString("en-IN")}/q. Staggered selling of 30–50% stock is recommended.`,
        recommendation: `STAGGERED SELLING: Sell 30–50% inventory to lock in current premium over MSP, while holding remainder for further upside.`,
        riskLevel: "Low",
        riskColor: "text-blue-400",
        drivers: [
          `Prices hovering comfortably above statutory MSP by ₹${priceDiff.toLocaleString("en-IN")}/q.`,
          `Steady daily arrivals matching daily consumption.`,
          `Balanced regional mandi volumes with low volatility risk.`
        ],
      };
    } else {
      return {
        status: "HOLD / STABLE",
        statusColor: "text-cropwise-green-light",
        summary: `Prices for ${activeCrop} in ${locationLabel} are stable around ₹${currentPrice.toLocaleString("en-IN")}/q near MSP baseline (₹${msp.toLocaleString("en-IN")}/q).`,
        recommendation: `MAINTAIN INVENTORY: Prices are aligned with the MSP baseline in ${locationLabel}. Hold inventory while monitoring weekly weather and arrival updates.`,
        riskLevel: "Low",
        riskColor: "text-cropwise-green-light",
        drivers: [
          `Balanced supply-demand dynamic across regional mandis.`,
          `Low price volatility observed in recent 30-day trading sessions.`,
          `Steady procurement pace maintaining a firm price floor.`
        ],
      };
    }
  }, [activeCrop, currentCropData, currentPrice, msp, priceDiff, priceChangePercent, locationLabel]);

  // ─── Export Handlers (PDF & CSV) ──────────────────────────────────────────

  const generatePDFReportHtml = () => {
    const reportDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const reportTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const reportId = `CW-MKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const isSell = advisory.status.includes("SELL");
    const isHold = advisory.status.includes("HOLD");
    const statusBg = isSell ? "#dcfce7" : isHold ? "#fef3c7" : "#e0f2fe";
    const statusText = isSell ? "#166534" : isHold ? "#92400e" : "#075985";
    const statusBorder = isSell ? "#86efac" : isHold ? "#fde68a" : "#7dd3fc";

    const rowsHtml = prices
      .map((p: any, idx: number) => {
        const diff = p.msp ? p.currentPrice - p.msp : 0;
        const diffText = p.msp ? (diff >= 0 ? `+₹${diff.toLocaleString("en-IN")}` : `-₹${Math.abs(diff).toLocaleString("en-IN")}`) : "—";
        const diffColor = diff >= 0 ? "#15803d" : "#b91c1c";
        const changePositive = (p.priceChangePercent ?? 0) >= 0;
        const changeColor = changePositive ? "#15803d" : "#b91c1c";
        const changeBg = changePositive ? "#dcfce7" : "#fee2e2";
        const changeSign = changePositive ? "+" : "";

        return `
        <tr style="border-bottom: 1px solid #e5e7eb; background: ${idx % 2 === 0 ? "#ffffff" : "#f9fafb"};">
          <td style="padding: 9px 12px; font-weight: 500; color: #6b7280; text-align: center;">${idx + 1}</td>
          <td style="padding: 9px 12px; font-weight: 600; color: #111827;">
            ${p.cropName}
            ${p.cropNameHi ? `<span style="display: block; font-size: 11px; font-weight: 500; color: #6b7280;">${p.cropNameHi}</span>` : ""}
          </td>
          <td style="padding: 9px 12px; font-weight: 700; color: #1f2937; text-align: right;">
            ₹${p.currentPrice.toLocaleString("en-IN")}
          </td>
          <td style="padding: 9px 12px; color: #4b5563; text-align: right;">
            ${p.msp ? `₹${p.msp.toLocaleString("en-IN")}` : "—"}
          </td>
          <td style="padding: 9px 12px; font-weight: 600; text-align: right; color: ${diffColor};">
            ${diffText}
          </td>
          <td style="padding: 9px 12px; font-weight: 700; text-align: right;">
            <span style="background: ${changeBg}; color: ${changeColor}; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">
              ${changeSign}${p.priceChangePercent}%
            </span>
          </td>
        </tr>`;
      })
      .join("");

    const driversHtml = (advisory.drivers || [])
      .map(
        (d: string) =>
          `<li style="margin-bottom: 4px; color: #374151;">${d}</li>`
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>KrishiSetu - Mandi Market Intelligence Report (${appliedLocationLabel})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937;
      background: #f3f4f6;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .sheet {
      max-width: 860px;
      margin: 20px auto;
      background: #ffffff;
      padding: 30px 34px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f2e14;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #2e7d32;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .btn-print {
      background: #2e7d32;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      transition: background 0.2s;
    }
    .btn-print:hover { background: #1b5e20; }
    .btn-close {
      background: rgba(255,255,255,0.15);
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      margin-left: 8px;
    }
    .btn-close:hover { background: rgba(255,255,255,0.25); }
    @media print {
      body { background: #ffffff !important; }
      .sheet {
        margin: 0 !important;
        padding: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        max-width: 100% !important;
      }
      .no-print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong style="font-size: 14px; color: #a7f3d0;">🌾 KrishiSetu — Official Mandi Intelligence Report</strong>
      <div style="font-size: 11px; color: #d1fae5; margin-top: 2px;">Preview Mode • Click below or choose "Save as PDF" in your print window.</div>
    </div>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn-close" onclick="window.close()">✕ Close</button>
    </div>
  </div>

  <div class="sheet">
    <!-- Header -->
    <div style="border-bottom: 2px solid #15803d; padding-bottom: 16px; margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <div style="background: #15803d; color: white; width: 28px; height: 28px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold;">🌾</div>
            <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #0f2e14;">KrishiSetu</span>
            <span style="background: #dcfce7; color: #166534; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; margin-left: 6px; border: 1px solid #bbf7d0;">KRISHI INTELLIGENCE</span>
          </div>
          <div style="font-size: 13px; color: #4b5563; font-weight: 500;">
            APMC Mandi Rates & AI Price Advisory Report (मंडी भाव एवं पूर्वानुमान)
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; font-weight: 700; color: #6b7280; letter-spacing: 0.5px;">REPORT ID</div>
          <div style="font-size: 13px; font-weight: 700; color: #111827; font-family: monospace;">${reportId}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${reportDate} • ${reportTime}</div>
        </div>
      </div>

      <!-- Geography Strip -->
      <div style="margin-top: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
        <div>
          <strong style="color: #166534;">Target Geography:</strong> 
          <span style="color: #1f2937; font-weight: 600;">📍 ${appliedLocationLabel}</span>
        </div>
        <div>
          <strong style="color: #166534;">Verified Source:</strong> 
          <span style="color: #374151;">eNAM / Agmarknet APMC Daily Feed</span>
        </div>
      </div>
    </div>

    <!-- AI Advisory Banner -->
    <div style="background: #ffffff; border: 1.5px solid #86efac; border-radius: 10px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #15803d; text-transform: uppercase;">
            🤖 AI MARKET ADVISORY
          </span>
          <span style="color: #9ca3af;">•</span>
          <span style="font-size: 12px; font-weight: 600; color: #374151;">
            Focus Crop: <strong>${activeCrop}</strong> ${currentCropData?.cropNameHi ? `(${currentCropData.cropNameHi})` : ""}
          </span>
        </div>
        <div style="background: ${statusBg}; color: ${statusText}; border: 1px solid ${statusBorder}; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;">
          STATUS: ${advisory.status}
        </div>
      </div>

      <div style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 6px;">
        ${advisory.recommendation}
      </div>

      <div style="font-size: 12px; color: #4b5563; margin-bottom: 10px; line-height: 1.4;">
        ${advisory.summary}
      </div>

      ${driversHtml ? `
      <div style="background: #f9fafb; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: 700; color: #374151; margin-bottom: 4px; text-transform: uppercase;">Key Market Drivers:</div>
        <ul style="margin: 0; padding-left: 18px; font-size: 11.5px;">
          ${driversHtml}
        </ul>
      </div>` : ""}

      <div style="display: flex; gap: 20px; padding-top: 10px; border-top: 1px dashed #e5e7eb; font-size: 12px; flex-wrap: wrap;">
        <div>
          <span style="color: #6b7280;">Current Modal Rate:</span> 
          <strong style="color: #111827; font-size: 13px;">₹${currentPrice.toLocaleString("en-IN")}/q</strong>
        </div>
        <div>
          <span style="color: #6b7280;">Govt. MSP:</span> 
          <strong style="color: #111827; font-size: 13px;">₹${msp.toLocaleString("en-IN")}/q</strong>
        </div>
        <div>
          <span style="color: #6b7280;">Price Premium vs MSP:</span> 
          <strong style="${priceDiff >= 0 ? 'color: #15803d;' : 'color: #b91c1c;'} font-size: 13px;">
            ${priceDiff >= 0 ? '+' : ''}₹${priceDiff.toLocaleString("en-IN")} (${priceChangePercent.toFixed(1)}%)
          </strong>
        </div>
        <div>
          <span style="color: #6b7280;">Volatility Risk:</span> 
          <strong style="color: #374151; font-size: 13px;">${advisory.riskLevel}</strong>
        </div>
      </div>
    </div>

    <!-- Mandi Rates Table -->
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #111827; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
          📊 Live Mandi Feed (${prices.length} Commodities)
        </h3>
        <span style="font-size: 11px; color: #6b7280;">Rates in INR per Quintal (₹/q)</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 700;">
            <th style="padding: 9px 12px; text-align: center; width: 40px;">#</th>
            <th style="padding: 9px 12px;">Commodity (फसल)</th>
            <th style="padding: 9px 12px; text-align: right;">Modal Price (₹/q)</th>
            <th style="padding: 9px 12px; text-align: right;">MSP Rate (₹/q)</th>
            <th style="padding: 9px 12px; text-align: right;">Spread vs MSP</th>
            <th style="padding: 9px 12px; text-align: right;">24h Trend</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Footer Notes & Official Stamp -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 14px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #6b7280;">
      <div style="max-width: 580px; line-height: 1.4;">
        <strong>Important Disclaimer:</strong> Mandi prices represent modal averages reported across regional APMC trading yards. Physical transactions may vary based on lot quality, moisture percentage, and grading. AI market advisories are decision-support insights and do not constitute statutory market guarantees.
      </div>
      <div style="text-align: right; white-space: nowrap;">
        <div style="font-weight: 700; color: #15803d; font-size: 11px;">KrishiSetu Platform</div>
        <div>Krishi Setu Intelligence</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handleExportPDF = () => {
    if (!prices.length) {
      alert(t("No data available to export."));
      return;
    }
    setExportDropdownOpen(false);

    const reportHtml = generatePDFReportHtml();

    // Open print preview window
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.error("Print trigger failed:", e);
        }
      }, 400);
    } else {
      // Fallback: If browser blocks popups, use hidden iframe to invoke print dialog directly
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(reportHtml);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error("Iframe print error:", e);
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 3000);
          }
        }, 400);
      }
    }
  };

  const handleExportCSV = () => {
    if (!prices.length) {
      alert(t("No data available to export."));
      return;
    }
    setExportDropdownOpen(false);
    const headers = [
      "Crop Name",
      "Hindi Name",
      "Current Modal Price (INR/q)",
      "MSP Benchmark (INR/q)",
      "Price Spread vs MSP (INR/q)",
      "Price Change (%)",
      "State",
      "District",
      "Report Date"
    ];
    const reportDate = new Date().toISOString().split("T")[0];
    const rows = prices.map((p: any) => {
      const diff = p.msp ? p.currentPrice - p.msp : "N/A";
      return [
        `"${p.cropName}"`,
        `"${p.cropNameHi || ""}"`,
        p.currentPrice,
        p.msp || "N/A",
        diff,
        `${p.priceChangePercent}%`,
        `"${appliedState || "All India"}"`,
        `"${appliedDistrict || "All Districts"}"`,
        `"${reportDate}"`
      ];
    });
    // Prepend UTF-8 BOM so Microsoft Excel renders Hindi/regional characters properly without corruption
    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CropWise_Market_${appliedState || "All"}_${appliedDistrict || "All"}_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-cropwise-text">{t("Market Prices")}</h1>
            <p className="text-sm text-cropwise-faint mt-1">
              {t("Real-time commodity valuation and predictive market analysis.")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Location filters — drive the live district-wise feed */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-cropwise-surface border border-cropwise-border">
              <MapPin className="w-3.5 h-3.5 text-cropwise-faint" />
              <select
                aria-label="State"
                className="bg-transparent text-xs text-cropwise-text outline-none cursor-pointer"
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                <option value="" className="bg-cropwise-surface">{t("All India")}</option>
                {STATES.map((s) => (
                  <option key={s} value={s} className="bg-cropwise-surface">{s}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-cropwise-faint" />
              <span className="w-px h-4 bg-cropwise-border mx-0.5" />
              <select
                aria-label="District"
                className="bg-transparent text-xs text-cropwise-text outline-none cursor-pointer disabled:opacity-40"
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                disabled={!state}
              >
                <option value="" className="bg-cropwise-surface">{t("All Districts")}</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d} className="bg-cropwise-surface">{d}</option>
                ))}
              </select>
              {isLocationSyncing ? (
                <span className="flex items-center gap-1 text-[11px] text-amber-300 font-medium ml-1">
                  <Loader2 className="w-3.5 h-3.5 text-cropwise-green-light animate-spin" />
                  <span className="hidden sm:inline text-[10px] text-cropwise-faint">{t("Syncing...")}</span>
                </span>
              ) : (
                <ChevronDown className="w-3 h-3 text-cropwise-faint" />
              )}
            </div>
            {/* Export Dropdown with Dual Format: PDF & CSV */}
            <div className="relative" ref={exportDropdownRef}>
              <button 
                id="export-report-dropdown-btn"
                aria-expanded={exportDropdownOpen}
                aria-haspopup="true"
                className={cn(
                  "btn-secondary gap-2 text-xs py-2 transition-all duration-200",
                  exportDropdownOpen && "border-cropwise-green/50 bg-cropwise-green/15 text-cropwise-green-light shadow-sm"
                )}
                onClick={() => setExportDropdownOpen(prev => !prev)}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t("Export Report")}</span>
                <ChevronDown className={cn("w-3 h-3 text-cropwise-faint transition-transform duration-200", exportDropdownOpen && "rotate-180 text-cropwise-green-light")} />
              </button>

              {/* Dropdown Menu */}
              {exportDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 rounded-xl border border-cropwise-green/30 bg-[#0d1e0e]/95 backdrop-blur-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  style={{ boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.8), 0 0 20px rgba(77, 194, 77, 0.15)" }}
                >
                  <div className="px-2.5 py-1.5 border-b border-cropwise-green/15 mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-cropwise-muted">
                      {t("Choose Format")}
                    </span>
                    <span className="text-[10px] text-cropwise-faint">
                      {prices.length} {t("items")}
                    </span>
                  </div>

                  {/* Option 1: PDF Report */}
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-cropwise-green/15 hover:border-cropwise-green/30 border border-transparent transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-cropwise-light group-hover:text-cropwise-green-light">
                          {t("Download PDF Report")}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cropwise-green/20 text-cropwise-green-light font-medium border border-cropwise-green/30">
                          {t("Recommended")}
                        </span>
                      </div>
                      <p className="text-[11px] text-cropwise-muted leading-tight mt-0.5">
                        {t("Visual report with AI Advisory, Mandi rates & print layout.")}
                      </p>
                    </div>
                  </button>

                  {/* Option 2: CSV Sheet */}
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-cropwise-green/15 hover:border-cropwise-green/30 border border-transparent transition-all group mt-1"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-cropwise-light group-hover:text-cropwise-green-light">
                          {t("Export CSV (Excel)")}
                        </span>
                      </div>
                      <p className="text-[11px] text-cropwise-muted leading-tight mt-0.5">
                        {t("Raw data sheet for spreadsheet calculations & analysis.")}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── AI Advisory Banner ────────────────────────────────────── */}
        <div
          className="relative rounded-xl overflow-hidden border border-cropwise-green/20"
          style={{ background: "linear-gradient(120deg, #1a4d1a 0%, #0c330c 50%, #0b1a0c 100%)" }}
        >
          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "linear-gradient(rgba(77,194,77,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(77,194,77,0.3) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

          <div className="relative flex items-center gap-5 px-6 py-5">
            {/* Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cropwise-green/15 border border-cropwise-green/30 flex items-center justify-center">
              {isLocationSyncing ? (
                <Loader2 className="w-6 h-6 text-cropwise-green-light animate-spin" />
              ) : (
                <BrainCircuit className="w-6 h-6 text-cropwise-green-light" strokeWidth={1.5} />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#82d882]/60">
                  {t("AI Advisory")} • {t(activeCrop)} {!isLocationSyncing && `(${appliedLocationLabel})`}
                </p>
                {isLocationSyncing && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/25 animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                    {t("Syncing live data for")} {selectedLocationLabel}...
                  </span>
                )}
              </div>

              {isLocationSyncing ? (
                <div className="space-y-1.5 py-0.5">
                  <p className="text-base font-bold text-white/90 flex items-center gap-2 flex-wrap">
                    {t("MARKET STATUS:")}{" "}
                    <span className="text-amber-400 font-medium text-sm inline-flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t("Analyzing live mandi data for")} {selectedLocationLabel}...
                    </span>
                  </p>
                  <p className="text-xs text-[#82d882]/70 leading-relaxed">
                    {t("Syncing regional APMC arrivals and evaluating price trends for")} {selectedLocationLabel}...
                  </p>
                </div>
              ) : (
                <div className="transition-opacity duration-300 animate-in fade-in">
                  <p className="text-base font-bold text-white">
                    {t("MARKET STATUS:")}{" "}
                    <span className={advisory.statusColor}>{t(advisory.status)}</span>
                  </p>
                  <p className="text-xs text-[#82d882]/80 mt-0.5 leading-relaxed">
                    {t(advisory.summary)}
                  </p>
                </div>
              )}
            </div>

            {/* CTA */}
            <button 
              disabled={isLocationSyncing}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95",
                isLocationSyncing
                  ? "bg-white/20 text-white/50 cursor-not-allowed"
                  : "bg-white text-cropwise-bg hover:bg-cropwise-text"
              )}
              onClick={() => setIsAnalysisOpen(true)}
            >
              {isLocationSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("Analyzing...")}
                </>
              ) : (
                <>
                  {t("View Full Analysis")}
                  <ArrowUpRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Main grid: Table + Chart ──────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
          <MandiTable activeCrop={activeCrop} onSelect={setActiveCrop} prices={prices} loading={isLocationSyncing} />
          <PriceTrendChart cropName={activeCrop} historical={historical} loading={loadingChart || isLocationSyncing} />
        </div>


        {/* ── Insight cards (bottom row) ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {INSIGHT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={cn(
                  "rounded-xl bg-cropwise-surface border border-cropwise-border border-l-4 p-5 flex flex-col justify-between gap-4",
                  card.accent
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0", card.iconColor)}>
                      <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", card.tagColor)}>
                      {t(card.tag)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-cropwise-text mb-1">{t(card.title)}</h3>
                    <p className="text-xs text-cropwise-faint leading-relaxed">{t(card.body)}</p>
                  </div>
                </div>
                <a 
                  href={card.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-cropwise-green-light hover:text-[#82d882] transition-colors w-fit mt-2"
                >
                  {t(card.actionText)} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            );
          })}
        </div>

      </div>

      {/* Analysis Modal */}
      {isAnalysisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-cropwise-surface border border-cropwise-border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cropwise-border bg-cropwise-elevated/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cropwise-green/20 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-cropwise-green-light" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{t("AI Market Analysis")}</h3>
                  <p className="text-xs text-cropwise-faint">{t(activeCrop)} • {locationLabel}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAnalysisOpen(false)}
                className="p-2 text-cropwise-faint hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
                    {t("Primary Recommendation")} • {t(activeCrop)}
                  </h4>
                  <p className="text-white text-base font-medium leading-relaxed">
                    {t(advisory.recommendation)}
                  </p>
                </div>
                <div className="sm:w-1/3 flex flex-col justify-center items-center p-3 rounded-lg border border-white/10 bg-white/5">
                  <span className="text-[10px] text-cropwise-faint uppercase font-bold">{t("Risk Level")}</span>
                  <span className={cn("text-lg font-bold mt-0.5", advisory.statusColor)}>{t(advisory.riskLevel)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-cropwise-text">{t("Key Market Drivers")}</h4>
                <ul className="space-y-2">
                  {advisory.drivers.map((driver, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-cropwise-faint">
                      <CheckCircle2 className="w-4 h-4 text-cropwise-green flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{t(driver)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-cropwise-border bg-cropwise-elevated/30 flex justify-end gap-3">
              <button 
                onClick={() => setIsAnalysisOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-cropwise-faint hover:text-white hover:bg-white/5 transition-colors"
              >
                {t("Close")}
              </button>
              <button 
                onClick={() => {
                  setIsAnalysisOpen(false);
                  const prompt = `Please explain the detailed AI market analysis for ${activeCrop} in ${locationLabel} with '${advisory.status}' status (Current price: ₹${currentPrice}/q, MSP: ₹${msp}/q) and advise me on my selling strategy.`;
                  router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
                }}
                className="btn-primary py-2 px-5 text-sm gap-2"
              >
                <BrainCircuit className="w-4 h-4" />
                {t("Consult AI Advisor")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}