/**
 * app/chat/types.ts
 * Client-side types for the Chat UI.
 * Separate from Firestore schema types to keep UI state decoupled.
 */

import type { PestDiagnosisResult } from "@/types";

export type MessageRole = "user" | "model";
export type ChatMode = "general" | "pest_diagnosis" | "crop_advisor";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  imagePreviewUrl?: string;    // Local object URL for image preview (not stored)
  diagnosisResult?: PestDiagnosisResult;
  isStreaming?: boolean;       // True while the AI is still typing
  shouldAutoPlayAudio?: boolean; // Trigger auto-play TTS
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  mode: ChatMode;
  lastMessage: string;
  updatedAt: Date;
}

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "mr", label: "मराठी" },
  { code: "te", label: "తెలుగు" },
  { code: "ta", label: "தமிழ்" },
  { code: "bn", label: "বাংলা" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
  { code: "od", label: "ଓଡ଼ିଆ" },
] as const;

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["code"];

// Map UI language codes → Sarvam AI BCP-47 codes (used by STT + TTS).
// All of these are supported by both Sarvam STT (saarika:v2.5) and TTS (bulbul).
export const SARVAM_LANG: Record<LanguageCode, string> = {
  en: "en-IN",
  hi: "hi-IN",
  pa: "pa-IN",
  mr: "mr-IN",
  te: "te-IN",
  ta: "ta-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  od: "od-IN",
};

export function toSarvamLang(code: string | undefined | null): string {
  if (code && code in SARVAM_LANG) return SARVAM_LANG[code as LanguageCode];
  return "hi-IN"; // sensible default for this app's primary audience
}