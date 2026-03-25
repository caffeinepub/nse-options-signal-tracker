import { OptionType, type Signal, Status, Strategy } from "../backend.d";
import {
  type OHLCV,
  avgVolume,
  calcATMStrike,
  calcBB,
  calcEMA,
  calcMACD,
  calcRSI,
  nearestThursday,
} from "./indicators";
import type { NewsItem } from "./marketData";

export interface GeneratedSignal {
  id?: bigint;
  symbol: string;
  optionType: OptionType;
  strikePrice: number;
  expiry: string;
  strategy: Strategy;
  advancedStrategy?: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;
  status: Status;
  timestamp: number;
  reason: string;
}

export interface StrategyState {
  rsi: number;
  rsiSignal: "bullish" | "bearish" | "neutral";
  macdValue: number;
  macdSignal: "bullish" | "bearish" | "neutral";
  bbPosition:
    | "above_upper"
    | "near_upper"
    | "middle"
    | "near_lower"
    | "below_lower";
  volumeRatio: number;
  pcr: number;
  pcrSignal: "bullish" | "bearish" | "neutral";
  newsSignal: "bullish" | "bearish" | "neutral";
  oiSignal: "bullish" | "bearish" | "neutral";
  harmonicPattern: string;
  smcSignal: string;
}

// ─── Swing Points ────────────────────────────────────────────────────────────

interface SwingPoint {
  index: number;
  price: number;
  type: "high" | "low";
}

function findSwingPoints(candles: OHLCV[], window = 5): SwingPoint[] {
  const points: SwingPoint[] = [];
  for (let i = window; i < candles.length - window; i++) {
    const slice = candles.slice(i - window, i + window + 1);
    const isHigh = slice.every((c) => c.high <= candles[i].high);
    const isLow = slice.every((c) => c.low >= candles[i].low);
    if (isHigh) points.push({ index: i, price: candles[i].high, type: "high" });
    else if (isLow)
      points.push({ index: i, price: candles[i].low, type: "low" });
  }
  return points;
}

// ─── Harmonic Patterns ───────────────────────────────────────────────────────

export interface HarmonicResult {
  pattern: string;
  direction: "bullish" | "bearish";
  dPoint: number;
}

const FIB_TOLERANCE = 0.15;

function fibCheck(ratio: number, target: number): boolean {
  return Math.abs(ratio - target) <= target * FIB_TOLERANCE;
}

function retracement(from: number, to: number, at: number): number {
  return Math.abs((at - from) / (to - from));
}

export function detectHarmonicPatterns(
  candles: OHLCV[],
): HarmonicResult | null {
  const swings = findSwingPoints(candles, 5);
  if (swings.length < 5) return null;

  // Take the last 5 swing points as X,A,B,C,D
  const last5 = swings.slice(-5);
  const [X, A, B, C, D] = last5;

  const xaLen = Math.abs(A.price - X.price);
  const abLen = Math.abs(B.price - A.price);
  const bcLen = Math.abs(C.price - B.price);
  const cdLen = Math.abs(D.price - C.price);

  if (xaLen === 0 || abLen === 0 || bcLen === 0 || cdLen === 0) return null;

  const abRet = retracement(X.price, A.price, B.price);
  const bcRet = retracement(A.price, B.price, C.price);
  const cdExt = cdLen / bcLen;
  const bullish =
    A.type === "high" &&
    B.type === "low" &&
    C.type === "high" &&
    D.type === "low";
  const bearish =
    A.type === "low" &&
    B.type === "high" &&
    C.type === "low" &&
    D.type === "high";
  if (!bullish && !bearish) return null;

  const dir = bullish ? "bullish" : "bearish";

  // Gartley: AB=0.618 XA ret, BC=0.382-0.886, CD=1.272-1.618 of BC
  if (
    fibCheck(abRet, 0.618) &&
    bcRet >= 0.382 * (1 - FIB_TOLERANCE) &&
    bcRet <= 0.886 * (1 + FIB_TOLERANCE) &&
    cdExt >= 1.272 * (1 - FIB_TOLERANCE) &&
    cdExt <= 1.618 * (1 + FIB_TOLERANCE)
  ) {
    return { pattern: "Gartley", direction: dir, dPoint: D.price };
  }

  // Bat: AB=0.382-0.50, BC=0.382-0.886, CD=1.618-2.618
  if (
    abRet >= 0.382 * (1 - FIB_TOLERANCE) &&
    abRet <= 0.5 * (1 + FIB_TOLERANCE) &&
    bcRet >= 0.382 * (1 - FIB_TOLERANCE) &&
    bcRet <= 0.886 * (1 + FIB_TOLERANCE) &&
    cdExt >= 1.618 * (1 - FIB_TOLERANCE) &&
    cdExt <= 2.618 * (1 + FIB_TOLERANCE)
  ) {
    return { pattern: "Bat", direction: dir, dPoint: D.price };
  }

  // Butterfly: AB=0.786 XA, CD=1.272-1.618 XA
  const xaCdExt = cdLen / xaLen;
  if (
    fibCheck(abRet, 0.786) &&
    xaCdExt >= 1.272 * (1 - FIB_TOLERANCE) &&
    xaCdExt <= 1.618 * (1 + FIB_TOLERANCE)
  ) {
    return { pattern: "Butterfly", direction: dir, dPoint: D.price };
  }

  // Crab: AB=0.382-0.618, CD=2.618 XA
  if (
    abRet >= 0.382 * (1 - FIB_TOLERANCE) &&
    abRet <= 0.618 * (1 + FIB_TOLERANCE) &&
    fibCheck(xaCdExt, 2.618)
  ) {
    return { pattern: "Crab", direction: dir, dPoint: D.price };
  }

  return null;
}

