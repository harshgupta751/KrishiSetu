/**
 * lib/market-prices.ts
 * Real commodity prices from the data.gov.in Agmarknet API.
 *
 * Resource: "Current Daily Price of Various Commodities from Various Markets (Mandi)"
 *   https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
 *
 * This resource is CURRENT-DAY ONLY (no historical archive), so:
 *   - fetchMandiPrices()      → real, live, district-wise prices.
 *   - fetchHistoricalPrices() → synthetic 6-month trend anchored to the
 *                               real latest national modal price for the crop.
 *
 * API key: set MARKET_API_KEY in .env.local. Get a free key at
 *   https://data.gov.in/user/register  →  https://data.gov.in/help/how-use-datasets-apis
 * If unset, the public data.gov.in sample key is used (rate-limited; fine for dev).
 */

import type { MarketPrice, MarketHistoricalPoint } from "@/types";

const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

// Public data.gov.in sample key — works out of the box for development.
// Replace by setting MARKET_API_KEY in .env.local with your own free key.
const PUBLIC_SAMPLE_KEY =
  "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";

function getApiKey(): string {
  const k = process.env.MARKET_API_KEY;
  if (k && k.trim() && k !== "your_data_gov_in_api_key") return k.trim();
  return PUBLIC_SAMPLE_KEY;
}

// ─── Known staples: display name, Hindi, MSP 2024-25 (INR/quintal), match keys ──
// `match` entries are lowercase substrings tested against the API commodity name.
interface CropMeta { display: string; hi: string; msp: number; match: string[]; priority: number; }

const CROP_META: CropMeta[] = [
  { display: "Wheat",        hi: "गेहूं",   msp: 2275, match: ["wheat"],                       priority: 1 },
  { display: "Rice (Paddy)", hi: "धान",     msp: 2300, match: ["paddy", "dhan", "rice"],        priority: 2 },
  { display: "Maize",        hi: "मक्का",    msp: 2090, match: ["maize"],                        priority: 3 },
  { display: "Bajra",        hi: "बाजरा",    msp: 2625, match: ["bajra", "pearl millet"],        priority: 4 },
  { display: "Jowar",        hi: "ज्वार",    msp: 3371, match: ["jowar", "sorghum"],             priority: 5 },
  { display: "Barley",       hi: "जौ",      msp: 1850, match: ["barley"],                       priority: 6 },
  { display: "Gram (Chana)", hi: "चना",     msp: 5440, match: ["bengal gram", "gram", "chana"],  priority: 7 },
  { display: "Tur (Arhar)",  hi: "अरहर",     msp: 7550, match: ["arhar", "tur", "red gram"],     priority: 8 },
  { display: "Moong",        hi: "मूंग",     msp: 8682, match: ["moong", "green gram"],          priority: 9 },
  { display: "Urad",         hi: "उड़द",     msp: 7400, match: ["urad", "black gram"],           priority: 10 },
  { display: "Lentil (Masur)", hi: "मसूर",  msp: 6700, match: ["masur", "lentil"],               priority: 11 },
  { display: "Soybean",      hi: "सोयाबीन", msp: 4892, match: ["soyabean", "soybean"],           priority: 12 },
  { display: "Groundnut",    hi: "मूंगफली", msp: 6783, match: ["groundnut"],                     priority: 13 },
  { display: "Mustard",      hi: "सरसों",    msp: 5950, match: ["mustard", "rapeseed", "sarson"], priority: 14 },
  { display: "Sunflower",    hi: "सूरजमुखी", msp: 7280, match: ["sunflower"],                     priority: 15 },
  { display: "Cotton",       hi: "कपास",     msp: 7121, match: ["cotton", "kapas"],              priority: 16 },
  { display: "Sugarcane",    hi: "गन्ना",    msp: 0,    match: ["sugarcane"],                    priority: 17 },
];

// Hindi names for common non-MSP commodities (vegetables/fruits) for nicer display.
const HINDI_FALLBACK: Record<string, string> = {
  onion: "प्याज", potato: "आलू", tomato: "टमाटर", garlic: "लहसुन", ginger: "अदरक",
  cauliflower: "फूलगोभी", cabbage: "पत्ता गोभी", brinjal: "बैंगन", lady: "भिंडी",
  bhindi: "भिंडी", cucumber: "खीरा", cucumbar: "खीरा", pumpkin: "कद्दू",
  capsicum: "शिमला मिर्च", "green chilli": "हरी मिर्च", chilli: "मिर्च",
  carrot: "गाजर", peas: "मटर", spinach: "पालक", coriander: "धनिया",
  banana: "केला", mango: "आम", apple: "सेब", lemon: "नींबू", colacasia: "अरबी",
  "bottle gourd": "लौकी", "bitter gourd": "करेला",
};

