/**
 * app/layout.tsx
 * Root layout — wraps all routes with Firebase Auth context.
 */

import React from "react";
import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/firebase/auth-context";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"], variable: "--font-sans",
  weight: ["300","400","500","600","700"], display: "swap",
});
const dmMono = DM_Mono({
  subsets: ["latin"], variable: "--font-mono",
  weight: ["400","500"], display: "swap",
});

export const metadata: Metadata = {
  title: { default: "KrishiSetu — Smart Farming Advisor", template: "%s | KrishiSetu" },
  description: "AI-powered agricultural advisor for Indian farmers.",
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, themeColor: "#0f1a0f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-cropwise-bg text-cropwise-text transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}