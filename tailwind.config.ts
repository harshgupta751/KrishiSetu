/**
 * tailwind.config.ts
 * Extended Tailwind configuration for CropWise AI design system.
 */

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── Font Families ────────────────────────────────────────────
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },

      // ─── Custom Color Palette ─────────────────────────────────────
      colors: {
        "cropwise": {
          bg:          `rgb(var(--color-bg) / <alpha-value>)`,
          surface:     `rgb(var(--color-bg-surface) / <alpha-value>)`,
          elevated:    `rgb(var(--color-bg-elevated) / <alpha-value>)`,
          hover:       `rgb(var(--color-bg-hover) / <alpha-value>)`,
          border:      `rgb(var(--color-border) / <alpha-value>)`,
          "border-muted": `rgb(var(--color-border-muted) / <alpha-value>)`,
          text:        `rgb(var(--color-text-primary) / <alpha-value>)`,
          muted:       `rgb(var(--color-text-secondary) / <alpha-value>)`,
          faint:       `rgb(var(--color-text-muted) / <alpha-value>)`,
          green:       `rgb(var(--color-green-500) / <alpha-value>)`,
          "green-light": `rgb(var(--color-green-400) / <alpha-value>)`,
          amber:       `rgb(var(--color-amber-500) / <alpha-value>)`,
        },
      },

      // ─── Background Images ────────────────────────────────────────
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "cropwise-grid":
          "linear-gradient(rgba(42, 61, 44, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(42, 61, 44, 0.3) 1px, transparent 1px)",
      },

      // ─── Custom Shadows ───────────────────────────────────────────
      boxShadow: {
        "green-sm":  "0 0 10px rgba(46, 168, 46, 0.1)",
        "green-md":  "0 0 20px rgba(46, 168, 46, 0.15)",
        "green-lg":  "0 0 40px rgba(46, 168, 46, 0.2)",
        "card":      "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover":"0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
      },

      // ─── Animations ───────────────────────────────────────────────
      keyframes: {
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease forwards",
        "fade-in":    "fade-in 0.3s ease forwards",
        "shimmer":    "shimmer 1.5s infinite",
      },

      // ─── Border Radius ────────────────────────────────────────────
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;