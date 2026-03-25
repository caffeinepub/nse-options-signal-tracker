import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type OHLCV, calcEMA, calcMACD, calcRSI } from "../utils/indicators";
import { fetchOHLCV } from "../utils/marketData";
import { detectSMC } from "../utils/signalEngine";

interface CandlestickChartProps {
  symbol: string;
  onSymbolChange: (s: string) => void;
}

const SYMBOLS = [
  { value: "^NSEI", label: "NIFTY 50" },
  { value: "^NSEBANK", label: "BANK NIFTY" },
  { value: "NIFTY_IT.NS", label: "NIFTY IT" },
];

const TIMEFRAMES = [
  { label: "5M", interval: "5m", range: "1d" },
  { label: "15M", interval: "15m", range: "5d" },
  { label: "1H", interval: "1h", range: "1mo" },
  { label: "1D", interval: "1d", range: "6mo" },
];

// ─── Canvas-based Candlestick Renderer ─────────────────────────────────────

const BG = "#0d1520";
const GRID = "#1a2535";
const UP_COLOR = "#22C07A";
const DN_COLOR = "#E05252";
const EMA20_CLR = "#19D18A";
const EMA50_CLR = "#F6A623";
const RSI_CLR = "#8B5CF6";
const MACD_CLR = "#3B82F6";
const SIG_CLR = "#F59E0B";
const OB_BULL = "#22C07A";
const OB_BEAR = "#E05252";
const FVG_CLR = "#F59E0B";
const TEXT_CLR = "#8FA1B5";

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rows = 5,
  cols = 8,
) {
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 0.5;
  for (let r = 1; r < rows; r++) {
    const y = (h / rows) * r;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let c = 1; c < cols; c++) {
    const x = (w / cols) * c;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
}

function mapY(
  val: number,
  min: number,
  max: number,
  h: number,
  pad = 8,
): number {
  if (max === min) return h / 2;
  return pad + ((max - val) / (max - min)) * (h - pad * 2);
}

function drawLineSeries(
  ctx: CanvasRenderingContext2D,
  values: number[],
  min: number,
  max: number,
  w: number,
  h: number,
  color: string,
  lineWidth = 1.5,
) {
  if (values.length < 2) return;
  const step = w / (values.length - 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = i * step;
    const y = mapY(v, min, max, h);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawHLine(
  ctx: CanvasRenderingContext2D,
  price: number,
  min: number,
  max: number,
  w: number,
  h: number,
  color: string,
  label: string,
  dashed = true,
) {
  const y = mapY(price, min, max, h);
  if (y < 0 || y > h) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  if (dashed) ctx.setLineDash([5, 4]);
  else ctx.setLineDash([]);
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.font = "10px monospace";
  ctx.fillText(label, 4, y - 2);
}

function drawFVGBand(
  ctx: CanvasRenderingContext2D,
  top: number,
  bottom: number,
  min: number,
  max: number,
  w: number,
  h: number,
) {
  const y1 = mapY(top, min, max, h);
  const y2 = mapY(bottom, min, max, h);
  if (y1 > h && y2 > h) return;
  if (y1 < 0 && y2 < 0) return;
  ctx.fillStyle = FVG_CLR;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(0, Math.min(y1, y2), w, Math.abs(y2 - y1));
  ctx.globalAlpha = 1;
}

function renderCandleChart(
  canvas: HTMLCanvasElement,
  data: OHLCV[],
  ema20: number[],
  ema50: number[],
  obPrice: number | null,
  obDir: "bullish" | "bearish" | null,
  fvg: { top: number; bottom: number } | null,
  bosPrice: number | null,
  bosDir: "bullish" | "bearish" | null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || data.length === 0) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h);

  const lows = data.map((d) => d.low);
  const highs = data.map((d) => d.high);
  const minP = Math.min(...lows);
  const maxP = Math.max(...highs);

  // FVG band
  if (fvg) drawFVGBand(ctx, fvg.top, fvg.bottom, minP, maxP, w, h);

  // OB line
  if (obPrice !== null && obDir) {
    drawHLine(
      ctx,
      obPrice,
      minP,
      maxP,
      w,
      h,
      obDir === "bullish" ? OB_BULL : OB_BEAR,
      obDir === "bullish" ? "OB ↑" : "OB ↓",
    );
  }

  // BOS line
  if (bosPrice !== null && bosDir) {
    drawHLine(
      ctx,
      bosPrice,
      minP,
      maxP,
      w,
      h,
      bosDir === "bullish" ? OB_BULL : OB_BEAR,
      bosDir === "bullish" ? "BOS ↑" : "BOS ↓",
      false,
    );
  }

  // Candles
  const n = data.length;
  const cw = Math.max(1, (w / n) * 0.7);
  const step = w / n;
  data.forEach((d, i) => {
    const x = i * step + step / 2;
    const isBull = d.close >= d.open;
    const clr = isBull ? UP_COLOR : DN_COLOR;
    ctx.strokeStyle = clr;
    ctx.fillStyle = clr;
    ctx.lineWidth = 1;

    const yHigh = mapY(d.high, minP, maxP, h);
    const yLow = mapY(d.low, minP, maxP, h);
    const yOpen = mapY(d.open, minP, maxP, h);
    const yClose = mapY(d.close, minP, maxP, h);

    // Wick
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    // Body
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
    if (isBull) ctx.fillRect(x - cw / 2, bodyTop, cw, bodyHeight);
    else ctx.strokeRect(x - cw / 2, bodyTop, cw, bodyHeight);
  });

  // EMA lines
  drawLineSeries(ctx, ema20, minP, maxP, w, h, EMA20_CLR);
  drawLineSeries(ctx, ema50, minP, maxP, w, h, EMA50_CLR);

  // Y-axis labels
  ctx.fillStyle = TEXT_CLR;
  ctx.font = "9px monospace";
  ctx.fillText(maxP.toFixed(0), w - 42, 12);
  ctx.fillText(minP.toFixed(0), w - 42, h - 4);
  const mid = (maxP + minP) / 2;
  ctx.fillText(mid.toFixed(0), w - 42, h / 2);
}

function renderRSI(canvas: HTMLCanvasElement, rsi: number[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx || rsi.length < 2) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h, 3);

  // Overbought/oversold bands
  const y70 = mapY(70, 0, 100, h);
  const y30 = mapY(30, 0, 100, h);
  ctx.fillStyle = DN_COLOR;
  ctx.globalAlpha = 0.08;
  ctx.fillRect(0, 0, w, y70);
  ctx.fillStyle = UP_COLOR;
  ctx.fillRect(0, y30, w, h - y30);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = GRID;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(0, y70);
  ctx.lineTo(w, y70);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, y30);
  ctx.lineTo(w, y30);
  ctx.stroke();
  ctx.setLineDash([]);

  drawLineSeries(ctx, rsi, 0, 100, w, h, RSI_CLR);

  // Labels
  ctx.fillStyle = TEXT_CLR;
  ctx.font = "9px monospace";
  ctx.fillText("70", w - 22, y70 - 2);
  ctx.fillText("30", w - 22, y30 - 2);
  const last = rsi[rsi.length - 1];
  ctx.fillStyle = last > 70 ? DN_COLOR : last < 30 ? UP_COLOR : RSI_CLR;
  ctx.fillText(last.toFixed(1), 4, 12);
}

