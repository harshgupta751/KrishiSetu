/**
 * components/chat/DiagnosisCard.tsx
 * Renders the structured pest/disease diagnosis result inside a chat message.
 * Matches the design: disease name, scientific name, severity badge,
 * confidence score bar, urgent treatment steps, and full report button.
 */

"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  FlaskConical,
  ShieldAlert,
  Sprout,
} from "lucide-react";
import { cn, severityToColor } from "@/lib/utils";
import type { PestDiagnosisResult } from "@/types";

// ─── Severity dot colour ──────────────────────────────────────────────────────

function SeverityDot({ severity }: { severity: PestDiagnosisResult["severity"] }) {
  const dot: Record<string, string> = {
    Low:      "bg-green-400",
    Moderate: "bg-amber-400",
    High:     "bg-orange-500",
    Critical: "bg-rose-500",
  };
  const text: Record<string, string> = {
    Low:      "text-green-400",
    Moderate: "text-amber-400",
    High:     "text-orange-500",
    Critical: "text-rose-500",
  };
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-semibold", text[severity])}>
      <span className={cn("w-2 h-2 rounded-full animate-pulse", dot[severity])} />
      {severity} Severity
    </span>
  );
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-cropwise-green" :
    value >= 60 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint">
          Confidence Score
        </span>
        <span className="text-sm font-bold text-cropwise-text">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-cropwise-border-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DiagnosisCardProps {
  result: PestDiagnosisResult;
}

export default function DiagnosisCard({ result }: DiagnosisCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isHealthy = result.diseaseName === "Healthy Plant";
  const isUnknown = result.diseaseName === "Unable to Diagnose";

  return (
    <div className="mt-3 rounded-xl border border-cropwise-border bg-cropwise-surface overflow-hidden w-full max-w-[520px]">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-cropwise-border-muted">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-cropwise-text leading-tight">
              {result.diseaseName}
            </h3>
            {result.scientificName && (
              <p className="text-xs text-cropwise-faint italic mt-0.5">
                {result.scientificName}
              </p>
            )}
          </div>
          <SeverityDot severity={result.severity} />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-4">

        {/* Confidence bar */}
        {!isUnknown && (
          <ConfidenceBar value={result.confidencePercent} />
        )}

        {/* Affected area */}
        {result.affectedArea && result.affectedArea !== "None" && (
          <div className="flex items-center gap-2 text-xs text-cropwise-muted">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Affected area: <span className="font-medium text-cropwise-text">{result.affectedArea}</span></span>
          </div>
        )}

        {/* Immediate treatment steps (always visible) */}
        {result.treatment.immediate.length > 0 && !isHealthy && !isUnknown && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint mb-2">
              Urgent Treatment Steps
            </p>
            <ol className="space-y-2">
              {result.treatment.immediate.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cropwise-hover border border-cropwise-border flex items-center justify-center text-[10px] font-bold text-cropwise-green-light">
                    {i + 1}
                  </span>
                  <span className="text-xs text-cropwise-muted leading-relaxed pt-0.5">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Healthy plant message */}
        {isHealthy && (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2 className="w-4 h-4 text-cropwise-green-light" />
            <span className="text-sm text-cropwise-green-light font-medium">
              No disease symptoms detected
            </span>
          </div>
        )}

        {/* Expandable full report */}
        {!isUnknown && !isHealthy && (
          <>
            <button
              onClick={() => setExpanded((p) => !p)}
              className="flex items-center justify-between w-full text-xs font-medium text-cropwise-faint hover:text-cropwise-muted transition-colors pt-1"
            >
              <span>{expanded ? "Hide" : "Show"} full details</span>
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {expanded && (
              <div className="space-y-4 pt-1 border-t border-cropwise-border-muted">

                {/* Symptoms */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint mb-2 flex items-center gap-1.5">
                    <FlaskConical className="w-3 h-3" /> Observed Symptoms
                  </p>
                  <ul className="space-y-1.5">
                    {result.symptoms.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-cropwise-muted">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-cropwise-green-light flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Preventive measures */}
                {result.treatment.preventive.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" /> Preventive Measures
                    </p>
                    <ul className="space-y-1.5">
                      {result.treatment.preventive.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-cropwise-muted">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended pesticides */}
                {result.treatment.recommendedPesticides &&
                  result.treatment.recommendedPesticides.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-faint mb-2 flex items-center gap-1.5">
                      <Sprout className="w-3 h-3" /> Recommended Products
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.treatment.recommendedPesticides.map((p, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-cropwise-elevated border border-cropwise-border text-cropwise-muted"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Neo4j Sustainable Alternatives */}
                {result.treatment.sustainableAlternativesFromGraph && 
                 result.treatment.sustainableAlternativesFromGraph.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg border border-cropwise-green/30 bg-[#1a4d1a]/10">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-cropwise-green-light mb-2 flex items-center gap-1.5">
                      <Sprout className="w-3 h-3" /> Eco-Friendly Alternatives (Knowledge Graph)
                    </p>
                    <div className="space-y-2">
                      {result.treatment.sustainableAlternativesFromGraph.map((alt, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          <p className="text-xs font-semibold text-[#82d882]">{alt.name} <span className="text-[9px] text-cropwise-faint font-normal ml-1 border border-cropwise-border rounded px-1">{alt.type}</span></p>
                          <p className="text-xs text-cropwise-muted leading-relaxed">{alt.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-[10px] text-cropwise-faint italic border-t border-cropwise-border-muted pt-3 leading-relaxed">
                  {result.disclaimer}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer CTA ─────────────────────────────────────────────── */}
      {!isUnknown && !isHealthy && (
        <div className="px-5 pb-5">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-cropwise-muted border border-cropwise-border hover:border-cropwise-green-light hover:text-cropwise-green-light hover:bg-cropwise-hover transition-all duration-150">
            <FileText className="w-4 h-4" />
            View Full Biological Report
          </button>
        </div>
      )}
    </div>
  );
}