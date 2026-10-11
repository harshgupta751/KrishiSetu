/**
 * app/api/market/route.ts
 * Server-side market prices API route.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchMandiPrices, fetchHistoricalPrices } from "@/lib/market-prices";

// In-memory cache to eliminate repeated latency across requests
interface CacheEntry {
  data: any;
  timestamp: number;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const type     = searchParams.get("type") ?? "current";   // "current" | "historical"
  const crop     = searchParams.get("crop") ?? "Wheat";
  const state    = searchParams.get("state") ?? undefined;
  const district = searchParams.get("district") ?? undefined;

  const cacheKey = `${type}:${crop}:${state ?? ""}:${district ?? ""}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json({ success: true, data: cached.data });
  }

  try {
    if (type === "historical") {
      const data = await fetchHistoricalPrices(crop, state, district);
      memoryCache.set(cacheKey, { data, timestamp: Date.now() });
      return NextResponse.json({ success: true, data });
    }

    const data = await fetchMandiPrices(state, district);
    memoryCache.set(cacheKey, { data, timestamp: Date.now() });
    return NextResponse.json({ success: true, data }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (err) {
    console.error("[Market API]", err);
    return NextResponse.json({ success: false, error: "Market data fetch failed" }, { status: 500 });
  }
}