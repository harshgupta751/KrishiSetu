/**
 * app/weather/page.tsx
 * Weather Intelligence — uses browser GPS for actual location.
 * Falls back to profile state → default (Bhopal) if GPS denied.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, type TooltipProps,
} from "recharts";
import {
  MapPin, RefreshCw, Download, Sun, Cloud, CloudRain,
  CloudDrizzle, Wind, Eye, Droplets, Sunrise, Sunset,
  ChevronLeft, ChevronRight, AlertTriangle, Droplet,
  Zap, Gauge, Sparkles, Loader2, LocateFixed,
  ChevronDown, FileText, FileSpreadsheet, X,
  ShieldAlert, Sprout, ArrowRight, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/firebase/auth-context";
import { useLocation } from "@/lib/hooks/useLocation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import type { WeatherForecastDay } from "@/types";
import type { ExtendedWeatherData } from "@/lib/weather";

// ─── AI Alerts (dynamic based on real weather data) ──────────────────────────

function buildAlerts(w: ExtendedWeatherData) {
  const alerts = [];
  const rainTomorrow = w.forecast[1]?.precipitationChance ?? 0;
  const rainToday    = w.forecast[0]?.precipitationChance ?? 0;

  // Spray window
  const goodSpray = w.windSpeed < 15 && w.humidity < 70 && rainToday < 30;
  alerts.push({
    category:      "Spray Window",
    categoryColor: "text-cropwise-green-light",
    accent:        "border-l-cropwise-green",
    message:       goodSpray
      ? "Optimal Spray Window: 08:00 AM – 11:00 AM"
      : "Avoid spraying — high wind or rain expected today",
  });

  // Smart Irrigation tip (Water Conservation)
  const estimatedWaterSavings = 4000; // Mock calculation based on average farm size
  alerts.push({
    category:      "Smart Irrigation Tip",
    categoryColor: "text-blue-400",
    accent:        "border-l-blue-500",
    message:       rainTomorrow > 60
      ? `Skip Irrigation: ${w.forecast[1]?.precipitationChance}% rain expected tomorrow. By waiting, you could save ~${estimatedWaterSavings}L of water.`
      : w.soilMoisture < 35
        ? "Irrigate now — soil moisture is low. Use drip irrigation if possible to minimize evaporation."
        : "Soil moisture adequate — no irrigation needed today. Conserve water.",
  });

  // Hazard alert
  const maxRain = Math.max(...w.forecast.slice(0, 3).map(d => d.precipitationChance));
  alerts.push({
    category:      "Hazard Alert",
    categoryColor: maxRain > 70 ? "text-rose-400" : "text-cropwise-faint",
    accent:        maxRain > 70 ? "border-l-rose-500" : "border-l-cropwise-border",
    message:       maxRain > 70
      ? `Rain Alert: High probability (${maxRain}%) in next 3 days`
      : "No hazard alerts for the next 72 hours",
  });

  return alerts;
}

// ─── Weather condition icon ───────────────────────────────────────────────────

function ConditionIcon({ code, className }: { code: string; className?: string }) {
  const p = { className: cn("w-5 h-5", className), strokeWidth: 1.5 as const };
  switch (code) {
    case "sunny":        return <Sun       {...p} />;
    case "rain":         return <CloudRain {...p} />;
    case "drizzle":      return <CloudDrizzle {...p} />;
    default:             return <Cloud     {...p} />;
  }
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const temp = (payload as Array<{ dataKey: string; value: number; color?: string }>).find(p => p.dataKey === "temp")?.value;
  const rain = (payload as Array<{ dataKey: string; value: number; color?: string }>).find(p => p.dataKey === "rain")?.value;
  return (
    <div className="bg-cropwise-surface border border-cropwise-border rounded-xl px-3 py-2.5 shadow-xl">
      <p className="text-[10px] text-cropwise-faint mb-1.5 font-medium">{label}</p>
      {temp !== undefined && <p className="text-xs font-semibold text-cropwise-text">Temp: {temp}°C</p>}
      {rain !== undefined && <p className="text-xs font-semibold text-blue-400">Rain: {rain}%</p>}
    </div>
  );
}

// ─── Forecast card ────────────────────────────────────────────────────────────

interface ForecastCardProps {
  key?: React.Key;
  day: WeatherForecastDay;
  isActive: boolean;
  onClick: () => void;
}

function ForecastCard({ day, isActive, onClick }: ForecastCardProps) {
  return (
    <button onClick={onClick}
      className={cn(
        "flex-shrink-0 w-36 flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition-all duration-200",
        isActive ? "bg-cropwise-elevated border-cropwise-green/50 shadow-[0_0_16px_rgba(46,168,46,0.12)]"
                 : "bg-cropwise-surface border-cropwise-border hover:border-cropwise-border"
      )}>
      <p className={cn("text-xs font-semibold", isActive ? "text-cropwise-text" : "text-cropwise-faint")}>
        {day.dayName}
      </p>
      <ConditionIcon code={day.conditionCode}
        className={cn("!w-8 !h-8", isActive ? "text-cropwise-green-light" : "text-cropwise-faint")} />
      <div className="text-center">
        <p className={cn("text-base font-bold leading-none", isActive ? "text-cropwise-text" : "text-cropwise-muted")}>
          {day.high}° / {day.low}°
        </p>
        <p className="text-[10px] text-cropwise-faint mt-1 uppercase tracking-wider">
          {day.precipitationChance}% Precip
        </p>
      </div>
    </button>
  );
}

// ─── Climate Resilience Banner ────────────────────────────────────────────────
function ClimateResilienceBanner({ weather }: { weather: ExtendedWeatherData }) {
  const { language } = useI18n();
  const [alertText, setAlertText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine threat (using slightly lower thresholds to ensure it triggers during demos)
  const maxRain = Math.max(...weather.forecast.slice(0, 3).map(d => d.precipitationChance));
  const maxTemp = Math.max(...weather.forecast.slice(0, 3).map(d => d.high));
  
  let threat = null;
  let threatType = "";
  if (maxTemp >= 38) {
    threat = `Severe Heatwave (${maxTemp}°C)`;
    threatType = "heat";
  } else if (maxRain >= 60) {
    threat = `Heavy Unseasonal Rain (${maxRain}% probability)`;
    threatType = "rain";
  }

  useEffect(() => {
    if (!threat) {
      setLoading(false);
      return;
    }
    
    const fetchAlert = async () => {
      try {
        const prompt = `The farmer is facing a severe climate threat: ${threat} in the next 3 days. Generate a strict, 2-sentence Climate Resilience Alert telling them exactly what emergency protective measures to take today to save their crop.`;
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "chat", prompt, language })
        });
        const data = await res.json();
        if (data.success && data.text) {
          setAlertText(data.text);
        } else {
          setAlertText("Deploy shade nets and increase irrigation frequency to mitigate heat stress.");
        }
      } catch {
        setAlertText("Please take immediate protective measures for your crops based on the upcoming extreme weather.");
      } finally {
        setLoading(false);
      }
    };
    fetchAlert();
  }, [threat, language]);

  if (!threat) return null;

  return (
    <div className={cn("rounded-xl p-4 border relative overflow-hidden mb-5", threatType === "heat" ? "bg-amber-500/10 border-amber-500/30" : "bg-blue-500/10 border-blue-500/30")}>
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')]" />
      <div className="flex gap-4 relative z-10">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", threatType === "heat" ? "bg-amber-500/20 text-amber-500" : "bg-blue-500/20 text-blue-500")}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className={cn("text-base font-bold flex items-center gap-2 mb-1", threatType === "heat" ? "text-amber-500" : "text-blue-400")}>
            <Sparkles className="w-4 h-4" /> AI Climate Resilience Alert: {threat}
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 mt-2 text-sm text-cropwise-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> Generating protective measures...
            </div>
          ) : (
            <p className="text-sm text-cropwise-text leading-relaxed pr-4">{alertText}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WeatherPage() {
  const router = useRouter();
  const { user }   = useAuth();
  const { t } = useI18n();
  const { location, loading: locationLoading, error: gpsError, refresh: refreshLocation } = useLocation(user?.uid);
  const [weather,      setWeather]      = useState<ExtendedWeatherData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [refreshing,   setRefreshing]   = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false);
  const [refreshToast, setRefreshToast] = useState<string | null>(null);
  const forecastScrollRef = useRef<HTMLDivElement>(null);

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

  // ── Reverse geocode coordinates → city name ─────────────────────────────
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.address;
      const city = addr.city || addr.town || addr.village || addr.county || "";
      const state = addr.state || "";
      return city && state ? `${city}, ${state}` : state || "Your Location";
    } catch {
      return "Your Location";
    }
  };

  // ── Fetch weather for given coords ──────────────────────────────────────
  const fetchWeather = useCallback(async (lat: number, lng: number, label: string) => {
    setLoading(true);
    try {
      const res  = await fetch(
        `/api/weather?lat=${lat}&lng=${lng}&label=${encodeURIComponent(label)}`
      );
      const data = await res.json();
      if (data.success) setWeather(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch weather when location detected
  useEffect(() => {
    if (!location) return;
    fetchWeather(location.lat, location.lng, location.label);
  }, [location, fetchWeather]);

  const handleRefresh = async () => {
    setRefreshing(true);
    refreshLocation();
    if (location) {
      await fetchWeather(location.lat, location.lng, location.label);
    }
    setRefreshToast(t("Weather and soil conditions refreshed live."));
    setTimeout(() => setRefreshToast(null), 3000);
  };

  const handleScrollForecast = (direction: "left" | "right") => {
    if (forecastScrollRef.current) {
      const scrollAmount = direction === "left" ? -220 : 220;
      forecastScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
    if (direction === "left") {
      setActiveDayIdx((prev) => Math.max(0, prev - 1));
    } else {
      setActiveDayIdx((prev) => Math.min((weather?.forecast?.length ?? 1) - 1, prev + 1));
    }
  };

  const generatePDFReportHtml = () => {
    if (!weather) return "";
    const reportDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const reportTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const reportId = `CW-WX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const forecastRowsHtml = (weather.forecast ?? [])
      .map((d: WeatherForecastDay, idx: number) => {
        const isRain = d.precipitationChance > 40;
        return `
        <tr style="border-bottom: 1px solid #e5e7eb; background: ${idx % 2 === 0 ? "#ffffff" : "#f9fafb"};">
          <td style="padding: 9px 12px; font-weight: 600; color: #111827;">${d.dayName} (${d.date})</td>
          <td style="padding: 9px 12px; color: #374151;">${d.condition}</td>
          <td style="padding: 9px 12px; font-weight: 700; color: #111827; text-align: right;">${d.high}°C</td>
          <td style="padding: 9px 12px; color: #6b7280; text-align: right;">${d.low}°C</td>
          <td style="padding: 9px 12px; text-align: right; font-weight: 700;">
            <span style="background: ${isRain ? '#fee2e2' : '#e0f2fe'}; color: ${isRain ? '#b91c1c' : '#0369a1'}; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">
              ${d.precipitationChance}%
            </span>
          </td>
        </tr>`;
      })
      .join("");

    const alertsHtml = alerts
      .map(
        (a) => `
        <div style="padding: 10px 14px; border-left: 3px solid #16a34a; background: #f0fdf4; border-radius: 4px; margin-bottom: 8px;">
          <strong style="display: block; font-size: 11px; text-transform: uppercase; color: #166534; margin-bottom: 2px;">
            ${a.category}
          </strong>
          <span style="font-size: 12.5px; color: #1f2937;">${a.message}</span>
        </div>`
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>KrishiSetu - Weather & Agronomic Intelligence Report (${location?.label || "Local Farm"})</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
    @media print {
      body { background: #ffffff !important; }
      .sheet { margin: 0 !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; max-width: 100% !important; }
      .no-print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong style="font-size: 14px; color: #a7f3d0;">🌾 KrishiSetu — Weather & Soil Intelligence Report</strong>
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
            <span style="background: #dcfce7; color: #166534; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; margin-left: 6px; border: 1px solid #bbf7d0;">WEATHER INTELLIGENCE</span>
          </div>
          <div style="font-size: 13px; color: #4b5563; font-weight: 500;">
            Real-time Agro-Meteorological & Soil Advisory Report
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
          <strong style="color: #166534;">Farm Location:</strong> 
          <span style="color: #1f2937; font-weight: 600;">📍 ${location?.label || "Local Coordinates"}</span>
        </div>
        <div>
          <strong style="color: #166534;">Data Provider:</strong> 
          <span style="color: #374151;">Open-Meteo High-Resolution Meteorological Model</span>
        </div>
      </div>
    </div>

    <!-- Live Conditions & Soil Health Grid -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
      <!-- Live Atmospheric Conditions -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; margin: 0 0 10px 0;">
          ⛅ Live Conditions
        </h3>
        <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px;">
          <span style="font-size: 36px; font-weight: 800; color: #111827;">${weather.temperature}°C</span>
          <span style="font-size: 14px; font-weight: 600; color: #4b5563;">${weather.condition} (Feels like ${weather.feelsLike}°C)</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
          <div><span style="color: #6b7280;">Humidity:</span> <strong>${weather.humidity}%</strong></div>
          <div><span style="color: #6b7280;">Wind:</span> <strong>${weather.windSpeed} km/h ${weather.windDirection || "NW"}</strong></div>
          <div><span style="color: #6b7280;">Visibility:</span> <strong>${weather.visibility} km</strong></div>
          <div><span style="color: #6b7280;">UV Index:</span> <strong>${weather.uvIndex}</strong></div>
          <div><span style="color: #6b7280;">Sunrise:</span> <strong>${weather.sunrise || "06:12 AM"}</strong></div>
          <div><span style="color: #6b7280;">Sunset:</span> <strong>${weather.sunset || "06:45 PM"}</strong></div>
        </div>
      </div>

      <!-- Soil & Agro-Met Card -->
      <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 14px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; margin: 0 0 10px 0;">
          🌱 Soil Moisture & Agronomic Factors
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
          <div style="background: white; padding: 8px 10px; border-radius: 6px; border: 1px solid #dcfce7;">
            <div style="color: #6b7280; font-size: 10.5px;">Soil Moisture (0-1cm)</div>
            <div style="font-size: 16px; font-weight: 800; color: #15803d; margin-top: 2px;">
              ${weather.soilMoisture}% <span style="font-size: 11px; font-weight: 600; color: #166534;">(${weather.soilMoisture > 60 ? "Healthy" : weather.soilMoisture > 30 ? "Moderate" : "Dry"})</span>
            </div>
          </div>
          <div style="background: white; padding: 8px 10px; border-radius: 6px; border: 1px solid #dcfce7;">
            <div style="color: #6b7280; font-size: 10.5px;">Evapotranspiration (ET₀)</div>
            <div style="font-size: 16px; font-weight: 800; color: #15803d; margin-top: 2px;">
              ${weather.evapotranspiration} <span style="font-size: 11px; font-weight: normal; color: #6b7280;">mm/day</span>
            </div>
          </div>
          <div style="background: white; padding: 8px 10px; border-radius: 6px; border: 1px solid #dcfce7;">
            <div style="color: #6b7280; font-size: 10.5px;">Solar Radiation</div>
            <div style="font-size: 16px; font-weight: 800; color: #15803d; margin-top: 2px;">
              ${weather.solarRadiation} <span style="font-size: 11px; font-weight: normal; color: #6b7280;">kWh/m²</span>
            </div>
          </div>
          <div style="background: white; padding: 8px 10px; border-radius: 6px; border: 1px solid #dcfce7;">
            <div style="color: #6b7280; font-size: 10.5px;">Soil Surface Temp</div>
            <div style="font-size: 16px; font-weight: 800; color: #15803d; margin-top: 2px;">
              ${weather.soilTemp}°C
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Agronomist Alerts -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 12.5px; font-weight: 800; color: #111827; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">
        🤖 AI Agronomist Daily Action Plan
      </h3>
      ${alertsHtml}
    </div>

    <!-- 7-Day Local Forecast Table -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 12.5px; font-weight: 800; color: #111827; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">
        📅 7-Day Local Agricultural Forecast
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb; color: #374151; font-weight: 700;">
            <th style="padding: 9px 12px;">Day & Date</th>
            <th style="padding: 9px 12px;">Weather Condition</th>
            <th style="padding: 9px 12px; text-align: right;">High Temp (°C)</th>
            <th style="padding: 9px 12px; text-align: right;">Low Temp (°C)</th>
            <th style="padding: 9px 12px; text-align: right;">Precipitation Risk</th>
          </tr>
        </thead>
        <tbody>
          ${forecastRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 14px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #6b7280;">
      <div style="max-width: 580px; line-height: 1.4;">
        <strong>Advisory Note:</strong> Agricultural weather metrics are modeled using high-precision spatial grids. Spraying and irrigation actions should be coordinated with real-time field observations of canopy moisture and local wind gusts.
      </div>
      <div style="text-align: right; white-space: nowrap;">
        <div style="font-weight: 700; color: #15803d; font-size: 11px;">KrishiSetu Platform</div>
        <div>Agro-Weather Intelligence</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handleExportPDF = () => {
    if (!weather || !weather.forecast) {
      alert(t("Weather data unavailable"));
      return;
    }
    setExportDropdownOpen(false);
    const reportHtml = generatePDFReportHtml();

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
    if (!weather || !weather.forecast) {
      alert(t("Weather data unavailable"));
      return;
    }
    setExportDropdownOpen(false);

    const headers = [
      "Day",
      "Date",
      "Condition",
      "High Temp (°C)",
      "Low Temp (°C)",
      "Precipitation Chance (%)",
      "Current Temp (°C)",
      "Humidity (%)",
      "Wind Speed (km/h)",
      "Soil Moisture (%)",
      "Evapotranspiration (mm/day)",
      "Location",
      "Report Date"
    ];

    const reportDate = new Date().toISOString().split("T")[0];
    const rows = weather.forecast.map((day: WeatherForecastDay) => [
      `"${day.dayName}"`,
      `"${day.date}"`,
      `"${day.condition}"`,
      day.high,
      day.low,
      `${day.precipitationChance}%`,
      weather.temperature,
      `${weather.humidity}%`,
      weather.windSpeed,
      `${weather.soilMoisture}%`,
      weather.evapotranspiration,
      `"${location?.label || "Local Farm"}"`,
      `"${reportDate}"`
    ]);

    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `KrishiSetu_Weather_${(location?.label || "farm").replace(/[^a-zA-Z0-9]/g, "_")}_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const alerts = weather ? buildAlerts(weather) : [];
  const selectedDay = weather?.forecast?.[activeDayIdx] ?? weather?.forecast?.[0];

  const chartData = useMemo(() => {
    if (!weather) return [];
    
    // If activeDayIdx === 0, use next 24 hours
    if (activeDayIdx === 0) {
      return (weather.hourlyTemp ?? [])
        .map((temp: number, i: number) => ({
          time: weather.hourlyTime?.[i] ?? `${i}:00`,
          temp: Math.round(temp),
          rain: weather.hourlyRain?.[i] ?? 0,
        }))
        .filter((_: unknown, i: number) => i % 2 === 0);
    }

    // If activeDayIdx > 0, slice from allHourly arrays (24 hours for that day)
    if (weather.allHourlyTemp && weather.allHourlyTemp.length >= (activeDayIdx + 1) * 24) {
      const start = activeDayIdx * 24;
      const end = start + 24;
      const dayTemps = weather.allHourlyTemp.slice(start, end);
      const dayRains = weather.allHourlyRain?.slice(start, end) ?? [];
      const dayTimes = weather.allHourlyTime?.slice(start, end) ?? [];

      return dayTemps
        .map((temp: number, i: number) => {
          const rawTime = dayTimes[i];
          const timeLabel = rawTime
            ? new Date(rawTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
            : `${i}:00`;
          return {
            time: timeLabel,
            temp: Math.round(temp),
            rain: dayRains[i] ?? 0,
          };
        })
        .filter((_: unknown, i: number) => i % 2 === 0);
    }

    // Fallback if allHourly not populated
    return (weather.hourlyTemp ?? [])
      .map((temp: number, i: number) => ({
        time: weather.hourlyTime?.[i] ?? `${i}:00`,
        temp: Math.round(temp),
        rain: weather.hourlyRain?.[i] ?? 0,
      }))
      .filter((_: unknown, i: number) => i % 2 === 0);
  }, [weather, activeDayIdx]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-cropwise-text">{t("Weather Intelligence")}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-cropwise-faint" />
              <p className="text-sm text-cropwise-faint">
                {locationLoading ? t("Detecting your location...") : location?.label || t("Loading...")}
                {weather && ` • ${t("Last updated")} ${new Date(weather.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
              </p>
              {gpsError && (
                <span className="text-[10px] text-amber-400 ml-1">({gpsError})</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export Dropdown with Dual Format: PDF & CSV */}
            <div className="relative" ref={exportDropdownRef}>
              <button 
                id="export-weather-dropdown-btn"
                aria-expanded={exportDropdownOpen}
                aria-haspopup="true"
                className={cn(
                  "btn-secondary text-xs py-2 gap-1.5 transition-all duration-200 cursor-pointer",
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
                      {weather?.forecast?.length ?? 7} {t("days")}
                    </span>
                  </div>

                  {/* Option 1: PDF Report */}
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-cropwise-green/15 hover:border-cropwise-green/30 border border-transparent transition-all group cursor-pointer"
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
                        {t("Visual report with agro-weather advisory, soil metrics & 7-day table.")}
                      </p>
                    </div>
                  </button>

                  {/* Option 2: CSV Sheet */}
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-cropwise-green/15 hover:border-cropwise-green/30 border border-transparent transition-all group mt-1 cursor-pointer"
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
                        {t("Raw data sheet with 7-day forecast & soil data for spreadsheets.")}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button onClick={handleRefresh} disabled={refreshing}
              className="btn-primary text-xs py-2 gap-1.5 disabled:opacity-60 cursor-pointer">
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              {refreshing ? t("Updating...") : t("Refresh Data")}
            </button>
          </div>
        </div>

        {weather && !loading && <ClimateResilienceBanner weather={weather} />}

        {/* Loading state */}
        {(loading || locationLoading) && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <LocateFixed className="w-8 h-8 text-cropwise-green-light animate-pulse" />
            <p className="text-sm text-cropwise-faint">{t("Detecting your location and fetching live weather...")}</p>
            <Loader2 className="w-5 h-5 text-cropwise-green-light animate-spin" />
          </div>
        )}

        {!loading && !locationLoading && weather && (
          <>
            {/* ── Live conditions + AI alerts ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

              {/* Live conditions */}
              <div className="rounded-xl bg-cropwise-surface border border-cropwise-border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest bg-cropwise-elevated border border-cropwise-border text-cropwise-faint mb-4">
                      {t("Live Conditions")}
                    </span>
                    <div className="flex items-end gap-3 mb-1">
                      <span className="text-6xl font-bold text-cropwise-text leading-none">
                        {weather.temperature}°C
                      </span>
                      <div className="pb-2">
                        <p className="text-lg font-semibold text-cropwise-muted">{t(weather.condition)}</p>
                        <p className="text-sm text-cropwise-faint">{t("Feels like")} {weather.feelsLike}°C</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mt-5">
                      {[
                        { icon: Droplets, label: "Humidity",   value: `${weather.humidity}%` },
                        { icon: Wind,     label: "Wind",       value: `${weather.windSpeed}km/h ${weather.windDirection || "NW"}` },
                        { icon: Eye,      label: "Visibility", value: `${weather.visibility}km` },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Icon className="w-3.5 h-3.5 text-cropwise-faint" strokeWidth={2} />
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint">{t(label)}</p>
                          </div>
                          <p className="text-base font-bold text-cropwise-text">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-5 pt-4 border-t border-cropwise-border-muted">
                      <div className="flex items-center gap-2 text-sm text-cropwise-faint">
                        <Sunrise className="w-4 h-4 text-amber-400" strokeWidth={2} />
                        {t("Sunrise")}: <span className="text-cropwise-muted font-medium ml-1">{weather.sunrise || "06:12 AM"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-cropwise-faint">
                        <Sunset className="w-4 h-4 text-orange-400" strokeWidth={2} />
                        {t("Sunset")}: <span className="text-cropwise-muted font-medium ml-1">{weather.sunset || "06:45 PM"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-28 h-28 rounded-xl bg-cropwise-elevated border border-cropwise-border flex items-center justify-center">
                    <ConditionIcon code={weather.conditionCode} className="!w-14 !h-14 text-cropwise-green-light" />
                  </div>
                </div>
              </div>

              {/* AI Agronomist Alerts — dynamic based on real data */}
              <div className="rounded-xl bg-cropwise-surface border border-cropwise-border p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cropwise-green-light" strokeWidth={2} />
                  <h2 className="text-sm font-semibold text-cropwise-text">{t("AI Agronomist Alerts")}</h2>
                </div>
                <div className="flex-1 space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.category}
                      className={cn("flex flex-col gap-1 pl-3 py-2.5 border-l-2 rounded-r-lg bg-cropwise-surface", alert.accent)}>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", alert.categoryColor)}>
                        {t(alert.category)}
                      </p>
                      <p className="text-sm font-medium text-cropwise-text leading-snug">{t(alert.message)}</p>
                    </div>
                  ))}
                </div>
                <button 
                  className="text-xs font-semibold text-cropwise-green-light hover:text-[#82d882] transition-colors text-center py-1 hover:underline cursor-pointer"
                  onClick={() => setIsRecommendationsOpen(true)}
                >
                  {t("View All Recommendations")} →
                </button>
              </div>
            </div>

            {/* ── 7-Day Forecast ───────────────────────────────── */}
            <div className="rounded-xl bg-cropwise-surface border border-cropwise-border p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold text-cropwise-text">{t("7-Day Local Forecast")}</h2>
                  {activeDayIdx > 0 && selectedDay && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cropwise-green/15 text-cropwise-green-light border border-cropwise-green/30 font-medium">
                      {t("Viewing")}: {selectedDay.dayName} ({selectedDay.high}° / {selectedDay.low}°C • {selectedDay.condition})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeDayIdx > 0 && (
                    <button
                      onClick={() => setActiveDayIdx(0)}
                      className="text-[11px] text-cropwise-green-light hover:underline font-medium mr-1 cursor-pointer"
                    >
                      {t("Reset to Today")}
                    </button>
                  )}
                  <button 
                    onClick={() => handleScrollForecast("left")}
                    aria-label="Previous day"
                    className="w-7 h-7 rounded-lg border border-cropwise-border bg-cropwise-elevated flex items-center justify-center text-cropwise-faint hover:text-cropwise-text hover:border-cropwise-green/40 hover:bg-cropwise-green/10 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <button 
                    onClick={() => handleScrollForecast("right")}
                    aria-label="Next day"
                    className="w-7 h-7 rounded-lg border border-cropwise-border bg-cropwise-elevated flex items-center justify-center text-cropwise-faint hover:text-cropwise-text hover:border-cropwise-green/40 hover:bg-cropwise-green/10 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
              <div ref={forecastScrollRef} className="flex gap-3 overflow-x-auto pb-1 scroll-smooth">
                {(weather.forecast ?? []).map((day: WeatherForecastDay, i: number) => (
                  <ForecastCard key={day.date} day={day} isActive={i === activeDayIdx}
                    onClick={() => setActiveDayIdx(i)} />
                ))}
              </div>
            </div>

            {/* ── 24h Hourly Trend Chart (real data) ───────────── */}
            <div className="rounded-xl bg-cropwise-surface border border-cropwise-border p-5">
              <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-cropwise-text">
                      {t("24h Environmental Trends")}
                      {selectedDay && <span className="text-cropwise-green-light ml-1.5 font-normal">({selectedDay.dayName}, {selectedDay.date})</span>}
                    </h2>
                    {activeDayIdx !== 0 && (
                      <button 
                        onClick={() => setActiveDayIdx(0)}
                        className="text-[10px] px-2 py-0.5 rounded bg-cropwise-elevated text-cropwise-faint hover:text-cropwise-green-light border border-cropwise-border transition-colors cursor-pointer"
                      >
                        {t("Reset to Today")}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-cropwise-faint mt-0.5">
                    {t("Temperature (°C) and Precipitation Probability (%) across 24 hours")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cropwise-green" />
                    <span className="text-xs text-cropwise-faint">{t("Temperature")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cropwise-faint" />
                    <span className="text-xs text-cropwise-faint">{t("Rain Probability")}</span>
                  </div>
                </div>
              </div>
              <div className="h-52 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2ea82e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2ea82e" stopOpacity={0}   />
                      </linearGradient>
                      <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#5a7460" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#5a7460" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d20" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#5a7460" }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis tick={{ fontSize: 10, fill: "#5a7460" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2a3d2c", strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="temp" stroke="#2ea82e" strokeWidth={2} fill="url(#tempGrad)" dot={false}
                      activeDot={{ r: 4, fill: "#4dc24d", stroke: "#0b1410", strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="rain" stroke="#5a7460" strokeWidth={1.5} strokeDasharray="5 3"
                      fill="url(#rainGrad)" dot={false} activeDot={{ r: 3, fill: "#94a896", stroke: "#0b1410", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Bottom metric cards (real soil data) ─────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Droplet, label: "Soil Moisture",
                  value: `${weather.soilMoisture}%`,
                  sub: weather.soilMoisture > 60 ? "Healthy" : weather.soilMoisture > 30 ? "Moderate" : "Dry",
                  subColor: weather.soilMoisture > 60 ? "text-cropwise-green-light" : weather.soilMoisture > 30 ? "text-amber-400" : "text-rose-400",
                  iconColor: "text-blue-400 bg-blue-900/30 border-blue-800/40",
                },
                {
                  icon: Zap, label: "Solar Intensity",
                  value: `${weather.solarRadiation}`,
                  sub: "kWh/m²",
                  subColor: "text-cropwise-muted",
                  iconColor: "text-amber-400 bg-amber-900/30 border-amber-800/40",
                },
                {
                  icon: Gauge, label: "Evapotranspiration",
                  value: `${weather.evapotranspiration}`,
                  sub: "mm/day",
                  subColor: "text-cropwise-muted",
                  iconColor: "text-cropwise-green-light bg-cropwise-green/10 border-cropwise-green/20",
                },
              ].map(({ icon: Icon, label, value, sub, subColor, iconColor }) => (
                <div key={label} className="rounded-xl bg-cropwise-surface border border-cropwise-border p-5 flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0", iconColor)}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint">{t(label)}</p>
                    <p className="text-xl font-bold text-cropwise-text leading-tight">
                      {value}
                      <span className={cn("text-sm font-medium ml-1.5", subColor)}>{t(sub)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !locationLoading && !weather && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <CloudRain className="w-10 h-10 text-cropwise-border" strokeWidth={1} />
            <p className="text-sm text-cropwise-faint">{t("Weather data unavailable")}</p>
            <button onClick={handleRefresh} className="btn-primary text-xs py-2 mt-2">
              <RefreshCw className="w-3.5 h-3.5" /> {t("Try Again")}
            </button>
          </div>
        )}

        {/* ── Floating Refresh Toast ──────────────────────────────────── */}
        {refreshToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cropwise-surface border border-cropwise-green/40 text-cropwise-green-light text-xs font-medium shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-cropwise-green-light" />
            <span>{refreshToast}</span>
          </div>
        )}

      </div>

      {/* ── AI Agronomist Detailed Recommendations Modal ─────────────── */}
      {isRecommendationsOpen && weather && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-2xl rounded-2xl bg-[#0d1e0e] border border-cropwise-green/30 p-6 shadow-2xl space-y-5 my-8"
            style={{ boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(77, 194, 77, 0.15)" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-cropwise-green/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cropwise-green/20 border border-cropwise-green/40 flex items-center justify-center text-cropwise-green-light">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-cropwise-text">
                    {t("AI Agronomist Detailed Recommendations")}
                  </h2>
                  <p className="text-xs text-cropwise-faint mt-0.5">
                    {t("Comprehensive farm action plan for")} {location?.label || t("your local farm")}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsRecommendationsOpen(false)}
                className="w-8 h-8 rounded-lg bg-cropwise-surface border border-cropwise-border flex items-center justify-center text-cropwise-faint hover:text-cropwise-text hover:border-cropwise-green/40 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recommendations Content Cards */}
            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {/* 1. Spray Window */}
              <div className="p-4 rounded-xl bg-cropwise-surface border border-cropwise-border hover:border-cropwise-green/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-cropwise-green-light flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5" /> {t("Pesticide & Foliar Spray Guidance")}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cropwise-green/20 text-cropwise-green-light font-semibold border border-cropwise-green/30">
                    {weather.windSpeed < 15 && weather.humidity < 70 ? t("Favorable") : t("Restricted")}
                  </span>
                </div>
                <p className="text-xs text-cropwise-text leading-relaxed">
                  {weather.windSpeed < 15 && weather.humidity < 70
                    ? t("Wind speed (") + `${weather.windSpeed} km/h` + t(") and relative humidity (") + `${weather.humidity}%` + t(") are within safe parameters. Optimal spray window is 08:00 AM – 11:00 AM. Avoid noon spraying to prevent photodegradation.")
                    : t("High winds (") + `${weather.windSpeed} km/h` + t(") or elevated moisture may cause chemical drift and wash-off. Postpone foliar sprays until wind calms below 15 km/h.")}
                </p>
              </div>

              {/* 2. Precision Irrigation */}
              <div className="p-4 rounded-xl bg-cropwise-surface border border-cropwise-border hover:border-blue-500/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5" /> {t("Smart Irrigation & Moisture Management")}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                    {weather.soilMoisture > 60 ? t("Adequate") : weather.soilMoisture > 30 ? t("Moderate") : t("Irrigate")}
                  </span>
                </div>
                <p className="text-xs text-cropwise-text leading-relaxed">
                  {weather.soilMoisture < 35
                    ? t("Topsoil moisture is low (") + `${weather.soilMoisture}%` + t("). Initiate scheduled irrigation today. Prefer early morning drip irrigation to minimize ET losses (") + `${weather.evapotranspiration} mm/day` + t(").")
                    : t("Soil moisture is comfortable (") + `${weather.soilMoisture}%` + t("). With evapotranspiration at ") + `${weather.evapotranspiration} mm/day` + t(", postpone surface flooding. Conserve approximately 4,000L of water per acre.")}
                </p>
              </div>

              {/* 3. Disease & Pest Risk */}
              <div className="p-4 rounded-xl bg-cropwise-surface border border-cropwise-border hover:border-amber-500/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> {t("Fungal & Pest Outbreak Monitoring")}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    {weather.humidity > 70 ? t("Caution") : t("Low Risk")}
                  </span>
                </div>
                <p className="text-xs text-cropwise-text leading-relaxed">
                  {weather.humidity > 70
                    ? t("Elevated ambient humidity (") + `${weather.humidity}%` + t(") combined with cloud cover increases risk of foliar blights, powdery mildew, and aphid colonies. Scout field borders and consider preventive bio-fungicide (Trichoderma viride).")
                    : t("Atmospheric humidity and solar radiation (") + `${weather.solarRadiation} kWh/m²` + t(") remain healthy. Fungal sporulation index is low. Standard preventive hygiene recommended.")}
                </p>
              </div>

              {/* 4. Fertilizer Top-Dressing */}
              <div className="p-4 rounded-xl bg-cropwise-surface border border-cropwise-border hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5" /> {t("Fertilizer & Nutrient Timing")}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    {t("Nutrient Schedule")}
                  </span>
                </div>
                <p className="text-xs text-cropwise-text leading-relaxed">
                  {t("Do not broadcast granular Nitrogen or Urea if rain probability exceeds 50% in the 24h forecast to prevent nutrient runoff into drains. Apply when soil is moist but not saturated.")}
                </p>
              </div>

              {/* 5. Field Operations & Harvesting */}
              <div className="p-4 rounded-xl bg-cropwise-surface border border-cropwise-border hover:border-purple-500/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> {t("Field Work & Harvesting Outlook")}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                    {t("7-Day Window")}
                  </span>
                </div>
                <p className="text-xs text-cropwise-text leading-relaxed">
                  {t("Review the 7-day trend below before cutting, swathing, or sun-drying grain. Prioritize days with precipitation probability under 20% and high solar intensity (") + `${weather.solarRadiation} kWh/m²` + t(").")}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-cropwise-green/20 flex-wrap gap-3">
              <button
                onClick={() => setIsRecommendationsOpen(false)}
                className="btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                {t("Close")}
              </button>
              <button
                onClick={() => {
                  setIsRecommendationsOpen(false);
                  const prompt = `Give me crop-specific agronomic advice for ${location?.label || "my area"}. Today's weather: Temp ${weather.temperature}°C (${weather.condition}), Humidity ${weather.humidity}%, Soil Moisture ${weather.soilMoisture}%, Wind ${weather.windSpeed} km/h. What are my top 3 farming priorities today?`;
                  router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
                }}
                className="btn-primary text-xs py-2 px-4 gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t("Consult AI Advisor for My Crop")}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}