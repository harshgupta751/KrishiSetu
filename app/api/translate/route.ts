/**
 * app/api/translate/route.ts
 * Batch UI-string translation via Sarvam AI (/translate, mayura:v1).
 * Used by the client i18n layer to localize the whole app on demand.
 *
 * Request:  { texts: string[], target: "hi-IN" | ... , source?: "en-IN" }
 * Response: { translations: { [sourceText]: translatedText } }
 *
 * Results are cached in-process to avoid re-paying for repeated strings.
 */

import { NextResponse } from "next/server";

const SARVAM_URL = "https://api.sarvam.ai/translate";

// In-memory cache: `${target}:::${text}` -> translated
const cache = new Map<string, string>();

async function translateOne(text: string, target: string, key: string): Promise<string> {
  const cacheKey = `${target}:::${text}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const res = await fetch(SARVAM_URL, {
    method: "POST",
    headers: { "api-subscription-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: text.slice(0, 1900),
      source_language_code: "auto",
      target_language_code: target,
      model: "sarvam-translate:v1",
      mode: "formal",
    }),
  });

  if (!res.ok) throw new Error(`Sarvam translate ${res.status}`);
  const data = await res.json();
  const out = data.translated_text ?? text;
  cache.set(cacheKey, out);
  return out;
}

export async function POST(request: Request) {
  try {
    const { texts, target } = (await request.json()) as { texts: string[]; target: string };

    if (!Array.isArray(texts) || !target) {
      return NextResponse.json({ error: "texts[] and target required" }, { status: 400 });
    }
    if (target === "en-IN") {
      // No-op: source is English.
      const identity: Record<string, string> = {};
      for (const t of texts) identity[t] = t;
      return NextResponse.json({ translations: identity });
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      // No key → return source unchanged so the UI still works (in English).
      const identity: Record<string, string> = {};
      for (const t of texts) identity[t] = t;
      return NextResponse.json({ translations: identity });
    }

    // De-duplicate and translate with limited concurrency.
    const unique = Array.from(new Set(texts.filter((t) => typeof t === "string" && t.trim())));
    const translations: Record<string, string> = {};
    const CONCURRENCY = 8;

    for (let i = 0; i < unique.length; i += CONCURRENCY) {
      const batch = unique.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((t) => translateOne(t, target, apiKey)),
      );
      results.forEach((r, j) => {
        translations[batch[j]] = r.status === "fulfilled" ? r.value : batch[j];
      });
    }

    return NextResponse.json({ translations });
  } catch (error) {
    console.error("Translate route error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