// ─── Smart Money Concepts (SMC) ───────────────────────────────────────────────

export interface OrderBlock {
  price: number;
  direction: "bullish" | "bearish";
}

export interface FairValueGap {
  top: number;
  bottom: number;
  direction: "bullish" | "bearish";
}

export interface SMCResult {
  orderBlock: OrderBlock | null;
  fvg: FairValueGap | null;
  bos: "bullish" | "bearish" | null;
  choch: "bullish" | "bearish" | null;
  summary: string;
}

export function detectSMC(candles: OHLCV[]): SMCResult {
  const result: SMCResult = {
    orderBlock: null,
    fvg: null,
    bos: null,
    choch: null,
    summary: "Scanning...",
  };
  if (candles.length < 20) return result;

  const n = candles.length;

  // ── Order Block: last bearish candle before a 3-bar bullish impulse (or vice versa)
  for (let i = n - 5; i >= 5; i--) {
    const c = candles[i];
    const isBearish = c.close < c.open;
    const isBullish = c.close > c.open;
    // Bullish OB: bearish candle followed by strong bullish move
    if (isBearish) {
      const impulse = candles.slice(i + 1, i + 4);
      const impulseUp =
        impulse.every((x) => x.close > x.open) &&
        impulse[impulse.length - 1].close > c.high * 1.003;
      if (impulseUp) {
        result.orderBlock = {
          price: (c.high + c.low) / 2,
          direction: "bullish",
        };
        break;
      }
    }
    // Bearish OB: bullish candle followed by strong bearish move
    if (isBullish) {
      const impulse = candles.slice(i + 1, i + 4);
      const impulseDown =
        impulse.every((x) => x.close < x.open) &&
        impulse[impulse.length - 1].close < c.low * 0.997;
      if (impulseDown) {
        result.orderBlock = {
          price: (c.high + c.low) / 2,
          direction: "bearish",
        };
        break;
      }
    }
  }

  // ── Fair Value Gap: 3-candle pattern
  for (let i = n - 3; i >= 1; i--) {
    const prev = candles[i - 1];
    const next = candles[i + 1];
    if (prev && next) {
      if (prev.high < next.low) {
        // Bullish FVG
        result.fvg = { top: next.low, bottom: prev.high, direction: "bullish" };
        break;
      }
      if (prev.low > next.high) {
        // Bearish FVG
        result.fvg = { top: prev.low, bottom: next.high, direction: "bearish" };
        break;
      }
    }
  }

  // ── Break of Structure
  const swings = findSwingPoints(candles, 5);
  if (swings.length >= 2) {
    const recentHigh = swings.filter((s) => s.type === "high").slice(-1)[0];
    const recentLow = swings.filter((s) => s.type === "low").slice(-1)[0];
    const currentClose = candles[n - 1].close;
    if (recentHigh && currentClose > recentHigh.price) result.bos = "bullish";
    else if (recentLow && currentClose < recentLow.price)
      result.bos = "bearish";
  }

  // ── Change of Character: after a downtrend (lower highs), break above last swing high
  if (swings.length >= 4) {
    const highs = swings.filter((s) => s.type === "high").slice(-3);
    if (highs.length === 3) {
      const lowerHighs =
        highs[1].price < highs[0].price && highs[2].price < highs[1].price;
      if (lowerHighs) {
        const currentClose = candles[n - 1].close;
        if (currentClose > highs[2].price) result.choch = "bullish";
      }
    }
    const lows = swings.filter((s) => s.type === "low").slice(-3);
    if (lows.length === 3) {
      const higherLows =
        lows[1].price > lows[0].price && lows[2].price > lows[1].price;
      if (higherLows) {
        const currentClose = candles[n - 1].close;
        if (currentClose < lows[2].price) result.choch = "bearish";
      }
    }
  }

  // Priority summary: CHoCH > BOS > OB > FVG
  if (result.choch) {
    result.summary = `CHoCH ${result.choch === "bullish" ? "Bullish" : "Bearish"} — Character shift`;
  } else if (result.bos) {
    result.summary = `BOS ${result.bos === "bullish" ? "Bullish" : "Bearish"} — Structure broken`;
  } else if (result.orderBlock) {
    result.summary = `Order Block ${result.orderBlock.direction === "bullish" ? "↑" : "↓"} @ ${result.orderBlock.price.toFixed(0)}`;
  } else if (result.fvg) {
    result.summary = `FVG ${result.fvg.direction === "bullish" ? "Bullish" : "Bearish"} ${result.fvg.bottom.toFixed(0)}–${result.fvg.top.toFixed(0)}`;
  } else {
    result.summary = "No SMC signal";
  }

  return result;
}

