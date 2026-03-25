import type { backendInterface } from "../backend.d";
import type { OHLCV } from "./indicators";

export interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  isLive: boolean;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

const BULLISH_KEYWORDS = [
  "rally",
  "surge",
  "breakout",
  "gain",
  "rise",
  "up",
  "high",
  "bull",
  "buy",
  "positive",
  "advance",
  "recover",
  "strong",
  "boost",
  "jump",
];
const BEARISH_KEYWORDS = [
  "fall",
  "drop",
  "decline",
  "down",
  "low",
  "bear",
  "sell",
  "weak",
  "crash",
  "loss",
  "slump",
  "plunge",
  "tumble",
  "retreat",
  "negative",
];

export function analyzeSentiment(
  text: string,
): "bullish" | "bearish" | "neutral" {
  const lower = text.toLowerCase();
  const bullScore = BULLISH_KEYWORDS.filter((k) => lower.includes(k)).length;
  const bearScore = BEARISH_KEYWORDS.filter((k) => lower.includes(k)).length;
  if (bullScore > bearScore) return "bullish";
  if (bearScore > bullScore) return "bearish";
  return "neutral";
}

/**
 * Generates realistic OHLCV data with:
 * - Trending phases (uptrend, downtrend, consolidation)
 * - Pullbacks within trends
 * - Volume spikes on breakouts
 * - Clear swing highs and swing lows (needed for harmonic/SMC detection)
 */
export function generateMockOHLCV(
  basePrice: number,
  count = 120,
  intervalMinutes = 5,
): OHLCV[] {
  const data: OHLCV[] = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);

  // Define phase structure: each phase has direction + length
  type Phase = { dir: 1 | -1 | 0; len: number; strength: number };
  const phases: Phase[] = [
    { dir: -1, len: 18, strength: 0.0018 }, // downtrend
    { dir: 0, len: 8, strength: 0.0005 }, // consolidation
    { dir: 1, len: 20, strength: 0.002 }, // strong uptrend (impulse)
    { dir: -1, len: 10, strength: 0.0012 }, // pullback
    { dir: 0, len: 6, strength: 0.0004 }, // tight consolidation
    { dir: 1, len: 22, strength: 0.0022 }, // impulse leg up
    { dir: -1, len: 14, strength: 0.0015 }, // retracement
    { dir: 1, len: 12, strength: 0.0018 }, // continuation up
    { dir: -1, len: 10, strength: 0.001 }, // minor pullback
  ];

  // Build per-bar direction array
  const barDirs: { dir: 1 | -1 | 0; strength: number }[] = [];
  for (const ph of phases) {
    for (let j = 0; j < ph.len; j++) {
      barDirs.push({ dir: ph.dir, strength: ph.strength });
    }
    if (barDirs.length >= count) break;
  }
  // fill remainder with neutral drift
  while (barDirs.length < count) barDirs.push({ dir: 1, strength: 0.0006 });

  for (let i = 0; i < count; i++) {
    const { dir, strength } = barDirs[i];
    const trendNudge = dir * strength * price;
    const noise = (Math.random() - 0.5) * strength * price * 0.4;
    const change = trendNudge + noise;

    const open = price;
    price = Math.max(price + change, price * 0.985);
    const high = Math.max(open, price) + Math.random() * Math.abs(change) * 0.6;
    const low = Math.min(open, price) - Math.random() * Math.abs(change) * 0.6;

    // Volume spikes on strong moves
    const isTrendBreak = i > 0 && barDirs[i - 1].dir !== dir;
    const baseVol = 80000 + Math.random() * 150000;
    const vol = isTrendBreak ? baseVol * (2.5 + Math.random() * 1.5) : baseVol;

    data.push({
      time: now - (count - 1 - i) * intervalMinutes * 60,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(price * 100) / 100,
      volume: Math.floor(vol),
    });
  }
  return data;
}

const BASE_PRICES: Record<string, number> = {
  "^NSEI": 22850,
  "^NSEBANK": 49200,
  "NIFTY_IT.NS": 36800,
};

const INTERVAL_MINS: Record<string, number> = {
  "5m": 5,
  "15m": 15,
  "1h": 60,
  "1d": 1440,
};

