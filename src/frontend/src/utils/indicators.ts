export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = data[0];
  result.push(ema);
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

export function calcRSI(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return closes.map(() => 50);
  const result: number[] = Array(period).fill(50);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  hist: number[];
}

export function calcMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  sig = 9,
): MACDResult {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const macd = emaFast.map((v, i) => v - emaSlow[i]);
  const signal = calcEMA(macd.slice(slow - 1), sig);
  const paddedSignal = Array(slow - 1)
    .fill(0)
    .concat(signal);
  const paddedMacd = Array(slow - 1)
    .fill(0)
    .concat(macd.slice(slow - 1));
  const hist = paddedMacd.map((v, i) => v - paddedSignal[i]);
  return { macd: paddedMacd, signal: paddedSignal, hist };
}

export interface BBResult {
  upper: number[];
  mid: number[];
  lower: number[];
}

export function calcBB(closes: number[], period = 20, stdDev = 2): BBResult {
  const upper: number[] = [];
  const mid: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(closes[i]);
      mid.push(closes[i]);
      lower.push(closes[i]);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b) / period;
      const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
      const std = Math.sqrt(variance);
      mid.push(mean);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  return { upper, mid, lower };
}

export function avgVolume(volumes: number[], period = 20): number {
  const slice = volumes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function nearestThursday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 4=Thu
  const daysUntilThursday = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilThursday);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function calcATMStrike(price: number, step = 50): number {
  return Math.round(price / step) * step;
}