// ─── PCR Simulation ──────────────────────────────────────────────────────────

function simulatePCR(closes: number[]): number {
  const recent = closes.slice(-10);
  const returns = recent
    .map((v, i) => (i > 0 ? (v - recent[i - 1]) / recent[i - 1] : 0))
    .slice(1);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  return Math.max(0.5, Math.min(2.0, 1.0 - avgReturn * 50));
}

// ─── Main Signal Engine ───────────────────────────────────────────────────────

export function runSignalEngine(
  candles: OHLCV[],
  symbol: string,
  news: NewsItem[],
): { signals: GeneratedSignal[]; state: StrategyState } {
  if (candles.length < 30) return { signals: [], state: defaultState() };

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const currentPrice = closes[closes.length - 1];
  const currentVolume = volumes[volumes.length - 1];

  const rsiArr = calcRSI(closes);
  const rsi = rsiArr[rsiArr.length - 1];

  const macdResult = calcMACD(closes);
  const macdLine = macdResult.macd[macdResult.macd.length - 1];
  const signalLine = macdResult.signal[macdResult.signal.length - 1];
  const prevMacd = macdResult.macd[macdResult.macd.length - 2];
  const prevSignal = macdResult.signal[macdResult.signal.length - 2];
  const macdCrossUp = prevMacd < prevSignal && macdLine > signalLine;
  const macdCrossDown = prevMacd > prevSignal && macdLine < signalLine;

  const bb = calcBB(closes);
  const bbUpper = bb.upper[bb.upper.length - 1];
  const bbLower = bb.lower[bb.lower.length - 1];
  const bbMid = bb.mid[bb.mid.length - 1];
  const bbRange = bbUpper - bbLower;
  let bbPos: StrategyState["bbPosition"] = "middle";
  if (currentPrice > bbUpper) bbPos = "above_upper";
  else if (currentPrice > bbMid + bbRange * 0.3) bbPos = "near_upper";
  else if (currentPrice < bbLower) bbPos = "below_lower";
  else if (currentPrice < bbMid - bbRange * 0.3) bbPos = "near_lower";

  const avgVol = avgVolume(volumes);
  const volRatio = currentVolume / avgVol;

  const pcr = simulatePCR(closes);

  const priceUp = currentPrice > closes[closes.length - 5];
  const volUp = currentVolume > avgVol;
  const oiSignal: "bullish" | "bearish" | "neutral" =
    priceUp && volUp ? "bullish" : !priceUp && volUp ? "bearish" : "neutral";

  const bullCount = news.filter((n) => n.sentiment === "bullish").length;
  const bearCount = news.filter((n) => n.sentiment === "bearish").length;
  const newsSignal: "bullish" | "bearish" | "neutral" =
    bullCount > bearCount
      ? "bullish"
      : bearCount > bullCount
        ? "bearish"
        : "neutral";

  // Advanced: Harmonic & SMC
  const harmonic = detectHarmonicPatterns(candles);
  const smc = detectSMC(candles);

  const state: StrategyState = {
    rsi,
    rsiSignal: rsi < 35 ? "bullish" : rsi > 65 ? "bearish" : "neutral",
    macdValue: macdLine,
    macdSignal: macdCrossUp
      ? "bullish"
      : macdCrossDown
        ? "bearish"
        : macdLine > signalLine
          ? "bullish"
          : "bearish",
    bbPosition: bbPos,
    volumeRatio: volRatio,
    pcr,
    pcrSignal: pcr < 0.7 ? "bullish" : pcr > 1.3 ? "bearish" : "neutral",
    newsSignal,
    oiSignal,
    harmonicPattern: harmonic
      ? `${harmonic.direction === "bullish" ? "🟢" : "🔴"} ${harmonic.pattern} @ ${harmonic.dPoint.toFixed(0)}`
      : "Scanning...",
    smcSignal: smc.summary,
  };

  const signals: GeneratedSignal[] = [];
  const expiry = nearestThursday();
  const atmStrike = calcATMStrike(currentPrice);

  function makeSignal(
    optionType: OptionType,
    strategy: Strategy,
    confidence: number,
    reason: string,
    advancedStrategy?: string,
    otmOffset = 0,
  ): GeneratedSignal {
    const strike =
      optionType === OptionType.CE
        ? atmStrike + otmOffset
        : atmStrike - otmOffset;
    const entryPrice =
      Math.round(
        currentPrice * (optionType === OptionType.CE ? 0.025 : 0.024) * 100,
      ) / 100;
    return {
      symbol,
      optionType,
      strikePrice: strike,
      expiry,
      strategy,
      advancedStrategy,
      entryPrice,
      targetPrice: Math.round(entryPrice * 1.03 * 100) / 100,
      stopLoss: Math.round(entryPrice * 0.985 * 100) / 100,
      confidence,
      status: Status.Active,
      timestamp: Date.now(),
      reason,
    };
  }

  // RSI
  if (rsi < 35) {
    signals.push(
      makeSignal(
        OptionType.CE,
        Strategy.RSI,
        78,
        `RSI ${rsi.toFixed(1)} — oversold, bounce expected`,
      ),
    );
  } else if (rsi > 65) {
    signals.push(
      makeSignal(
        OptionType.PE,
        Strategy.RSI,
        74,
        `RSI ${rsi.toFixed(1)} — overbought, pullback likely`,
      ),
    );
  }

  // MACD
  if (macdCrossUp) {
    signals.push(
      makeSignal(
        OptionType.CE,
        Strategy.MACD,
        82,
        `MACD crossed above signal at ${macdLine.toFixed(2)}`,
      ),
    );
  } else if (macdCrossDown) {
    signals.push(
      makeSignal(
        OptionType.PE,
        Strategy.MACD,
        80,
        `MACD crossed below signal at ${macdLine.toFixed(2)}`,
      ),
    );
  }

  // Bollinger
  if (bbPos === "below_lower" || bbPos === "near_lower") {
    signals.push(
      makeSignal(
        OptionType.CE,
        Strategy.Bollinger,
        76,
        `Price near lower BB at ${bbLower.toFixed(0)} — mean reversion expected`,
      ),
    );
  } else if (bbPos === "above_upper" || bbPos === "near_upper") {
    signals.push(
      makeSignal(
        OptionType.PE,
        Strategy.Bollinger,
        72,
        `Price near upper BB at ${bbUpper.toFixed(0)} — overbought squeeze`,
      ),
    );
  }

  // Volume spike
  if (volRatio > 2) {
    const dir = priceUp ? OptionType.CE : OptionType.PE;
    signals.push(
      makeSignal(
        dir,
        Strategy.Volume,
        70,
        `Volume ${volRatio.toFixed(1)}x above average with price ${priceUp ? "up" : "down"}${priceUp ? " — bullish conviction" : " — distribution"}`,
      ),
    );
  }

  // OI
  if (oiSignal !== "neutral") {
    signals.push(
      makeSignal(
        oiSignal === "bullish" ? OptionType.CE : OptionType.PE,
        Strategy.OI,
        68,
        oiSignal === "bullish"
          ? "Long buildup — OI + Price rising simultaneously"
          : "Short buildup — OI rising with falling price",
      ),
    );
  }

  // PCR
  if (pcr < 0.7) {
    signals.push(
      makeSignal(
        OptionType.CE,
        Strategy.PCR,
        75,
        `PCR ${pcr.toFixed(2)} — excessive call selling, reversal likely`,
      ),
    );
  } else if (pcr > 1.3) {
    signals.push(
      makeSignal(
        OptionType.PE,
        Strategy.PCR,
        73,
        `PCR ${pcr.toFixed(2)} — put accumulation, bearish pressure`,
      ),
    );
  }

  // News
  if (newsSignal === "bullish") {
    signals.push(
      makeSignal(
        OptionType.CE,
        Strategy.News,
        65,
        `${bullCount}/${news.length} headlines bullish sentiment`,
      ),
    );
  } else if (newsSignal === "bearish") {
    signals.push(
      makeSignal(
        OptionType.PE,
        Strategy.News,
        63,
        `${bearCount}/${news.length} headlines bearish sentiment`,
      ),
    );
  }

  // Harmonic pattern
  if (harmonic) {
    const optType =
      harmonic.direction === "bullish" ? OptionType.CE : OptionType.PE;
    const fibLabel =
      harmonic.pattern === "Gartley"
        ? "XA=0.618"
        : harmonic.pattern === "Bat"
          ? "AB=0.382-0.50"
          : harmonic.pattern === "Butterfly"
            ? "AB=0.786"
            : "CD=2.618";
    signals.push(
      makeSignal(
        optType,
        Strategy.RSI,
        Math.floor(72 + Math.random() * 12),
        `${harmonic.direction === "bullish" ? "Bullish" : "Bearish"} ${harmonic.pattern} pattern — D point at ${harmonic.dPoint.toFixed(0)} (${fibLabel})`,
        `Harmonic:${harmonic.pattern}`,
      ),
    );
  }

  // SMC signals
  if (smc.choch) {
    const optType = smc.choch === "bullish" ? OptionType.CE : OptionType.PE;
    signals.push(
      makeSignal(
        optType,
        Strategy.OI,
        Math.floor(74 + Math.random() * 10),
        `CHoCH ${smc.choch} — market character shift, trend reversal confirmed`,
        "SMC:CHoCH",
      ),
    );
  } else if (smc.bos) {
    const optType = smc.bos === "bullish" ? OptionType.CE : OptionType.PE;
    signals.push(
      makeSignal(
        optType,
        Strategy.Volume,
        Math.floor(70 + Math.random() * 10),
        `Break of Structure ${smc.bos} — ${smc.bos === "bullish" ? "swing high cleared" : "swing low breached"}`,
        "SMC:BOS",
      ),
    );
  } else if (smc.orderBlock) {
    const optType =
      smc.orderBlock.direction === "bullish" ? OptionType.CE : OptionType.PE;
    signals.push(
      makeSignal(
        optType,
        Strategy.Volume,
        Math.floor(68 + Math.random() * 10),
        `${smc.orderBlock.direction === "bullish" ? "Bullish" : "Bearish"} Order Block at ${smc.orderBlock.price.toFixed(0)} — institutional demand zone`,
        "SMC:OrderBlock",
      ),
    );
  } else if (smc.fvg) {
    const optType =
      smc.fvg.direction === "bullish" ? OptionType.CE : OptionType.PE;
    signals.push(
      makeSignal(
        optType,
        Strategy.News,
        Math.floor(66 + Math.random() * 8),
        `Fair Value Gap ${smc.fvg.direction} ${smc.fvg.bottom.toFixed(0)}–${smc.fvg.top.toFixed(0)} — price likely to fill gap`,
        "SMC:FVG",
      ),
    );
  }

  return { signals, state };
}