export function getMockIndices(): QuoteData[] {
  const base = 22850 + (Math.random() - 0.5) * 200;
  const bankBase = 49200 + (Math.random() - 0.5) * 400;
  const itBase = 36800 + (Math.random() - 0.5) * 300;
  return [
    {
      symbol: "^NSEI",
      name: "NIFTY 50",
      price: base,
      change: (Math.random() - 0.48) * 150,
      changePct: (Math.random() - 0.48) * 0.8,
      volume: 8500000,
      isLive: false,
    },
    {
      symbol: "^NSEBANK",
      name: "BANK NIFTY",
      price: bankBase,
      change: (Math.random() - 0.48) * 300,
      changePct: (Math.random() - 0.48) * 0.7,
      volume: 4200000,
      isLive: false,
    },
    {
      symbol: "NIFTY_IT.NS",
      name: "NIFTY IT",
      price: itBase,
      change: (Math.random() - 0.48) * 200,
      changePct: (Math.random() - 0.48) * 0.6,
      volume: 1500000,
      isLive: false,
    },
  ];
}

export async function fetchIndices(
  actor?: backendInterface | null,
): Promise<QuoteData[]> {
  if (actor) {
    try {
      const result = await actor.fetchLiveQuotes();
      if (result.isLive) {
        const json = JSON.parse(result.body);
        const results: any[] = json?.quoteResponse?.result ?? [];
        if (results.length > 0) {
          return results.map((r: any) => ({
            symbol: r.symbol ?? "",
            name: r.shortName ?? r.symbol ?? "",
            price: r.regularMarketPrice ?? 0,
            change: r.regularMarketChange ?? 0,
            changePct: r.regularMarketChangePercent ?? 0,
            volume: r.regularMarketVolume ?? 0,
            isLive: true,
          }));
        }
      }
    } catch (err) {
      console.warn("fetchIndices live failed, falling back to mock:", err);
    }
  }
  return getMockIndices();
}

export async function fetchOHLCV(
  symbol: string,
  interval: string,
  _range: string,
  actor?: backendInterface | null,
): Promise<{ data: OHLCV[]; isLive: boolean }> {
  if (actor) {
    try {
      const result = await actor.fetchLiveOHLCV(symbol, interval);
      if (result.isLive) {
        const json = JSON.parse(result.body);
        const chartResult = json?.chart?.result?.[0];
        if (chartResult) {
          const timestamps: number[] = chartResult.timestamp ?? [];
          const quote = chartResult.indicators?.quote?.[0] ?? {};
          const opens: (number | null)[] = quote.open ?? [];
          const highs: (number | null)[] = quote.high ?? [];
          const lows: (number | null)[] = quote.low ?? [];
          const closes: (number | null)[] = quote.close ?? [];
          const volumes: (number | null)[] = quote.volume ?? [];

          const data: OHLCV[] = [];
          for (let i = 0; i < timestamps.length; i++) {
            const o = opens[i];
            const h = highs[i];
            const l = lows[i];
            const c = closes[i];
            const v = volumes[i];
            if (o == null || h == null || l == null || c == null || v == null)
              continue;
            data.push({
              time: timestamps[i],
              open: Math.round(o * 100) / 100,
              high: Math.round(h * 100) / 100,
              low: Math.round(l * 100) / 100,
              close: Math.round(c * 100) / 100,
              volume: Math.floor(v),
            });
          }

          if (data.length > 0) {
            return { data, isLive: true };
          }
        }
      }
    } catch (err) {
      console.warn("fetchOHLCV live failed, falling back to mock:", err);
    }
  }
  return {
    data: generateMockOHLCV(
      BASE_PRICES[symbol] ?? 22850,
      120,
      INTERVAL_MINS[interval] ?? 5,
    ),
    isLive: false,
  };
}

export async function fetchNews(): Promise<NewsItem[]> {
  return getMockNews();
}

function getMockNews(): NewsItem[] {
  const now = Date.now() / 1000;
  return [
    {
      title: "Nifty 50 surges 200 points as FII inflows boost market sentiment",
      publisher: "Economic Times",
      link: "#",
      publishedAt: now - 300,
      sentiment: "bullish",
    },
    {
      title:
        "Bank Nifty breakout: Bulls target 50,000 levels amid strong rally",
      publisher: "Moneycontrol",
      link: "#",
      publishedAt: now - 900,
      sentiment: "bullish",
    },
    {
      title: "IT stocks recover as global tech rally lifts NIFTY IT index",
      publisher: "Business Standard",
      link: "#",
      publishedAt: now - 1800,
      sentiment: "bullish",
    },
    {
      title: "RBI policy decision in focus; markets await rate guidance",
      publisher: "NDTV Profit",
      link: "#",
      publishedAt: now - 3600,
      sentiment: "neutral",
    },
    {
      title: "Options expiry: Nifty puts gain as bears defend 22,800 level",
      publisher: "Livemint",
      link: "#",
      publishedAt: now - 5400,
      sentiment: "bearish",
    },
    {
      title: "India VIX drops to 3-month low signaling lower volatility ahead",
      publisher: "Zerodha Blog",
      link: "#",
      publishedAt: now - 7200,
      sentiment: "bullish",
    },
  ];
}
