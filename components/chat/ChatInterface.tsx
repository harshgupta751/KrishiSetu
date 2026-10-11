/**
 * components/chat/ChatInterface.tsx
 * Full interactive chat UI with real-time context injection.
 *
 * Real data injected into every AI request:
 *  - User profile (name, farm, crops, location)
 *  - Live weather (temperature, humidity, soil moisture, rain forecast)
 *  - Live market prices (wheat, key crops vs MSP)
 *  - Chat history persisted to Firebase Firestore
 */

"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Leaf, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatSidebar from "./ChatSidebar";
import MessageBubble from "./MessageBubble";
import ChatInputBar from "./ChatInputBar";
import type { ChatMessage, ChatSession, LanguageCode } from "@/app/chat/types";
import type { PestDiagnosisResult, GeminiRequestBody, GeminiResponseBody } from "@/types";
import {
  createChatSession, saveChatMessage,
  getUserChatSessions, getSessionMessages, updateSessionTitle,
} from "@/lib/firebase/chat-history";
import { logActivity } from "@/lib/firebase/activity-log";
import { useAuth } from "@/lib/firebase/auth-context";
import { getUserProfile } from "@/lib/firebase/user-profile";
import { useLocation } from "@/lib/hooks/useLocation";
import { LANGUAGE_OPTIONS } from "@/app/chat/types";
import type { FirestoreUser } from "@/lib/firestore-schema";
import { useI18n } from "@/lib/i18n/LanguageProvider";

// ─── Build real-time context string for Gemini system prompt ─────────────────

