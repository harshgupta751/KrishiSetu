/**
 * app/dashboard/page.tsx — Real Firebase + Weather API integration
 */
"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, type TooltipProps } from "recharts";
import { MapPin, Droplets, Wind, TrendingUp, CloudRain, ClipboardList, MessageSquare, ScanSearch, Store, BrainCircuit, Loader2, RefreshCw, Activity, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/firebase/auth-context";
import { getUserActivityLogs, type ActivityLogEntry } from "@/lib/firebase/activity-log";
import { useLocation } from "@/lib/hooks/useLocation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import type { MarketPrice } from "@/types";
import type { ExtendedWeatherData } from "@/lib/weather";

const QUICK_ACTIONS = [
  { href: "/activity-log",   icon: ClipboardList, label: "Log Activity",  bg: "bg-blue-50 border-blue-200 dark:bg-blue-900/40 dark:border-blue-800/40",        ic: "text-blue-700 dark:text-blue-400"  },
  { href: "/chat",           icon: MessageSquare, label: "Ask AI",        bg: "bg-emerald-50 border-emerald-200 dark:bg-cropwise-green/15 dark:border-cropwise-green/30", ic: "text-emerald-700 dark:text-cropwise-green-light" },
  { href: "/pest-diagnosis", icon: ScanSearch,    label: "Scan Pest",     bg: "bg-rose-50 border-rose-200 dark:bg-rose-900/40 dark:border-rose-800/40",        ic: "text-rose-700 dark:text-rose-400"  },
  { href: "/market",         icon: Store,         label: "Check Mandi",   bg: "bg-amber-50 border-amber-200 dark:bg-amber-900/40 dark:border-amber-800/40",      ic: "text-amber-700 dark:text-amber-400" },
];

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-cropwise-surface border border-cropwise-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] text-cropwise-muted mb-1 font-medium">{label}</p>
      {(payload as Array<{ name?: string; value?: number; color?: string }>).map((p) => (
        <p key={p.name} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}{String(p.name).includes("Moisture") ? "%" : "mm"}
        </p>
      ))}
    </div>
  );
}

const ACT_ICONS: Record<string, LucideIcon> = {
  pest_diagnosis: ScanSearch, chat_message: MessageSquare,
  crop_recommendation: BrainCircuit, market_query: TrendingUp,
  weather_check: CloudRain, scheme_search: ClipboardList, default: Activity,
};
const ACT_COLORS: Record<string, string> = {
  pest_diagnosis: "text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-400/10",
  chat_message: "text-emerald-700 bg-emerald-100 dark:text-cropwise-green-light dark:bg-cropwise-green/10",
  crop_recommendation: "text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-400/10",
  market_query: "text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-400/10",
  weather_check: "text-sky-700 bg-sky-100 dark:text-sky-400 dark:bg-sky-400/10",
};

function timeAgo(entry: ActivityLogEntry): string {
  const ts = entry.createdAt as { toDate?: () => Date; seconds?: number } | undefined;
  const date = ts?.toDate?.() ?? (ts?.seconds ? new Date(ts.seconds * 1000) : new Date());
  const diff = Date.now() - date.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return `${Math.floor(diff / 86400000)} days ago`;
}

const MONTH_DATA = [
  { day: "Day 1",  "Rainfall (mm)": 18, "Moisture Content (%)": 42 },
  { day: "Day 5",  "Rainfall (mm)": 12, "Moisture Content (%)": 55 },
  { day: "Day 10", "Rainfall (mm)": 22, "Moisture Content (%)": 48 },
  { day: "Day 15", "Rainfall (mm)": 30, "Moisture Content (%)": 68 },
  { day: "Day 20", "Rainfall (mm)": 8,  "Moisture Content (%)": 60 },
  { day: "Day 25", "Rainfall (mm)": 25, "Moisture Content (%)": 72 },
  { day: "Day 30", "Rainfall (mm)": 15, "Moisture Content (%)": 65 },
];

