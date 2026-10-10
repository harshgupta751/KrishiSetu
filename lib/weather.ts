/**
 * lib/weather.ts
 * Real weather + soil moisture / ET₀ / solar data from the Open-Meteo API.
 * Free, no key required. Docs: https://open-meteo.com/en/docs
 *
 * Hardened for shared-host deploys: a 20-minute in-memory cache reduces calls
 * (Open-Meteo rate-limits by IP), and any failure (429/unreachable) falls back to
 * the last cached result or a synthetic estimate so the UI never breaks.
 * Set WEATHER_API_KEY to use Open-Meteo's commercial endpoint and bypass the limit.
 */

import type { WeatherData, WeatherForecastDay } from "@/types";

const WMO_CODES: Record<number, { condition: string; code: string }> = {
  0:  { condition: "Clear Sky",      code: "sunny"         },
  1:  { condition: "Mainly Clear",   code: "sunny"         },
  2:  { condition: "Partly Cloudy",  code: "partly-cloudy" },
  3:  { condition: "Overcast",       code: "overcast"      },
  45: { condition: "Foggy",          code: "overcast"      },
  48: { condition: "Icy Fog",        code: "overcast"      },
  51: { condition: "Light Drizzle",  code: "drizzle"       },
  53: { condition: "Drizzle",        code: "drizzle"       },
  55: { condition: "Heavy Drizzle",  code: "drizzle"       },
  61: { condition: "Light Rain",     code: "rain"          },
  63: { condition: "Rain",           code: "rain"          },
  65: { condition: "Heavy Rain",     code: "rain"          },
  71: { condition: "Light Snow",     code: "overcast"      },
  80: { condition: "Rain Showers",   code: "rain"          },
  95: { condition: "Thunderstorm",   code: "rain"          },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Extended weather response with soil data ─────────────────────────────────

export interface ExtendedWeatherData extends WeatherData {
  soilMoisture:        number;   // % (0-100 scaled)
  soilMoistureRaw:     number;   // m³/m³ raw value
  evapotranspiration:  number;   // mm/day
  solarRadiation:      number;   // kWh/m²
  soilTemp:            number;   // °C at surface
  hourlyTemp:          number[]; // 24h temperature values
  hourlyRain:          number[]; // 24h precipitation probability %
  hourlyTime:          string[]; // 24h time labels
}

// ── In-memory cache so we don't hit Open-Meteo on every request ───────────────
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const weatherCache = new Map<string, { data: ExtendedWeatherData; ts: number }>();
const cacheKeyFor = (lat: number, lng: number) => `${lat.toFixed(2)},${lng.toFixed(2)}`;

export async function fetchWeatherData(
  lat: number,
  lng: number,
  locationName: string
): Promise<ExtendedWeatherData> {
  // Serve a fresh cached result if we have one.
  const key = cacheKeyFor(lat, lng);
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { ...cached.data, location: locationName };
  }

  // Optional commercial key bypasses the shared-IP rate limit.
  const apiKey = process.env.WEATHER_API_KEY?.trim();
  const base = apiKey
    ? "https://customer-api.open-meteo.com/v1/forecast"
    : "https://api.open-meteo.com/v1/forecast";
  const url = new URL(base);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  if (apiKey) url.searchParams.set("apikey", apiKey);

  url.searchParams.set("current", [
    "temperature_2m", "relative_humidity_2m", "apparent_temperature", "precipitation",
    "weather_code", "wind_speed_10m", "visibility", "uv_index", "surface_pressure",
    "soil_temperature_0cm",       // real soil surface temp
    "soil_moisture_0_to_1cm",     // real soil moisture (top layer)
  ].join(","));
  url.searchParams.set("daily", [
    "weather_code", "temperature_2m_max", "temperature_2m_min",
    "precipitation_probability_max", "precipitation_sum",
    "et0_fao_evapotranspiration",  // real evapotranspiration
    "shortwave_radiation_sum",     // real solar radiation
  ].join(","));
  url.searchParams.set("hourly", ["temperature_2m", "precipitation_probability", "soil_moisture_0_to_1cm"].join(","));
  url.searchParams.set("timezone", "Asia/Kolkata");
  url.searchParams.set("forecast_days", "7");

  let data: any;
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    data = await res.json();
  } catch (err) {
    // Rate-limited (429) or unreachable: serve stale cache, else synthetic estimate.
    if (cached) return { ...cached.data, location: locationName };
    const fb = buildFallbackWeather(lat, lng, locationName);
    weatherCache.set(key, { data: fb, ts: Date.now() });
    return fb;
  }

  const cur = data.current, daily = data.daily, hourly = data.hourly;
  const wmoNow = WMO_CODES[cur.weather_code as number] ?? { condition: "Partly Cloudy", code: "partly-cloudy" };

  // 7-day forecast
  const forecast: WeatherForecastDay[] = (daily.time as string[]).slice(0, 7).map((date: string, i: number) => {
    const wmo = WMO_CODES[daily.weather_code[i] as number] ?? { condition: "Partly Cloudy", code: "partly-cloudy" };
    const d = new Date(date);
    return {
      date,
      dayName: i === 0 ? "Today" : DAY_NAMES[d.getDay()],
      high: Math.round(daily.temperature_2m_max[i] as number),
      low: Math.round(daily.temperature_2m_min[i] as number),
      condition: wmo.condition,
      conditionCode: wmo.code,
      precipitationChance: (daily.precipitation_probability_max[i] as number) ?? 0,
    };
  });

  // Real soil moisture: m³/m³ (0.0 dry → 0.5 saturated) → percentage
  const soilMoistureRaw = (cur.soil_moisture_0_to_1cm as number) ?? 0.3;
  const soilMoisture = Math.min(100, Math.round((soilMoistureRaw / 0.5) * 100));
  const evapotranspiration = Math.round(((daily.et0_fao_evapotranspiration?.[0] as number) ?? 4.5) * 10) / 10;
  const solarRadiation = Math.round(((daily.shortwave_radiation_sum?.[0] as number) ?? 18) / 3.6 * 10) / 10;
  const soilTemp = Math.round((cur.soil_temperature_0cm as number) ?? (cur.temperature_2m as number) - 2);

  // 24h hourly trend (next 24 hours from now)
  const hourNow = new Date().getHours();
  const hourlyTemp = (hourly.temperature_2m as number[]).slice(hourNow, hourNow + 24);
  const hourlyRain = (hourly.precipitation_probability as number[]).slice(hourNow, hourNow + 24);
  const hourlyTime = (hourly.time as string[]).slice(hourNow, hourNow + 24).map((t: string) =>
    new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  );

  const result: ExtendedWeatherData = {
    location: locationName,
    temperature: Math.round(cur.temperature_2m as number),
    feelsLike: Math.round(cur.apparent_temperature as number),
    humidity: cur.relative_humidity_2m as number,
    windSpeed: Math.round(cur.wind_speed_10m as number),
    condition: wmoNow.condition,
    conditionCode: wmoNow.code,
    precipitation: cur.precipitation as number,
    uvIndex: cur.uv_index as number,
    visibility: Math.round((cur.visibility as number) / 1000),
    forecast,
    updatedAt: new Date().toISOString(),
    soilMoisture,
    soilMoistureRaw,
    evapotranspiration,
    solarRadiation,
    soilTemp,
    hourlyTemp: hourlyTemp.length ? hourlyTemp : Array(24).fill(cur.temperature_2m),
    hourlyRain: hourlyRain.length ? hourlyRain : Array(24).fill(10),
    hourlyTime: hourlyTime.length ? hourlyTime : Array(24).fill("--"),
  };

  weatherCache.set(key, { data: result, ts: Date.now() });
  return result;
}