function renderMACD(
  canvas: HTMLCanvasElement,
  macdLine: number[],
  signalLine: number[],
  hist: number[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || macdLine.length < 2) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h, 3);

  const allVals = [...macdLine, ...signalLine, ...hist].filter(Number.isFinite);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);

  // Histogram bars
  const n = hist.length;
  const step = w / n;
  hist.forEach((v, i) => {
    const x = i * step;
    const y0 = mapY(0, minV, maxV, h);
    const yV = mapY(v, minV, maxV, h);
    ctx.fillStyle = v >= 0 ? `${UP_COLOR}88` : `${DN_COLOR}88`;
    ctx.fillRect(
      x,
      Math.min(y0, yV),
      step * 0.8,
      Math.max(1, Math.abs(y0 - yV)),
    );
  });

  drawLineSeries(ctx, macdLine, minV, maxV, w, h, MACD_CLR);
  drawLineSeries(ctx, signalLine, minV, maxV, w, h, SIG_CLR);

  ctx.fillStyle = TEXT_CLR;
  ctx.font = "9px monospace";
  const lastMacd = macdLine[macdLine.length - 1];
  ctx.fillText(lastMacd.toFixed(2), 4, 12);
}

// ─── Component ─────────────────────────────────────────────────────────────

export function CandlestickChart({
  symbol,
  onSymbolChange,
}: CandlestickChartProps) {
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [candles, setCandles] = useState<OHLCV[]>([]);
  const [smcInfo, setSmcInfo] = useState("");

  const candleRef = useRef<HTMLCanvasElement>(null);
  const rsiRef = useRef<HTMLCanvasElement>(null);
  const macdRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await fetchOHLCV(
        symbol,
        timeframe.interval,
        timeframe.range,
      );
      setCandles(data);

      const smc = detectSMC(data);
      const parts: string[] = [];
      if (smc.choch) parts.push(`CHoCH ${smc.choch === "bullish" ? "↑" : "↓"}`);
      if (smc.bos) parts.push(`BOS ${smc.bos === "bullish" ? "↑" : "↓"}`);
      if (smc.orderBlock)
        parts.push(
          `OB ${smc.orderBlock.direction === "bullish" ? "↑" : "↓"} ${smc.orderBlock.price.toFixed(0)}`,
        );
      if (smc.fvg)
        parts.push(`FVG ${smc.fvg.direction === "bullish" ? "↑" : "↓"}`);
      setSmcInfo(parts.join(" · ") || "No SMC signals");
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const derived = useMemo(() => {
    if (candles.length < 2) return null;
    const closes = candles.map((d) => d.close);
    const ema20 = calcEMA(closes, 20);
    const ema50 = calcEMA(closes, 50);
    const rsi = calcRSI(closes);
    const macd = calcMACD(closes);
    const smc = detectSMC(candles);
    return { ema20, ema50, rsi, macd, smc };
  }, [candles]);

  const draw = useCallback(() => {
    if (!derived || candles.length === 0) return;
    const { ema20, ema50, rsi, macd, smc } = derived;
    const w = containerRef.current?.clientWidth ?? 600;

    if (candleRef.current) {
      candleRef.current.width = w;
      candleRef.current.height = 240;
      renderCandleChart(
        candleRef.current,
        candles,
        ema20,
        ema50,
        smc.orderBlock?.price ?? null,
        smc.orderBlock?.direction ?? null,
        smc.fvg ? { top: smc.fvg.top, bottom: smc.fvg.bottom } : null,
        smc.bos ? candles[candles.length - 1].close : null,
        smc.bos,
      );
    }
    if (rsiRef.current) {
      rsiRef.current.width = w;
      rsiRef.current.height = 80;
      renderRSI(rsiRef.current, rsi);
    }
    if (macdRef.current) {
      macdRef.current.width = w;
      macdRef.current.height = 80;
      renderMACD(macdRef.current, macd.macd, macd.signal, macd.hist);
    }
  }, [candles, derived]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      draw();
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  return (
    <div
      className="rounded-lg border border-border overflow-hidden"
      style={{ background: "oklch(0.16 0.02 240)" }}
      id="signals"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Candlestick Chart
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            DEMO
          </span>
          {isLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Loading...
            </span>
          )}
          {smcInfo && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              SMC: {smcInfo}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {SYMBOLS.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  symbol === s.value
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onSymbolChange(s.value)}
                data-ocid={`chart.symbol.${s.label.toLowerCase().replace(" ", "_")}.button`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.label}
                type="button"
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  timeframe.label === tf.label
                    ? "bg-buy text-background font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTimeframe(tf)}
                data-ocid={`chart.timeframe.${tf.label.toLowerCase()}.button`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-2 pt-1" ref={containerRef}>
        {/* Legend */}
        <div className="flex items-center gap-3 px-1 py-1 flex-wrap">
          <span className="text-xs flex items-center gap-1">
            <span
              className="w-3 h-0.5 inline-block"
              style={{ background: EMA20_CLR }}
            />{" "}
            EMA20
          </span>
          <span className="text-xs flex items-center gap-1">
            <span
              className="w-3 h-0.5 inline-block"
              style={{ background: EMA50_CLR }}
            />{" "}
            EMA50
          </span>
          <span className="text-xs flex items-center gap-1">
            <span
              className="w-3 h-0.5 inline-block border-t-2 border-dashed"
              style={{ borderColor: OB_BULL }}
            />{" "}
            OB ↑
          </span>
          <span className="text-xs flex items-center gap-1">
            <span
              className="w-3 h-0.5 inline-block border-t-2 border-dashed"
              style={{ borderColor: OB_BEAR }}
            />{" "}
            OB ↓
          </span>
          <span className="text-xs flex items-center gap-1">
            <span
              className="w-3 h-0.5 inline-block"
              style={{ background: FVG_CLR, opacity: 0.5 }}
            />{" "}
            FVG
          </span>
        </div>

        {/* Candle canvas */}
        <canvas ref={candleRef} className="w-full block" height={240} />

        {/* RSI */}
        <div className="mt-1 px-1">
          <span className="text-xs text-muted-foreground">RSI (14)</span>
        </div>
        <canvas ref={rsiRef} className="w-full block" height={80} />

        {/* MACD */}
        <div className="mt-1 px-1 flex items-center gap-3">
          <span className="text-xs text-muted-foreground">MACD (12,26,9)</span>
          <span className="text-xs flex items-center gap-1">
            <span
              className="w-3 h-0.5 inline-block"
              style={{ background: MACD_CLR }}
            />{" "}
            MACD
          </span>
          <span className="text-xs flex items-center gap-1">
            <span
              className="w-3 h-0.5 inline-block"
              style={{ background: SIG_CLR }}
            />{" "}
            Signal
          </span>
        </div>
        <canvas ref={macdRef} className="w-full block" height={80} />
      </div>
    </div>
  );
}