async function buildRealtimeContext(
  user: { uid: string; displayName?: string | null; email?: string | null },
  locationLabel: string,
  lat: number,
  lng: number
): Promise<string> {
  const parts: string[] = [];

  // ── 1. User profile from Firestore ────────────────────────────
  try {
    const profile: FirestoreUser | null = await getUserProfile(user.uid);
    if (profile) {
      parts.push(`FARMER PROFILE:
- Name: ${profile.displayName || user.displayName || "Farmer"}
- Farm: ${profile.farmName || "Not set"}
- Location: ${profile.location?.district ? `${profile.location.district}, ` : ""}${profile.location?.state || locationLabel}
- Land: ${profile.landHolding || "Not set"} acres
- Primary Crops: ${profile.primaryCrops?.join(", ") || "Not set"}
- Season: Current Rabi/Kharif season
- Language preference: ${profile.preferredLanguage || "en"}`);
    }
  } catch { /* non-critical */ }

  // ── 2. Live weather from Open-Meteo ───────────────────────────
  try {
    const weatherRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/weather?lat=${lat}&lng=${lng}&label=${encodeURIComponent(locationLabel)}`
    );
    const weatherData = await weatherRes.json();
    if (weatherData.success && weatherData.data) {
      const w = weatherData.data;
      const rainTomorrow = w.forecast?.[1]?.precipitationChance ?? 0;
      parts.push(`LIVE WEATHER (${locationLabel}):
- Temperature: ${w.temperature}°C (feels like ${w.feelsLike}°C)
- Condition: ${w.condition}
- Humidity: ${w.humidity}%
- Wind: ${w.windSpeed} km/h
- Soil Moisture: ${w.soilMoisture}% (${w.soilMoisture > 60 ? "Healthy" : w.soilMoisture > 30 ? "Moderate" : "Dry"})
- Today's Rainfall: ${w.precipitation}mm
- Rain tomorrow: ${rainTomorrow}% probability
- Evapotranspiration: ${w.evapotranspiration} mm/day
- UV Index: ${w.uvIndex}
- 7-day forecast: ${(w.forecast || []).slice(0,3).map((d: {dayName:string;high:number;low:number;precipitationChance:number}) => `${d.dayName} ${d.high}°/${d.low}° ${d.precipitationChance}% rain`).join(", ")}`);
    }
  } catch { /* non-critical */ }

  // ── 3. Live market prices ─────────────────────────────────────
  try {
    const marketRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/market?type=current`
    );
    const marketData = await marketRes.json();
    if (marketData.success && marketData.data?.length) {
      const priceLines = marketData.data
        .slice(0, 6)
        .map((p: { cropName: string; currentPrice: number; msp: number; priceChangePercent: number }) =>
          `${p.cropName}: ₹${p.currentPrice}/q (MSP: ₹${p.msp}, ${p.currentPrice >= p.msp ? "above" : "BELOW"} MSP, ${p.priceChangePercent > 0 ? "+" : ""}${p.priceChangePercent.toFixed(1)}%)`
        )
        .join("\n  ");
      parts.push(`LIVE MANDI PRICES:\n  ${priceLines}`);
    }
  } catch { /* non-critical */ }

  return parts.join("\n\n");
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const LOCALIZED_SUGGESTIONS: Record<LanguageCode, string[]> = {
  en: [
    "My wheat crop has yellow spots, what should I do?",
    "Best irrigation schedule for cotton in this weather",
    "Is it a good time to sell wheat today?",
    "Which crop should I plant this Kharif season?",
    "Which fertilizer is best for my soil?",
    "When will the PM-KISAN installment arrive?"
  ],
  hi: [
    "मेरी गेहूं की फसल में पीले धब्बे हैं, क्या करूं?",
    "इस मौसम में कपास के लिए सिंचाई का सही समय क्या है?",
    "क्या आज गेहूं बेचना सही रहेगा?",
    "इस खरीफ सीजन में मुझे कौन सी फसल बोनी चाहिए?",
    "मेरी मिट्टी के लिए कौन सी खाद सही है?",
    "पीएम-किसान का पैसा कब आएगा?"
  ],
  pa: [
    "ਮੇਰੀ ਕਣਕ ਦੀ ਫਸਲ ਵਿੱਚ ਪੀਲੇ ਧੱਬੇ ਹਨ, ਮੈਂ ਕੀ ਕਰਾਂ?",
    "ਇਸ ਮੌਸਮ ਵਿੱਚ ਕਪਾਹ ਲਈ ਸਿੰਚਾਈ ਦਾ ਸਹੀ ਸਮਾਂ ਕੀ ਹੈ?",
    "ਕੀ ਅੱਜ ਕਣਕ ਵੇਚਣਾ ਠੀਕ ਰਹੇਗਾ?",
    "ਇਸ ਸਾਉਣੀ ਦੇ ਸੀਜ਼ਨ ਵਿੱਚ ਮੈਨੂੰ ਕਿਹੜੀ ਫਸਲ ਬੀਜਣੀ ਚਾਹੀਦੀ ਹੈ?",
    "ਮੇਰੀ ਮਿੱਟੀ ਲਈ ਕਿਹੜੀ ਖਾਦ ਸਭ ਤੋਂ ਵਧੀਆ ਹੈ?",
    "ਪੀਐਮ-ਕਿਸਾਨ ਦੀ ਕਿਸ਼ਤ ਕਦੋਂ ਆਵੇਗੀ?"
  ],
  mr: [
    "माझ्या गव्हाच्या पिकावर पिवळे ठिपके आहेत, मी काय करू?",
    "या हवामानात कापसासाठी सिंचनाचे योग्य वेळापत्रक काय आहे?",
    "आज गहू विकण्याची योग्य वेळ आहे का?",
    "या खरीप हंगामात मी कोणते पीक घ्यावे?",
    "माझ्या मातीसाठी कोणते खत सर्वोत्तम आहे?",
    "पीएम-किसानचा हप्ता कधी येईल?"
  ],
  te: [
    "నా గోధుమ పంటకు పసుపు మచ్చలు ఉన్నాయి, నేనేం చేయాలి?",
    "ఈ వాతావరణంలో పత్తికి సరైన నీటి పారుదల సమయం ఏమిటి?",
    "ఈ రోజు గోధుమలు విక్రయించడానికి మంచి సమయమా?",
    "ఈ ఖరీఫ్ సీజన్‌లో నేను ఏ పంటను వేయాలి?",
    "నా నేలకు ఏ ఎరువు ఉత్తమమైనది?",
    "పీఎం-కిసాన్ డబ్బులు ఎప్పుడు వస్తాయి?"
  ],
  ta: [
    "எனது கோதுமை பயிரில் மஞ்சள் புள்ளிகள் உள்ளன, நான் என்ன செய்ய வேண்டும்?",
    "இந்த வானிலையில் பருத்திக்கு நீர்ப்பாசனம் செய்ய சிறந்த நேரம் எது?",
    "இன்று கோதுமை விற்க சரியான நேரமா?",
    "இந்த காரீஃப் பருவத்தில் நான் எந்தப் பயிரை நடவு செய்ய வேண்டும்?",
    "எனது மண்ணுக்கு எந்த உரம் சிறந்தது?",
    "பிஎம்-கிசான் தவணை எப்போது வரும்?"
  ],
  bn: [
    "আমার গমের ফসলে হলুদ দাগ রয়েছে, আমার কী করা উচিত?",
    "এই আবহাওয়ায় তুলার জন্য সেরা সেচের সময়সূচী কী?",
    "আজ গম বিক্রি করার জন্য কি ভালো সময়?",
    "এই খরিফ মৌসুমে আমার কোন ফসল লাগানো উচিত?",
    "আমার মাটির জন্য কোন সার সবচেয়ে ভালো?",
    "পিএম-কিসান এর টাকা কবে আসবে?"
  ],
  gu: [
    "મારા ઘઉંના પાકમાં પીળા ડાઘ છે, મારે શું કરવું જોઈએ?",
    "આ હવામાનમાં કપાસ માટે સિંચાઈનો શ્રેષ્ઠ સમય કયો છે?",
    "શું આજે ઘઉં વેચવાનો યોગ્ય સમય છે?",
    "આ ખરીફ સિઝનમાં મારે કયો પાક વાવવો જોઈએ?",
    "મારી જમીન માટે કયું ખાતર શ્રેષ્ઠ છે?",
    "પીએમ-કિસાનનો હપ્તો ક્યારે આવશે?"
  ],
  kn: [
    "ನನ್ನ ಗೋಧಿ ಬೆಳೆಯಲ್ಲಿ ಹಳದಿ ಚುಕ್ಕೆಗಳಿವೆ, ನಾನು ಏನು ಮಾಡಬೇಕು?",
    "ಈ ಹವಾಮಾನದಲ್ಲಿ ಹತ್ತಿಗೆ ನೀರಾವರಿಯ ಉತ್ತಮ ಸಮಯ ಯಾವುದು?",
    "ಇಂದು ಗೋಧಿ ಮಾರಾಟ ಮಾಡಲು ಇದು ಸರಿಯಾದ ಸಮಯವೇ?",
    "ಈ ಮುಂಗಾರು ಹಂಗಾಮಿನಲ್ಲಿ ನಾನು ಯಾವ ಬೆಳೆ ಬೆಳೆಯಬೇಕು?",
    "ನನ್ನ ಮಣ್ಣಿಗೆ ಯಾವ ಗೊಬ್ಬರ ಉತ್ತಮ?",
    "ಪಿಎಂ-ಕಿಸಾನ್ ಕಂತು ಯಾವಾಗ ಬರುತ್ತದೆ?"
  ],
  ml: [
    "എന്റെ ഗോതമ്പ് വിളയിൽ മഞ്ഞ പാടുകൾ ഉണ്ട്, ഞാൻ എന്തുചെയ്യണം?",
    "ഈ കാലാവസ്ഥയിൽ പരുത്തിക്ക് ഏറ്റവും അനുയോജ്യമായ ജലസേചന സമയം ഏതാണ്?",
    "ഇന്ന് ഗോതമ്പ് വിൽക്കാൻ പറ്റിയ സമയമാണോ?",
    "ഈ ഖാരിഫ് സീസണിൽ ഞാൻ ഏത് വിളയാണ് നടേണ്ടത്?",
    "എന്റെ മണ്ണിന് ഏറ്റവും മികച്ച വളം ഏതാണ്?",
    "പിഎം കിസാൻ ഗഡു എപ്പോഴാണ് വരുന്നത്?"
  ],
  od: [
    "ମୋର ଗହମ ଫସଲରେ ହଳଦିଆ ଦାଗ ଅଛି, ମୁଁ କ'ଣ କରିବି?",
    "ଏହି ପାଗରେ କପା ପାଇଁ ଜଳସେଚନର ସଠିକ୍ ସମୟ କ'ଣ?",
    "ଆଜି ଗହମ ବିକ୍ରି କରିବା ପାଇଁ ଏହା ଏକ ଭଲ ସମୟ କି?",
    "ଏହି ଖରିଫ୍ ଋତୁରେ ମୁଁ କେଉଁ ଫସଲ ଚାଷ କରିବି?",
    "ମୋ ମାଟି ପାଇଁ କେଉଁ ସାର ସବୁଠାରୁ ଭଲ?",
    "ପିଏମ୍-କିଷାନ୍ କିସ୍ତି କେବେ ଆସିବ?"
  ]
};

