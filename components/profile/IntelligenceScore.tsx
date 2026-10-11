/**
 * components/profile/IntelligenceScore.tsx
 * Animated SVG circular progress ring for the Farm Intelligence Score.
 * Shows score number in center, three sub-metrics below.
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/LanguageProvider";

interface SubMetricItem {
  label: string;
  value: string;
  color?: string;
}

interface IntelligenceScoreProps {
  score: number; // 0–100
  subMetrics?: SubMetricItem[];
}

export default function IntelligenceScore({ score, subMetrics }: IntelligenceScoreProps) {
  const [animated, setAnimated] = useState(0);
  const { t } = useI18n();

  // Animate count-up on mount & updates
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  // SVG ring math
  const size     = 180;
  const stroke   = 12;
  const r        = (size - stroke) / 2;
  const circ     = 2 * Math.PI * r;
  const offset   = circ - (Math.min(Math.max(animated, 0), 100) / 100) * circ;

  const scoreColor =
    score >= 80 ? "#2ea82e" :
    score >= 60 ? "#f59e0b" : "#ef4444";

  const defaultMetrics: SubMetricItem[] = [
    { label: "Yield",       value: "+12%",      color: "text-cropwise-green-light" },
    { label: "Soil Health", value: "Optimal",    color: "text-cropwise-text" },
    { label: "Irrigation",  value: "92% Eff.",   color: "text-blue-400"  },
  ];

  const metricsToDisplay = subMetrics && subMetrics.length > 0 ? subMetrics : defaultMetrics;

  return (
    <div className="flex flex-col items-center">
      {/* Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="#1e2d20"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={scoreColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s ease" }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: scoreColor }}>
            {score}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint mt-0.5">
            {t("Optimization")}
          </span>
        </div>
      </div>

      {/* Sub-metrics */}
      <div className="flex items-center gap-6 mt-4">
        {metricsToDisplay.map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-cropwise-faint mb-0.5">{t(label)}</p>
            <p className={cn("text-sm font-bold", color ?? "text-cropwise-text")}>{t(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}