function matchCrop(apiCommodity: string): CropMeta | null {
  const c = apiCommodity.toLowerCase();
  for (const m of CROP_META) {
    if (m.match.some((k) => c.includes(k))) return m;
  }
  return null;
}

function hindiFor(apiCommodity: string): string | undefined {
  const c = apiCommodity.toLowerCase();
  for (const [k, v] of Object.entries(HINDI_FALLBACK)) if (c.includes(k)) return v;
  return undefined;
}

// ─── Low-level fetch against the Agmarknet resource ───────────────────────────

interface AgmarkRecord {
  state: string; district: string; market: string; commodity: string;
  variety?: string; grade?: string; arrival_date?: string;
  min_price?: string | number; max_price?: string | number; modal_price?: string | number;
}

async function fetchRecords(params: Record<string, string>, limit = 200): Promise<AgmarkRecord[]> {
  const url = new URL(API_BASE);
  url.searchParams.set("api-key", getApiKey());
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Agmarknet API ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.records) ? (data.records as AgmarkRecord[]) : [];
}

const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

// ─── Public: live district-wise mandi prices ──────────────────────────────────

export async function fetchMandiPrices(
  state?: string,
  district?: string,
): Promise<MarketPrice[]> {
  try {
    const params: Record<string, string> = {};
    if (state) params["filters[state.keyword]"] = state;
    if (district) params["filters[district]"] = district;

    let records = await fetchRecords(params, 1000);

    // Strict client-side scoping so a district NEVER shows another district's
    // (or the whole state's) data. If the selected location has no arrivals
    // today, we return an empty list and the UI shows an honest empty state —
    // we do NOT fabricate identical numbers across districts.
    if (state) {
      records = records.filter(
        (r) => r.state?.toLowerCase() === state.toLowerCase(),
      );
    }
    if (district) {
      records = records.filter(
        (r) => r.district?.toLowerCase() === district.toLowerCase(),
      );
    }

    // Real data (may legitimately be empty for a quiet district/day).
    return groupRecords(records);
  } catch (e) {
    // Synthetic data is used ONLY when the API itself is unreachable, so the
    // page isn't blank during an outage. Empty live results are NOT replaced.
    console.error("Agmarknet API unreachable, using offline fallback:", e);
    return getRegionalFallbackPrices(state, district);
  }
}

// Group raw records by commodity → one row each, averaging modal price across
// the location's markets. Real MSP attached when the commodity is a staple.
function groupRecords(records: AgmarkRecord[]): MarketPrice[] {
  const now = new Date().toISOString();
  const buckets = new Map<string, { sum: number; n: number; market: string; api: string }>();

  for (const r of records) {
    const modal = num(r.modal_price) || (num(r.min_price) + num(r.max_price)) / 2;
    if (!modal) continue;
    const meta = matchCrop(r.commodity);
    const key = meta ? meta.display : r.commodity;
    const b = buckets.get(key);
    if (b) { b.sum += modal; b.n += 1; }
    else buckets.set(key, { sum: modal, n: 1, market: `${r.market}, ${r.district}`, api: r.commodity });
  }

  const rows: Array<MarketPrice & { _priority: number }> = [];
  for (const [name, b] of Array.from(buckets.entries())) {
    const meta = CROP_META.find((m) => m.display === name);
    const modal = Math.round(b.sum / b.n);
    const msp = meta?.msp ?? 0;
    rows.push({
      cropName: name,
      cropNameHi: meta?.hi ?? hindiFor(b.api),
      msp,
      currentPrice: modal,
      priceChange: msp ? modal - msp : 0,
      priceChangePercent: msp ? parseFloat((((modal - msp) / msp) * 100).toFixed(2)) : 0,
      unit: "quintal",
      market: b.market,
      lastUpdated: now,
      _priority: meta?.priority ?? 999,
    });
  }

  // Staples first (by priority), then everything else alphabetically.
  rows.sort((a, b) =>
    a._priority !== b._priority
      ? a._priority - b._priority
      : a.cropName.localeCompare(b.cropName),
  );
  return rows.slice(0, 18).map(({ _priority, ...rest }) => rest);
}

