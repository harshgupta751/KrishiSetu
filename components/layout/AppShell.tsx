/**
 * components/layout/AppShell.tsx
 * Authenticated app shell — wraps all protected pages.
 * Includes AuthGuard, Sidebar, and top header with real user data,
 * in-app search, and a notifications panel.
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, Search, LogOut, X, Loader2,
  LayoutDashboard, MessageSquare, ScanSearch, Lightbulb,
  TrendingUp, CloudSun, FileText, User, type LucideProps,
} from "lucide-react";
import { useAuth } from "@/lib/firebase/auth-context";
import AuthGuard from "@/components/auth/AuthGuard";
import PageTransition from "./PageTransition";
import Sidebar, { MobileMenuButton } from "./Sidebar";
import { cn, timeAgo } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { getUserProfile } from "@/lib/firebase/user-profile";
import { getUserActivityLogs, type ActivityLogEntry } from "@/lib/firebase/activity-log";
import type { LanguageCode } from "@/app/chat/types";
import { ThemeToggle } from "@/components/ThemeToggle";

// Firestore Timestamp | Date | string | number → Date (for timeAgo).
function toDate(v: unknown): Date {
  if (v && typeof (v as { toDate?: unknown }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":      { title: "Dashboard",       subtitle: "Your farm at a glance"                },
  "/chat":           { title: "AI Chat",          subtitle: "Ask your crop advisor anything"       },
  "/pest-diagnosis": { title: "Pest Diagnosis",   subtitle: "Upload a photo to identify disease"  },
  "/crop-advisor":   { title: "Crop Advisor",     subtitle: "Get AI-powered crop recommendations" },
  "/market":         { title: "Market Prices",    subtitle: "Live mandi prices & MSP tracker"     },
  "/weather":        { title: "Weather",          subtitle: "Forecast & agricultural advisories"  },
  "/schemes":        { title: "Govt. Schemes",    subtitle: "Subsidies & schemes for farmers"     },
  "/profile":        { title: "Profile",          subtitle: "Your farm settings & preferences"    },
  "/activity-log":   { title: "Activity Log",     subtitle: "Digital ledger of farm operations"   },
  "/settings":       { title: "Settings",         subtitle: "App preferences & notifications"     },
};

// In-app search targets (pages/features).
const SEARCH_TARGETS: { label: string; href: string; icon: React.FC<LucideProps> }[] = [
  { label: "Dashboard",      href: "/dashboard",      icon: LayoutDashboard },
  { label: "AI Chat",        href: "/chat",           icon: MessageSquare },
  { label: "Pest Diagnosis", href: "/pest-diagnosis", icon: ScanSearch },
  { label: "Crop Advisor",   href: "/crop-advisor",   icon: Lightbulb },
  { label: "Market Prices",  href: "/market",         icon: TrendingUp },
  { label: "Weather",        href: "/weather",        icon: CloudSun },
  { label: "Schemes",        href: "/schemes",        icon: FileText },
  { label: "Profile",        href: "/profile",        icon: User },
];

interface AppShellProps {
  children?: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname  = usePathname();
  const { user, signOut } = useAuth();
  const router    = useRouter();
  const { t, setLang } = useI18n();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery]           = useState("");
  const [notifOpen, setNotifOpen]   = useState(false);
  const [notifs, setNotifs]         = useState<ActivityLogEntry[] | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Seed app language from the user's saved profile (once), unless the user
  // has already chosen one on this device (localStorage wins).
  useEffect(() => {
    if (!user) return;
    let hasLocal = false;
    try { hasLocal = !!localStorage.getItem("cw_lang"); } catch { /* ignore */ }
    if (hasLocal) return;
    getUserProfile(user.uid)
      .then((p) => { if (p?.preferredLanguage) setLang(p.preferredLanguage as LanguageCode); })
      .catch(() => {});
  }, [user, setLang]);

  // Load notifications when the panel is first opened.
  useEffect(() => {
    if (!notifOpen || notifs !== null || !user) return;
    getUserActivityLogs(user.uid, 12).then(setNotifs).catch(() => setNotifs([]));
  }, [notifOpen, notifs, user]);

  // Close popovers on outside click.
  useEffect(() => {
    if (!searchOpen && !notifOpen) return;
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setSearchOpen(false); setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [searchOpen, notifOpen]);

  const pageMeta =
    PAGE_TITLES[pathname] ??
    PAGE_TITLES[Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k)) ?? ""] ??
    { title: "CropWise AI", subtitle: "" };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const go = (href: string) => {
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  };

  const results = query.trim()
    ? SEARCH_TARGETS.filter((s) => s.label.toLowerCase().includes(query.toLowerCase()))
    : SEARCH_TARGETS;

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "Farmer";

  return (
    <AuthGuard>
      <div className="min-h-dvh bg-cropwise-bg">
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onNotificationsClick={() => { setNotifOpen((v) => !v); setSearchOpen(false); }}
        />

        <div className="transition-all duration-300 ease-in-out lg:pl-64">
          {/* Header */}
          <header ref={headerRef} className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 md:px-6 border-b border-cropwise-border bg-cropwise-bg/90 backdrop-blur-md">
            <MobileMenuButton onClick={() => setMobileOpen(true)} />

            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-cropwise-text leading-tight truncate">
                {t(pageMeta.title)}
              </h1>
              {pageMeta.subtitle && (
                <p className="hidden sm:block text-xs text-cropwise-faint leading-tight">
                  {t(pageMeta.subtitle)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <button
                  onClick={() => { setSearchOpen((v) => !v); setNotifOpen(false); }}
                  className={cn("p-2 rounded-lg transition-colors",
                    searchOpen ? "text-cropwise-green-light bg-cropwise-hover" : "text-cropwise-faint hover:text-cropwise-muted hover:bg-cropwise-hover")}
                  aria-label={t("Search")}
                >
                  <Search className="w-4 h-4" />
                </button>
                {searchOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-cropwise-surface border border-cropwise-border shadow-2xl overflow-hidden z-50">
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-cropwise-border-muted">
                      <Search className="w-3.5 h-3.5 text-cropwise-faint" />
                      <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("Search pages…")}
                        className="flex-1 bg-transparent text-sm text-cropwise-text placeholder:text-cropwise-faint outline-none"
                      />
                      {query && (
                        <button onClick={() => setQuery("")} className="text-cropwise-faint hover:text-cropwise-muted">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                      {results.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-cropwise-faint">{t("No matches")}</p>
                      ) : results.map((r) => {
                        const Icon = r.icon;
                        return (
                          <button key={r.href} onClick={() => go(r.href)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-cropwise-muted hover:bg-cropwise-elevated hover:text-cropwise-text transition-colors">
                            <Icon className="w-4 h-4 text-cropwise-faint" />
                            {t(r.label)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => { setNotifOpen((v) => !v); setSearchOpen(false); }}
                  className={cn("relative p-2 rounded-lg transition-colors",
                    notifOpen ? "text-cropwise-green-light bg-cropwise-hover" : "text-cropwise-faint hover:text-cropwise-muted hover:bg-cropwise-hover")}
                  aria-label={t("Notifications")}
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cropwise-green-light border-2 border-cropwise-bg" />
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl bg-cropwise-surface border border-cropwise-border shadow-2xl overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-cropwise-border-muted">
                      <p className="text-sm font-semibold text-cropwise-text">{t("Notifications")}</p>
                      <button onClick={() => router.push("/activity-log")}
                        className="text-[10px] text-cropwise-green-light hover:underline">{t("View all")}</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-cropwise-border-muted">
                      {notifs === null ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-cropwise-faint">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">{t("Loading…")}</span>
                        </div>
                      ) : notifs.length === 0 ? (
                        <p className="px-4 py-8 text-center text-xs text-cropwise-faint">{t("No notifications yet")}</p>
                      ) : notifs.map((n) => (
                        <div key={n.id} className="px-4 py-3 hover:bg-cropwise-elevated transition-colors">
                          <p className="text-xs font-medium text-cropwise-text leading-snug">{t(n.title)}</p>
                          {n.description && (
                            <p className="text-[11px] text-cropwise-faint mt-0.5 leading-snug">{t(n.description)}</p>
                          )}
                          <p className="text-[10px] text-cropwise-faint mt-1">{timeAgo(toDate(n.createdAt))}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mx-1">
                <ThemeToggle />
              </div>

              {/* User avatar + sign out */}
              <div className="flex items-center gap-2 pl-2">
                <div className="w-7 h-7 rounded-full bg-cropwise-green/20 border border-cropwise-green/40 flex items-center justify-center">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-cropwise-green-light">{initials}</span>
                  )}
                </div>
                <span className="hidden sm:block text-xs font-medium text-cropwise-muted">{displayName}</span>
                <button onClick={handleSignOut} title={t("Sign out")}
                  className="p-1.5 rounded-lg text-cropwise-faint hover:text-rose-400 hover:bg-rose-900/10 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </header>

          <main className="p-4 md:p-6 lg:p-8 min-h-[calc(100dvh-4rem)]">
            <PageTransition>
              {children ?? null}
            </PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