function EmptyState({ onSuggest, language }: { onSuggest: (text: string) => void, language: LanguageCode }) {
  const suggestions = LOCALIZED_SUGGESTIONS[language] || LOCALIZED_SUGGESTIONS.en;
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-cropwise-elevated border border-cropwise-green/30 flex items-center justify-center mb-5">
        <Leaf className="w-8 h-8 text-cropwise-green-light" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-bold text-cropwise-text mb-2">Ask KrishiSetu</h2>
      <p className="text-sm text-cropwise-faint max-w-sm leading-relaxed mb-6">
        Get personalised advice based on your farm, live weather, and today's mandi prices.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map((s) => (
          <button key={s} onClick={() => onSuggest(s)}
            className="text-left text-xs text-cropwise-muted px-3 py-2.5 rounded-lg bg-cropwise-surface border border-cropwise-border hover:border-cropwise-border hover:text-cropwise-text transition-all">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatInterface({ initialPrompt }: { initialPrompt?: string } = {}) {
  const searchParams = useSearchParams();
  const urlPrompt = searchParams?.get("prompt") || initialPrompt || "";

  const { user, loading: authLoading } = useAuth();
  const { location } = useLocation(user?.uid);
  const { lang: globalLang } = useI18n();

  const [sessions,       setSessions]       = useState<ChatSession[]>([]);
  const [activeSessionId,setActiveSessionId]= useState<string | null>(null);
  const [messages,       setMessages]       = useState<ChatMessage[]>([]);
  const [isLoading,      setIsLoading]      = useState(false);
  const [language,       setLanguage]       = useState<LanguageCode>("en");
  const [langTouched,    setLangTouched]    = useState(false);
  const [contextReady,   setContextReady]   = useState(false);
  const [contextStr,     setContextStr]     = useState("");

  const messagesEndRef     = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contextStrRef      = useRef<string>("");
  const promptProcessedRef = useRef(false);

  // Keep ref updated for asynchronous access in handleSend
  useEffect(() => {
    contextStrRef.current = contextStr;
  }, [contextStr]);

  // ── Auto-scroll ───────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Follow the app-wide language until the user picks one here explicitly.
  useEffect(() => {
    if (!langTouched) setLanguage(globalLang);
  }, [globalLang, langTouched]);

  // ── Build real-time context on mount ─────────────────────────
  useEffect(() => {
    if (!user || !location) return;
    setContextReady(false);
    buildRealtimeContext(user, location.label, location.lat, location.lng)
      .then((ctx) => { setContextStr(ctx); setContextReady(true); })
      .catch(() => setContextReady(true));
  }, [user, location]);

  // ── Load sessions ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    getUserChatSessions(user.uid, 20).then(setSessions);
  }, [user]);

  // ── New session ───────────────────────────────────────────────
  const handleNewSession = useCallback(async (): Promise<string> => {
    // Check if there is already an empty session
    const existingEmptySession = sessions.find(s => s.title === "New Advice Session" && (!s.messageCount || s.messageCount === 0));
    if (existingEmptySession) {
      setActiveSessionId(existingEmptySession.id);
      setMessages([]);
      setSessions((prev: ChatSession[]) => 
        prev.map(s => s.id === existingEmptySession.id ? { ...s, updatedAt: new Date() } : s)
      );
      return existingEmptySession.id;
    }

    let sessionId: string;
    if (user?.uid) {
      sessionId = await createChatSession(user.uid, "general", "New Advice Session", language);
    } else {
      sessionId = `guest_${Date.now()}`;
    }
    const newSession: ChatSession = {
      id: sessionId, title: "New Advice Session",
      mode: "general", lastMessage: "", updatedAt: new Date(),
    };
    setSessions((prev: ChatSession[]) => [newSession, ...prev]);
    setActiveSessionId(sessionId);
    setMessages([]);
    return sessionId;
  }, [user, language, sessions]);

  // ── Select session ────────────────────────────────────────────
  const handleSelectSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    const msgs = await getSessionMessages(id);
    setMessages(msgs);
  }, []);

  // ── Send message ──────────────────────────────────────────────
  const handleSend = useCallback(async (
    text: string,
    image?: { base64: string; mimeType: string; previewUrl: string },
    targetSessionId?: string
  ) => {
    if (isLoading || !text.trim()) return;

    let sessionIdToUse = targetSessionId || activeSessionId;
    if (!sessionIdToUse) {
      if (user?.uid) {
        sessionIdToUse = await createChatSession(user.uid, "general", "New Advice Session", language);
      } else {
        sessionIdToUse = `guest_${Date.now()}`;
      }
      const newSession: ChatSession = {
        id: sessionIdToUse, title: "New Advice Session",
        mode: "general", lastMessage: "", updatedAt: new Date(),
      };
      setSessions((prev: ChatSession[]) => [newSession, ...prev]);
      setActiveSessionId(sessionIdToUse);
    }

    const mode = image ? "pest_diagnosis" : "chat";

    const userMessage: ChatMessage = {
      id: uuidv4(), role: "user", content: text,
      imagePreviewUrl: image?.previewUrl, createdAt: new Date(),
    };
    const placeholder: ChatMessage = {
      id: uuidv4(), role: "model", content: "",
      isStreaming: true, createdAt: new Date(),
    };

    setMessages((prev: ChatMessage[]) => [...prev, userMessage, placeholder]);
    setIsLoading(true);

    // Update session title on first message
    if (messages.length === 0 && sessionIdToUse) {
      const title = text.slice(0, 40) + (text.length > 40 ? "…" : "");
      setSessions((prev: ChatSession[]) =>
        prev.map((s: ChatSession) => s.id === sessionIdToUse ? { ...s, title, messageCount: (s.messageCount ?? 0) + 1, updatedAt: new Date() } : s)
      );
      await updateSessionTitle(sessionIdToUse, title).catch(() => {});
    }

    try {
      const body: GeminiRequestBody = {
        prompt: text,
        mode,
        language,
        // Inject real-time context into every chat request
        context: mode === "chat" ? (contextStrRef.current || contextStr) : undefined,
        history: mode === "chat" ? messages
          .filter((m) => m.content && !m.isStreaming && (m.role === "user" || m.role === "model"))
          .map((m) => ({ role: m.role as "user" | "model", content: m.content })) : undefined,
        ...(image && { imageBase64: image.base64, imageMimeType: image.mimeType }),
      };

      const res  = await fetch("/api/gemini", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: GeminiResponseBody = await res.json();
      if (!data.success) throw new Error(data.error ?? "AI request failed");

      const aiMessage: ChatMessage = {
        id:       placeholder.id,
        role:     "model",
        content:  mode === "pest_diagnosis" && data.structured
          ? (
              (data.structured as any).detailedReportSections
                ? ((data.structured as any).detailedReportSections as Array<{title: string, content: string}>)
                    .map(s => `${s.title}\n${s.content}`)
                    .join("\n\n")
                : ((data.structured as any).fullReportText || "Based on your photo, I've identified the issue below. See the diagnosis card for detailed analysis.")
            )
          : (data.text ?? ""),
        diagnosisResult: mode === "pest_diagnosis" && data.structured
          ? (data.structured as unknown as PestDiagnosisResult)
          : undefined,
        isStreaming: false,
        shouldAutoPlayAudio: true, // Tell MessageBubble to auto-play TTS
        createdAt: new Date(),
      };

      setMessages((prev: ChatMessage[]) =>
        prev.map((m: ChatMessage) => m.id === placeholder.id ? aiMessage : m)
      );

      // Persist to Firebase
      if (user?.uid && sessionIdToUse) {
        await saveChatMessage(sessionIdToUse, {
          role: "user", content: text, createdAt: userMessage.createdAt,
        }).catch(() => {});
        const modelMsgToSave: any = {
          role: "model",
          content: aiMessage.content,
          createdAt: aiMessage.createdAt,
        };
        if (aiMessage.diagnosisResult) {
          modelMsgToSave.diagnosisResult = aiMessage.diagnosisResult;
        }
        await saveChatMessage(sessionIdToUse, modelMsgToSave).catch(() => {});
        await logActivity({
          userId: user.uid, type: "chat_message",
          title: text.slice(0, 50),
          description: mode === "pest_diagnosis" ? "Pest diagnosis" : "AI chat query",
          metadata: { mode, sessionId: sessionIdToUse },
        }).catch(() => {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setMessages((prev: ChatMessage[]) =>
        prev.map((m: ChatMessage) => m.id === placeholder.id
          ? { ...m, content: `Sorry, I encountered an error: ${msg}`, isStreaming: false }
          : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, activeSessionId, language, contextStr, user]);

  // ── Send suggestion from empty state ─────────────────────────
  const handleSuggest = useCallback(async (text: string) => {
    let sId = activeSessionId;
    if (!sId) {
      sId = await handleNewSession();
    }
    handleSend(text, undefined, sId || undefined);
  }, [activeSessionId, handleNewSession, handleSend]);

  // ── Handle incoming prompt query parameter (e.g. from Market Advisory "Consult AI Advisor") ──
  useEffect(() => {
    if (!urlPrompt || promptProcessedRef.current || authLoading) return;
    promptProcessedRef.current = true;

    // Clean up query param from URL without full reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("prompt")) {
        url.searchParams.delete("prompt");
        window.history.replaceState({}, "", url.pathname);
      }
    }

    const runConsultation = async () => {
      const sId = await handleNewSession();
      if (!contextReady) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      handleSend(urlPrompt, undefined, sId);
    };

    runConsultation();
  }, [urlPrompt, authLoading, contextReady, handleNewSession, handleSend]);

  return (
    <div className="flex h-[calc(100dvh-4rem)] overflow-hidden -m-4 md:-m-6 lg:-m-8">

      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-60 flex-shrink-0">
        <ChatSidebar sessions={sessions} activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession} onNewSession={handleNewSession} />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 border-l border-cropwise-border">

        {/* Language selector + context status */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-cropwise-border-muted overflow-x-auto">
          <span className="text-[10px] text-cropwise-faint uppercase tracking-wider flex-shrink-0">
            Language:
          </span>
          {LANGUAGE_OPTIONS.map((lang) => (
            <button key={lang.code} onClick={() => { setLanguage(lang.code); setLangTouched(true); }}
              className={cn(
                "flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                language === lang.code
                  ? "bg-cropwise-green/20 text-cropwise-green-light border border-cropwise-green/30"
                  : "text-cropwise-faint hover:text-cropwise-muted border border-transparent hover:border-cropwise-border"
              )}>
              {lang.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            {!contextReady ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading live data...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-cropwise-green-light">
                <span className="w-1.5 h-1.5 rounded-full bg-cropwise-green-light animate-pulse" />
                Live data ready
              </span>
            )}
            <Shield className="w-3 h-3 text-cropwise-faint ml-2" />
            <span className="text-[10px] text-cropwise-faint hidden sm:inline">AI backed by real-time agricultural data</span>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-6 space-y-5">
          {messages.length === 0 ? (
            <EmptyState onSuggest={handleSuggest} language={language} />
          ) : (
            messages.map((message: ChatMessage) => (
              <MessageBubble key={message.id} message={message} language={language} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 border-t border-cropwise-border-muted">
          <ChatInputBar
            onSend={handleSend}
            isLoading={isLoading}
            language={language}
            disabled={isLoading}
            placeholder={
              isLoading
                ? "AI Advisor is responding..."
                : !contextReady
                ? "Loading your farm context..."
                : "Ask about soil health, pest control, or yields..."
            }
          />
        </div>
      </div>
    </div>
  );
}