// ─── Fallback regional prices (used only when live feed is empty) ─────────────

const STATE_PRICE_OFFSETS: Record<string, Record<string, number>> = {
  "Punjab":          { "Wheat": 65, "Rice (Paddy)": -20, "Maize": 60,   "Cotton": 229,  "Mustard": -150, "Soybean": -142, "Groundnut": 117,  "Tur (Arhar)": 250 },
  "Haryana":         { "Wheat": 55, "Rice (Paddy)": -10, "Maize": 45,   "Cotton": 200,  "Mustard": -100, "Soybean": -120, "Groundnut": 100,  "Tur (Arhar)": 220 },
  "Uttar Pradesh":   { "Wheat": 40, "Rice (Paddy)": 30,  "Maize": 80,   "Cotton": 150,  "Mustard": 50,   "Soybean": -80,  "Groundnut": 80,   "Tur (Arhar)": 300 },
  "Madhya Pradesh":  { "Wheat": 30, "Rice (Paddy)": 10,  "Maize": 100,  "Cotton": 100,  "Mustard": 100,  "Soybean": 200,  "Groundnut": 60,   "Tur (Arhar)": 350 },
  "Rajasthan":       { "Wheat": 20, "Rice (Paddy)": 50,  "Maize": 40,   "Cotton": 250,  "Mustard": 200,  "Soybean": -50,  "Groundnut": 150,  "Tur (Arhar)": 180 },
  "Maharashtra":     { "Wheat": 10, "Rice (Paddy)": 60,  "Maize": 120,  "Cotton": 300,  "Mustard": -50,  "Soybean": 250,  "Groundnut": 200,  "Tur (Arhar)": 400 },
  "Gujarat":         { "Wheat": 15, "Rice (Paddy)": 40,  "Maize": 90,   "Cotton": 350,  "Mustard": 80,   "Soybean": 180,  "Groundnut": 300,  "Tur (Arhar)": 200 },
  "Karnataka":       { "Wheat": -20,"Rice (Paddy)": 80,  "Maize": 150,  "Cotton": 280,  "Mustard": -80,  "Soybean": 220,  "Groundnut": 250,  "Tur (Arhar)": 450 },
  "Andhra Pradesh":  { "Wheat": -30,"Rice (Paddy)": 100, "Maize": 130,  "Cotton": 320,  "Mustard": -100, "Soybean": 200,  "Groundnut": 300,  "Tur (Arhar)": 420 },
  "Telangana":       { "Wheat": -40,"Rice (Paddy)": 120, "Maize": 110,  "Cotton": 290,  "Mustard": -120, "Soybean": 190,  "Groundnut": 280,  "Tur (Arhar)": 430 },
  "Tamil Nadu":      { "Wheat": -50,"Rice (Paddy)": 150, "Maize": 100,  "Cotton": 260,  "Mustard": -140, "Soybean": 160,  "Groundnut": 260,  "Tur (Arhar)": 400 },
  "Bihar":           { "Wheat": 50, "Rice (Paddy)": 20,  "Maize": 70,   "Cotton": -50,  "Mustard": 30,   "Soybean": -100, "Groundnut": 50,   "Tur (Arhar)": 280 },
  "Odisha":          { "Wheat": -60,"Rice (Paddy)": 90,  "Maize": 50,   "Cotton": -80,  "Mustard": -60,  "Soybean": -150, "Groundnut": 40,   "Tur (Arhar)": 350 },
  "West Bengal":     { "Wheat": -10,"Rice (Paddy)": 110, "Maize": 60,   "Cotton": -100, "Mustard": 40,   "Soybean": -120, "Groundnut": 30,   "Tur (Arhar)": 300 },
  "Chhattisgarh":    { "Wheat": -20,"Rice (Paddy)": 70,  "Maize": 90,   "Cotton": 80,   "Mustard": -70,  "Soybean": 170,  "Groundnut": 70,   "Tur (Arhar)": 380 },
};