// ── Synthetic fallback used only when Open-Meteo is rate-limited/unreachable ──
function buildFallbackWeather(
  lat: number,
  lng: number,
  locationName: string
): ExtendedWeatherData {
  const baseTemp = 30; // typical Indian daytime temperature (°C)
  const today = new Date();

  const forecast: WeatherForecastDay[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const high = baseTemp + ((i * 7) % 5) - 2;
    return {
      date: d.toISOString().split("T")[0],
      dayName: i === 0 ? "Today" : DAY_NAMES[d.getDay()],
      high,
      low: high - 9,
      condition: "Partly Cloudy",
      conditionCode: "partly-cloudy",
      precipitationChance: (i * 13) % 40,
    };
  });

  return {
    location: locationName,
    temperature: baseTemp,
    feelsLike: baseTemp + 2,
    humidity: 55,
    windSpeed: 9,
    condition: "Partly Cloudy",
    conditionCode: "partly-cloudy",
    precipitation: 0,
    uvIndex: 6,
    visibility: 10,
    forecast,
    updatedAt: new Date().toISOString(),
    soilMoisture: 35,
    soilMoistureRaw: 0.18,
    evapotranspiration: 4.5,
    solarRadiation: 5.2,
    soilTemp: baseTemp - 2,
    hourlyTemp: Array.from({ length: 24 }, (_, h) =>
      baseTemp - 4 + Math.round(4 * Math.sin((h / 24) * Math.PI * 2))
    ),
    hourlyRain: Array(24).fill(10),
    hourlyTime: Array.from({ length: 24 }, (_, h) => `${(h % 12) || 12} ${h < 12 ? "AM" : "PM"}`),
  };
}

// ─── Indian farming region coordinates ───────────────────────────────────────

export const REGION_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  "Punjab":          { lat: 30.9010, lng: 75.8573, label: "Ludhiana, Punjab"         },
  "Madhya Pradesh":  { lat: 23.2599, lng: 77.4126, label: "Bhopal, Madhya Pradesh"   },
  "Maharashtra":     { lat: 20.0112, lng: 75.5791, label: "Aurangabad, Maharashtra"  },
  "Uttar Pradesh":   { lat: 26.8467, lng: 80.9462, label: "Lucknow, Uttar Pradesh"   },
  "Gujarat":         { lat: 22.2587, lng: 71.1924, label: "Rajkot, Gujarat"          },
  "Rajasthan":       { lat: 27.0238, lng: 74.2179, label: "Ajmer, Rajasthan"         },
  "Haryana":         { lat: 29.0588, lng: 76.0856, label: "Hisar, Haryana"           },
  "Andhra Pradesh":  { lat: 15.9129, lng: 79.7400, label: "Guntur, Andhra Pradesh"   },
  "Telangana":       { lat: 17.3850, lng: 78.4867, label: "Hyderabad, Telangana"     },
  "Karnataka":       { lat: 15.3173, lng: 75.7139, label: "Dharwad, Karnataka"       },
  "Tamil Nadu":      { lat: 11.1271, lng: 78.6569, label: "Coimbatore, Tamil Nadu"   },
  "Bihar":           { lat: 25.0961, lng: 85.3131, label: "Patna, Bihar"             },
  "West Bengal":     { lat: 22.9868, lng: 87.8550, label: "Barddhaman, West Bengal"  },
  "Odisha":          { lat: 20.9517, lng: 85.0985, label: "Cuttack, Odisha"          },
  "Chhattisgarh":    { lat: 21.2787, lng: 81.8661, label: "Raipur, Chhattisgarh"     },
  "default":         { lat: 23.2599, lng: 77.4126, label: "Bhopal, Madhya Pradesh"   },
};
