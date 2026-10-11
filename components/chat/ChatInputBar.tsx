/**
 * components/chat/ChatInputBar.tsx
 * Rich input bar at the bottom of the chat.
 * Features: image attach (AI image analysis), file clip, voice mic, send button.
 * Matches the design screenshot exactly.
 */

"use client";

import { useRef, useState, useEffect, type KeyboardEvent } from "react";
import {
  ImagePlus,
  Paperclip,
  Mic,
  Send,
  X,
  Loader2,
  Square
} from "lucide-react";
import { cn, fileToBase64, getImageMimeType } from "@/lib/utils";
import { toSarvamLang, type LanguageCode } from "@/app/chat/types";

// ─── Component ────────────────────────────────────────────────────────────────

interface ChatInputBarProps {
  onSend: (text: string, image?: { base64: string; mimeType: string; previewUrl: string }) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  language?: LanguageCode;
  initialText?: string;
}

export default function ChatInputBar({
  onSend,
  isLoading,
  disabled = false,
  placeholder = "Ask about soil health, pest control, or yields...",
  language = "hi",
  initialText = "",
}: ChatInputBarProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── Image selection ───────────────────────────────────────────
  const handleImageSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const base64 = await fileToBase64(file);
    const mimeType = getImageMimeType(file);
    const previewUrl = `data:${mimeType};base64,${base64}`;

    setImagePreview(previewUrl);
    setImageData({ base64, mimeType });
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageData(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // ── Send ──────────────────────────────────────────────────────
  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !imageData) return;
    if (isLoading) return;

    onSend(
      trimmed || "Please diagnose the disease in this image.",
      imageData && imagePreview
        ? { ...imageData, previewUrl: imagePreview }
        : undefined
    );

    setText("");
    clearImage();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // ── Enter to send (Shift+Enter = newline) ─────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Auto-resize textarea ──────────────────────────────────────
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  };

  // ── Voice Recording (Sarvam AI STT) ───────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Call Sarvam STT API here
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.wav");
          // Transcribe in the currently selected chat language.
          formData.append("language_code", toSarvamLang(language));

          const res = await fetch("/api/sarvam/stt", {
            method: "POST",
            body: formData,
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.transcript) {
              setText((prev) => (prev ? prev + " " + data.transcript : data.transcript));
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
              }
            }
          } else {
            console.error("STT Error", await res.text());
          }
        } catch (error) {
          console.error("STT failed", error);
        } finally {
          setIsTranscribing(false);
          // Stop all tracks
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Please allow microphone access to use voice chat.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const canSend = (text.trim().length > 0 || imageData !== null) && !isLoading && !disabled && !isTranscribing;

  return (
    <div className="px-4 md:px-6 pb-4 pt-2">
      {/* ── Image preview strip ────────────────────────────────── */}
      {imagePreview && (
        <div className="mb-2 flex items-start gap-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Image to analyse"
              className="h-20 w-20 object-cover rounded-xl border border-cropwise-border"
            />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-cropwise-bg border border-cropwise-border flex items-center justify-center text-cropwise-muted hover:text-rose-400 transition-colors"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>
          </div>
          <span className="text-xs text-cropwise-faint mt-2">
            Image attached — AI will analyse it
          </span>
        </div>
      )}

      {/* ── Input container ────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-end gap-2 px-3 py-2.5 rounded-2xl border transition-colors duration-150",
          "bg-cropwise-surface border-cropwise-border",
          "focus-within:border-cropwise-border"
        )}
      >
        {/* Left actions */}
        <div className="flex items-center gap-1 pb-0.5">
          {/* AI image analysis */}
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
            className="p-1.5 rounded-lg text-cropwise-faint hover:text-cropwise-green-light hover:bg-cropwise-hover transition-all disabled:opacity-40"
            title="Attach image for AI analysis"
          >
            <ImagePlus className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>

        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Recording... Click stop when done." : isTranscribing ? "Transcribing..." : placeholder}
          disabled={disabled || isLoading || isRecording || isTranscribing}
          rows={1}
          className={cn(
            "flex-1 bg-transparent text-sm text-cropwise-text placeholder:text-cropwise-faint",
            "outline-none resize-none leading-relaxed py-0.5",
            "disabled:opacity-50",
            "min-h-[24px] max-h-[140px]"
          )}
        />

        {/* Right actions */}
        <div className="flex items-center gap-1 pb-0.5">
          {/* Voice (Sarvam STT) */}
          <button
            onClick={toggleRecording}
            disabled={disabled || isTranscribing}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              isRecording 
                ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 animate-pulse" 
                : "text-cropwise-faint hover:text-cropwise-muted hover:bg-cropwise-hover disabled:opacity-40"
            )}
            title={isRecording ? "Stop recording" : "Voice input (Sarvam AI)"}
          >
            {isTranscribing ? (
               <Loader2 className="w-[18px] h-[18px] animate-spin" />
            ) : isRecording ? (
               <Square className="w-[18px] h-[18px]" strokeWidth={2} />
            ) : (
               <Mic className="w-[18px] h-[18px]" strokeWidth={2} />
            )}
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "p-2 rounded-xl transition-all duration-150 active:scale-95",
              canSend
                ? "bg-cropwise-green text-cropwise-bg hover:bg-cropwise-green-light shadow-[0_2px_8px_rgba(46,168,46,0.3)]"
                : "bg-cropwise-elevated text-cropwise-faint cursor-not-allowed"
            )}
            title="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      {/* ── Footer note ────────────────────────────────────────── */}
      <p className="text-center text-[10px] text-cropwise-faint mt-2 flex items-center justify-center gap-1">
        <span className="w-1 h-1 rounded-full bg-cropwise-green inline-block" />
        AI analysis backed by regional agricultural datasets
      </p>

      {/* Hidden image input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageSelect(file);
        }}
      />
    </div>
  );
}