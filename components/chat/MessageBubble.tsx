/**
 * components/chat/MessageBubble.tsx
 * Renders a single chat message — user or AI model.
 * AI messages can embed a DiagnosisCard.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Leaf, Volume2, Loader2, Square } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import DiagnosisCard from "./DiagnosisCard";
import type { ChatMessage, LanguageCode } from "@/app/chat/types";
import { toSarvamLang } from "@/app/chat/types";

// ─── Typing indicator (three animated dots) ───────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-cropwise-faint animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "800ms" }}
        />
      ))}
    </div>
  );
}

// ─── Timestamp formatter ──────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
  language?: LanguageCode;
}

export default function MessageBubble({ message, language = "hi" }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  useEffect(() => {
    if (message.shouldAutoPlayAudio && !hasAutoPlayed && !message.isStreaming && message.content && !isUser) {
      setHasAutoPlayed(true);
      handlePlayAudio();
    }
  }, [message.shouldAutoPlayAudio, hasAutoPlayed, message.isStreaming, message.content, isUser]);

  const handlePlayAudio = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!message.content) return;

    try {
      setIsAudioLoading(true);
      const res = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: message.content,
          // Speak in the currently selected chat language.
          targetLanguageCode: toSarvamLang(language),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate audio");
      }

      const data = await res.json();
      if (data.audioBase64) {
        const audioSrc = `data:audio/wav;base64,${data.audioBase64}`;
        if (!audioRef.current) {
          audioRef.current = new Audio(audioSrc);
          audioRef.current.onended = () => setIsPlaying(false);
        } else {
          audioRef.current.src = audioSrc;
        }
        audioRef.current.play().catch(() => {
          // Browser blocked autoplay — user may need to interact first
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("TTS playback error:", error);
      alert("Voice playback is currently unavailable.");
    } finally {
      setIsAudioLoading(false);
    }
  };

  // ── User message ─────────────────────────────────────────────
  if (isUser) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex justify-end px-4 md:px-6 group"
      >
        <div className="max-w-[72%] flex flex-col items-end gap-1">
          {/* Image attachment preview */}
          {message.imagePreviewUrl && (
            <img
              src={message.imagePreviewUrl}
              alt="Attached crop photo"
              className="rounded-xl max-w-[240px] border border-cropwise-border mb-1"
            />
          )}
          {/* Bubble */}
          <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-cropwise-green text-cropwise-bg">
            <p className="text-sm leading-relaxed font-medium">{message.content}</p>
          </div>
          {/* Time */}
          <span className="text-[10px] text-cropwise-faint opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </motion.div>
    );
  }

  // ── AI model message ─────────────────────────────────────────
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="flex items-start gap-3 px-4 md:px-6 group"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cropwise-elevated border border-cropwise-green/30 flex items-center justify-center mt-0.5">
        <Leaf className="w-4 h-4 text-cropwise-green-light" strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Streaming / typing indicator */}
        {message.isStreaming && !message.content ? (
          <div className="bg-cropwise-surface border border-cropwise-border rounded-2xl rounded-tl-sm px-4 py-3 inline-block">
            <TypingIndicator />
          </div>
        ) : (
          <>
            {/* Text bubble */}
            {message.content && (
              <div className="flex flex-col gap-1 items-start max-w-[80%]">
                <div className="bg-cropwise-surface border border-cropwise-border rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-sm text-cropwise-text leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {/* TTS Play Button */}
                {!message.isStreaming && (
                  <button 
                    onClick={handlePlayAudio}
                    disabled={isAudioLoading}
                    className="flex items-center gap-1.5 px-2 py-1 ml-1 rounded-lg text-xs text-cropwise-faint hover:text-cropwise-green-light hover:bg-cropwise-hover transition-all"
                    title={isPlaying ? "Stop audio" : "Play audio (Sarvam AI)"}
                  >
                    {isAudioLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPlaying ? (
                      <Square className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    {isPlaying ? "Stop" : "Listen"}
                  </button>
                )}
              </div>
            )}

            {/* Diagnosis card (embedded in AI message) */}
            {message.diagnosisResult && (
              <DiagnosisCard result={message.diagnosisResult} />
            )}
          </>
        )}

        {/* Time */}
        <span className="text-[10px] text-cropwise-faint opacity-0 group-hover:opacity-100 transition-opacity">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}