const STATE_MANDIS: Record<string, string[]> = {
  "Punjab":          ["Ludhiana", "Amritsar", "Patiala", "Bathinda", "Jalandhar"],
  "Haryana":         ["Karnal", "Hisar", "Sirsa", "Ambala", "Rohtak"],
  "Uttar Pradesh":   ["Kanpur", "Lucknow", "Agra", "Varanasi", "Meerut"],
  "Madhya Pradesh":  ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
  "Rajasthan":       ["Jaipur", "Jodhpur", "Kota", "Ajmer", "Udaipur"],
  "Maharashtra":     ["Nagpur", "Pune", "Nashik", "Aurangabad", "Solapur"],
  "Gujarat":         ["Rajkot", "Surat", "Ahmedabad", "Vadodara", "Bhavnagar"],
  "Karnataka":       ["Bengaluru", "Hubli", "Mysuru", "Belagavi", "Kalaburagi"],
  "Andhra Pradesh":  ["Guntur", "Kurnool", "Vijayawada", "Visakhapatnam", "Kadapa"],
  "Telangana":       ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Tamil Nadu":      ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  "Bihar":           ["Patna", "Muzaffarpur", "Gaya", "Bhagalpur", "Darbhanga"],
  "Odisha":          ["Bhubaneswar", "Cuttack", "Berhampur", "Sambalpur", "Rourkela"],
  "West Bengal":     ["Kolkata", "Asansol", "Siliguri", "Howrah", "Burdwan"],
  "Chhattisgarh":    ["Raipur", "Bilaspur", "Durg", "Korba", "Rajnandgaon"],
};

function getRegionalFallbackPrices(state?: string, district?: string): MarketPrice[] {
  const now     = new Date().toISOString();
  const offsets = STATE_PRICE_OFFSETS[state ?? ""] ?? STATE_PRICE_OFFSETS["Punjab"];
  const mandis  = STATE_MANDIS[state ?? ""] ?? STATE_MANDIS["Punjab"];
  const mandiCity = district ?? mandis[0];

  const crops: Array<{ name: string; nameHi: string; msp: number }> = [
    { name: "Wheat",        nameHi: "गेहूं",    msp: 2275 },
    { name: "Rice (Paddy)", nameHi: "धान",       msp: 2300 },
    { name: "Maize",        nameHi: "मक्का",     msp: 2090 },
    { name: "Soybean",      nameHi: "सोयाबीन",  msp: 4892 },
    { name: "Cotton",       nameHi: "कपास",      msp: 7121 },
    { name: "Mustard",      nameHi: "सरसों",     msp: 5950 },
    { name: "Groundnut",    nameHi: "मूंगफली",  msp: 6783 },
    { name: "Tur (Arhar)",  nameHi: "अरहर",      msp: 7550 },
  ];

  return crops.map((c, i) => {
    const offset = offsets[c.name] ?? 0;
    const currentPrice = c.msp + offset;
    return {
      cropName:           c.name,
      cropNameHi:         c.nameHi,
      msp:                c.msp,
      currentPrice,
      priceChange:        offset,
      priceChangePercent: parseFloat(((offset / c.msp) * 100).toFixed(2)),
      unit:               "quintal" as const,
      market:             `${mandiCity} Mandi, ${mandis[i % mandis.length]}`,
      lastUpdated:        now,
    };
  });
}

// ─── Historical (synthetic, anchored to the real latest national price) ───────

export async function fetchHistoricalPrices(
  cropName: string,
): Promise<MarketHistoricalPoint[]> {
  const meta = CROP_META.find((m) => m.display === cropName);
  const msp = meta?.msp ?? 2000;

  // Try to anchor the most recent point to a real national modal price.
  let latest = msp;
  try {
    const records = await fetchRecords(
      { "filters[commodity]": meta?.match[0] ?? cropName },
      200,
    );
    const modals = records.map((r) => num(r.modal_price)).filter(Boolean);
    if (modals.length) {
      latest = Math.round(modals.reduce((a, b) => a + b, 0) / modals.length);
    }
  } catch (e) {
    console.error("Historical anchor fetch failed:", e);
  }

  return buildTrend(latest, msp);
}

// Smooth 6-month series ending at `latest`, oscillating around the MSP.
function buildTrend(latest: number, msp: number): MarketHistoricalPoint[] {
  const points: MarketHistoricalPoint[] = [];
  const start = Math.round(latest * 0.94);
  for (let i = 17; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 10);
    const t = (17 - i) / 17;
    const wave = Math.sin(t * Math.PI * 2.5) * latest * 0.03;
    const price = i === 0 ? latest : Math.round(start + (latest - start) * t + wave);
    points.push({ date: d.toISOString().split("T")[0], price, msp });
  }
  return points;
}