function defaultState(): StrategyState {
  return {
    rsi: 50,
    rsiSignal: "neutral",
    macdValue: 0,
    macdSignal: "neutral",
    bbPosition: "middle",
    volumeRatio: 1,
    pcr: 1.0,
    pcrSignal: "neutral",
    newsSignal: "neutral",
    oiSignal: "neutral",
    harmonicPattern: "Scanning...",
    smcSignal: "Scanning...",
  };
}

export function backendToGenerated(s: Signal): GeneratedSignal {
  return {
    id: s.id,
    symbol: s.symbol,
    optionType: s.optionType,
    strikePrice: Number(s.strikePrice),
    expiry: s.expiry,
    strategy: s.strategy,
    entryPrice: Number(s.entryPrice) / 100,
    targetPrice: Number(s.targetPrice) / 100,
    stopLoss: Number(s.stopLoss) / 100,
    confidence: Number(s.confidence),
    status: s.status,
    timestamp: Number(s.timestamp),
    reason: "",
  };
}

export function generatedToBackend(g: GeneratedSignal): Signal {
  return {
    id: 0n,
    symbol: g.symbol,
    optionType: g.optionType,
    strikePrice: BigInt(Math.round(g.strikePrice)),
    expiry: g.expiry,
    strategy: g.strategy,
    entryPrice: BigInt(Math.round(g.entryPrice * 100)),
    targetPrice: BigInt(Math.round(g.targetPrice * 100)),
    stopLoss: BigInt(Math.round(g.stopLoss * 100)),
    confidence: BigInt(g.confidence),
    status: g.status,
    timestamp: BigInt(g.timestamp),
  };
}
