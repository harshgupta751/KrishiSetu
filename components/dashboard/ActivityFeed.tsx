/**
 * components/dashboard/ActivityFeed.tsx
 * Recent activity log for the Dashboard sidebar.
 */

import {
  ScanSearch,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  FileText,
  Activity,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityLogEntry } from "@/types";

// ─── Icon Registry ────────────────────────────────────────────────────────────

type IconComponent = React.FC<LucideProps>;

const ICON_MAP: Record<string, IconComponent> = {
  ScanSearch,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  FileText,
};

// ─── Activity color mapping ───────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  pest_diagnosis:      "text-rose-400   bg-rose-400/10   border-rose-400/20",
  chat_message:        "text-cropwise-green-light  bg-cropwise-green/10  border-cropwise-green/20",
  crop_recommendation: "text-amber-400  bg-amber-400/10  border-amber-400/20",
  market_query:        "text-blue-400   bg-blue-400/10   border-blue-400/20",
  scheme_search:       "text-purple-400 bg-purple-400/10 border-purple-400/20",
  weather_check:       "text-sky-400    bg-sky-400/10    border-sky-400/20",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  entries: ActivityLogEntry[];
  maxItems?: number;
}

export default function ActivityFeed({
  entries,
  maxItems = 6,
}: ActivityFeedProps) {
  const displayed = entries.slice(0, maxItems);

  return (
    <div className="rounded-xl bg-cropwise-surface border border-cropwise-border">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-cropwise-border">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cropwise-faint" strokeWidth={2} />
          <h2 className="text-sm font-semibold text-cropwise-text">
            Recent Activity
          </h2>
        </div>
        <span className="text-xs text-cropwise-faint">{entries.length} events</span>
      </div>

      {/* Feed */}
      {displayed.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Activity className="w-8 h-8 text-cropwise-border mx-auto mb-2" />
          <p className="text-sm text-cropwise-faint">No activity yet</p>
          <p className="text-xs text-cropwise-border mt-1">
            Start by asking the AI advisor a question
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-cropwise-border-muted">
          {displayed.map((entry, index) => {
            const Icon = ICON_MAP[entry.icon] ?? Activity;
            const colorClass =
              TYPE_COLORS[entry.type] ?? TYPE_COLORS["chat_message"];

            return (
              <li
                key={entry.id}
                className={cn(
                  "flex items-start gap-3.5 px-5 py-3.5",
                  "hover:bg-cropwise-elevated transition-colors",
                  "animate-fade-in-up"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon badge */}
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border mt-0.5",
                    colorClass
                  )}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cropwise-text leading-tight truncate">
                    {entry.title}
                  </p>
                  <p className="text-xs text-cropwise-muted mt-0.5 line-clamp-2">
                    {entry.description}
                  </p>
                </div>

                {/* Time */}
                <span className="flex-shrink-0 text-[10px] text-cropwise-faint mt-0.5 whitespace-nowrap">
                  {entry.timeAgo}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer */}
      {entries.length > maxItems && (
        <div className="px-5 py-3 border-t border-cropwise-border">
          <button className="text-xs font-medium text-cropwise-green-light hover:text-[#82d882] transition-colors">
            View all {entries.length} activities
          </button>
        </div>
      )}
    </div>
  );
}