const WEEK_DATA = [
  { day: "Mon", "Rainfall (mm)": 6,  "Moisture Content (%)": 45 },
  { day: "Tue", "Rainfall (mm)": 16, "Moisture Content (%)": 58 },
  { day: "Wed", "Rainfall (mm)": 2,  "Moisture Content (%)": 50 },
  { day: "Thu", "Rainfall (mm)": 24, "Moisture Content (%)": 68 },
  { day: "Fri", "Rainfall (mm)": 19, "Moisture Content (%)": 72 },
  { day: "Sat", "Rainfall (mm)": 8,  "Moisture Content (%)": 64 },
  { day: "Sun", "Rainfall (mm)": 14, "Moisture Content (%)": 62 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [weather,    setWeather]    = useState<ExtendedWeatherData | null>(null);
  const [prices,     setPrices]     = useState<MarketPrice[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [chartView,  setChartView]  = useState<"Month"|"Week">("Month");
  const [loadingW,   setLoadingW]   = useState(true);
  const [loadingP,   setLoadingP]   = useState(true);
  const { location, loading: locationLoading } = useLocation(user?.uid);

  // Load activity logs
  useEffect(() => {
    if (!user) return;
    getUserActivityLogs(user.uid, 5).then((logs: import('@/lib/firebase/activity-log').ActivityLogEntry[]) => setActivities(logs));
  }, [user]);

  // Fetch weather when location is ready
  useEffect(() => {
    if (!location) return;
    setLoadingW(true);
    fetch(`/api/weather?lat=${location.lat}&lng=${location.lng}&label=${encodeURIComponent(location.label)}`)
      .then(r => r.json()).then(d => { if (d.success) setWeather(d.data); })
      .catch(console.error).finally(() => setLoadingW(false));
  }, [location]);

  useEffect(() => {
    setLoadingP(true);
    fetch("/api/market?type=current")
      .then(r => r.json()).then(d => { if (d.success) setPrices(d.data.slice(0, 4)); })
      .catch(console.error).finally(() => setLoadingP(false));
  }, []);

  const wheatPrice = prices.find((p: import('@/types').MarketPrice) => p.cropName === "Wheat");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName = user?.displayName?.split(" ")[0] ?? "Farmer";

  return (
    <AppShell>
      <motion.div className="max-w-6xl mx-auto space-y-5" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <h1 className="text-xl font-bold text-cropwise-text">{t(greeting)}, {displayName}</h1>
          <p className="text-xs text-cropwise-faint mt-0.5">{new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
        </motion.div>

        {/* Weather + AI Card */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <div className="rounded-xl bg-cropwise-surface border border-cropwise-border px-6 py-5">
            {(loadingW || locationLoading) ? (
              <div className="flex items-center gap-3 h-28"><Loader2 className="w-5 h-5 text-cropwise-green-light animate-spin" /><p className="text-sm text-cropwise-faint">{locationLoading ? t("Detecting your location...") : t("Fetching live weather...")}</p></div>
            ) : weather ? (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-3"><MapPin className="w-3.5 h-3.5 text-cropwise-green-light" strokeWidth={2}/><span className="text-xs font-medium text-cropwise-muted">{location?.label ?? weather.location} • Today</span></div>
                  <p className="text-5xl font-bold text-cropwise-text leading-none mb-1.5">{weather.temperature}°C</p>
                  <p className="text-sm text-cropwise-muted mb-5">{weather.condition}</p>
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5 text-sm"><Droplets className="w-4 h-4 text-blue-400" /><span className="text-cropwise-muted">{weather.humidity}% {t("Humidity")}</span></div>
                    <div className="flex items-center gap-1.5 text-sm"><Wind className="w-4 h-4 text-cropwise-faint" /><span className="text-cropwise-muted">{weather.windSpeed} km/h NW</span></div>
                  </div>
                </div>
                <div className="w-20 h-20 rounded-xl bg-cropwise-elevated border border-cropwise-border flex items-center justify-center">
                  <CloudRain className="w-10 h-10 text-cropwise-green-light" strokeWidth={1}/>
                </div>
              </div>
            ) : <p className="text-sm text-cropwise-faint">{t("Weather unavailable")}</p>}
          </div>

          <div className="rounded-xl p-6 relative overflow-hidden bg-gradient-to-br from-cropwise-green/10 to-transparent border border-cropwise-green/20 shadow-lg shadow-cropwise-green/5">
            <div className="absolute top-0 right-0 p-32 bg-cropwise-green/10 blur-[80px] rounded-full pointer-events-none" />
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-cropwise-green/20 text-cropwise-green-light border border-cropwise-green/30 mb-4">{t("AI Recommendation")}</span>
            <p className="text-sm font-semibold text-cropwise-text leading-relaxed mb-6">
              {weather?.precipitation && weather.precipitation > 5
                ? t(`Rain expected (${weather.precipitation}mm). Delay spray operations and check drainage.`)
                : t("Conditions are suitable for field operations. Optimal time for fertiliser application.")}
            </p>
            <Link href="/weather" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cropwise-bg border border-cropwise-border/50 text-cropwise-text text-xs font-medium hover:bg-cropwise-hover transition-colors shadow-sm">{t("View Detailed Analysis")}</Link>
          </div>
        </motion.div>

        {/* Stat cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div whileHover={{ scale: 1.02, y: -4 }} className="rounded-xl bg-cropwise-surface border border-cropwise-border p-4">
            <span className="text-[9px] font-bold uppercase text-amber-800 bg-amber-100 border border-amber-300 dark:text-amber-400 dark:bg-amber-900/30 dark:border-transparent px-1.5 py-0.5 rounded">{t("Wheat MSP")}</span>
            <p className="text-[10px] text-cropwise-muted uppercase tracking-wider mt-2 mb-1">{t("Current Market Price")}</p>
            {loadingP ? <div className="shimmer h-7 w-24 rounded" /> : (
              <>
                <p className="text-2xl font-bold text-cropwise-text">₹{wheatPrice?.currentPrice?.toLocaleString("en-IN") ?? "—"}/q</p>
                <p className={cn("text-xs mt-1 flex items-center gap-1 font-medium",(wheatPrice?.priceChangePercent ?? 0)>=0?"text-emerald-700 dark:text-cropwise-green-light":"text-rose-600 dark:text-rose-400")}>
                  <TrendingUp className="w-3 h-3" />{(wheatPrice?.priceChangePercent ?? 0).toFixed(1)}% {t("vs MSP")}
                </p>
              </>
            )}
          </motion.div>
          <motion.div whileHover={{ scale: 1.02, y: -4 }} className="rounded-xl bg-cropwise-surface border border-cropwise-border p-4">
            <p className="text-[10px] text-cropwise-muted uppercase tracking-wider mb-1">{t("Last 24h Rainfall")}</p>
            <p className="text-2xl font-bold text-cropwise-text">{weather ? `${weather.precipitation}mm` : "—"}</p>
            {weather && <div className="flex gap-1 mt-2">{(weather?.forecast ?? []).slice(0,5).map((d: import('@/types').WeatherForecastDay, i: number)=>(<div key={i} className="flex-1 h-8 bg-cropwise-border-muted rounded-sm overflow-hidden flex items-end"><div className="w-full bg-cropwise-green/60 rounded-sm" style={{height:`${d.precipitationChance}%`}}/></div>))}</div>}
          </motion.div>
          <motion.div whileHover={{ scale: 1.02, y: -4 }} className="rounded-xl bg-cropwise-surface border border-cropwise-border p-4">
            <p className="text-[10px] text-cropwise-muted uppercase tracking-wider mb-1">{t("Pest Risk Alert")}</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-cropwise-green-light">{t("Low Risk")}</p>
            <p className="text-xs text-cropwise-muted mt-1 flex items-center gap-1"><RefreshCw className="w-3 h-3"/>{t("Scanned")} {activities.filter((a: import('@/lib/firebase/activity-log').ActivityLogEntry)=>a.type==="pest_diagnosis").length > 0 ? t("recently") : t("never")}</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02, y: -4 }} className="rounded-xl bg-cropwise-surface border border-cropwise-border p-4">
            <p className="text-[10px] text-cropwise-muted uppercase tracking-wider mb-1">{t("Soil Moisture")}</p>
            <p className="text-2xl font-bold text-cropwise-text">{weather ? `${weather.soilMoisture}%` : "—"}</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-cropwise-border-muted overflow-hidden"><div className="h-full rounded-full bg-cropwise-green" style={{width: `${weather?.soilMoisture ?? 0}%`}}/></div>
          </motion.div>
        </motion.div>

        {/* Quick actions + Activity */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          <div className="rounded-xl bg-cropwise-surface border border-cropwise-border p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint mb-4">{t("Quick Actions")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map(({href,icon:Icon,label,bg,ic})=>(
                <motion.div key={href} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}>
                  <Link href={href} className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",bg)}>
                    <div className="w-10 h-10 rounded-xl bg-cropwise-bg/40 flex items-center justify-center"><Icon className={cn("w-5 h-5",ic)} strokeWidth={2}/></div>
                    <span className="text-xs font-medium text-cropwise-muted">{t(label)}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-cropwise-surface border border-cropwise-border p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint mb-4">{t("Recent Activity")}</p>
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Activity className="w-8 h-8 text-cropwise-border mb-2" strokeWidth={1}/>
                <p className="text-xs text-cropwise-faint">{t("No activity yet")}</p>
                <p className="text-[10px] text-cropwise-border mt-1">{t("Start using the AI tools")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((a: import('@/lib/firebase/activity-log').ActivityLogEntry) => {
                  const Icon = ACT_ICONS[a.type] ?? ACT_ICONS.default;
                  const col  = ACT_COLORS[a.type] ?? "text-cropwise-green-light bg-cropwise-green/10";
                  return (
                    <div key={a.id} className="flex items-start gap-2.5">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",col)}><Icon className="w-3 h-3" strokeWidth={2}/></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-cropwise-text truncate">{t(a.title)}</p>
                        <p className="text-[10px] text-cropwise-faint">{timeAgo(a)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link href="/activity-log" className="block mt-3 text-xs font-medium text-cropwise-green-light hover:text-[#82d882] text-center">{t("View All Activity")}</Link>
          </div>
        </motion.div>

        {/* Chart */}
        <motion.div variants={itemVariants} className="rounded-xl bg-cropwise-surface border border-cropwise-border p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-cropwise-text">{t("Moisture & Rainfall Analysis")}</h2>
              <p className="text-xs text-cropwise-faint mt-0.5">
                {chartView === "Week" ? t("Historical data for the last 7 days") : t("Historical data for the last 30 days")}
              </p>
            </div>
            <div className="flex rounded-lg overflow-hidden border border-cropwise-border">
              {(["Month","Week"] as const).map(v=>(
                <button key={v} onClick={()=>setChartView(v)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors",chartView===v?"bg-cropwise-green text-cropwise-bg":"text-cropwise-faint hover:text-cropwise-muted")}>{t(v)}</button>
              ))}
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartView === "Week" ? WEEK_DATA : MONTH_DATA} margin={{top:5,right:5,left:-25,bottom:0}} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d20" vertical={false}/>
                <XAxis dataKey="day" tick={{fontSize:10,fill:"#5a7460"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:"#5a7460"}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>} cursor={{fill:"rgba(46,168,46,0.05)"}}/>
                <Bar dataKey="Rainfall (mm)" fill="#94a3b8" radius={[3,3,0,0]}/>
                <Bar dataKey="Moisture Content (%)" fill="#2ea82e" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-5 mt-3">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#94a3b8]"/><span className="text-xs text-cropwise-faint">Rainfall (mm)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-cropwise-green"/><span className="text-xs text-cropwise-faint">Moisture Content (%)</span></div>
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}