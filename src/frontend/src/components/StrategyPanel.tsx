import type { StrategyState } from "../utils/signalEngine";

interface StrategyPanelProps {
  state: StrategyState;
}

type SentimentValue = "bullish" | "bearish" | "neutral" | string;

function SBadge({ s }: { s: SentimentValue }) {
  const norm = s.toLowerCase();
  if (norm === "bullish")
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-buy/20 text-buy font-semibold">
        BULL
      </span>
    );
  if (norm === "bearish")
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-sell/20 text-sell font-semibold">
        BEAR
      </span>
    );
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-semibold">
      NEUT
    </span>
  );
}

const BB_LABELS: Record<string, string> = {
  above_upper: "Above Upper",
  near_upper: "Near Upper",
  middle: "Middle",
  near_lower: "Near Lower",
  below_lower: "Below Lower",
};

function smcSignalSentiment(summary: string): SentimentValue {
  const lower = summary.toLowerCase();
  if (
    lower.includes("bullish") ||
    lower.includes("↑") ||
    lower.includes("long")
  )
    return "bullish";
  if (
    lower.includes("bearish") ||
    lower.includes("↓") ||
    lower.includes("short")
  )
    return "bearish";
  return "neutral";
}

function harmonicSentiment(pattern: string): SentimentValue {
  if (pattern.startsWith("🟢")) return "bullish";
  if (pattern.startsWith("🔴")) return "bearish";
  return "neutral";
}

export function StrategyPanel({ state }: StrategyPanelProps) {
  const rows = [
    { label: "RSI (14)", value: state.rsi.toFixed(1), signal: state.rsiSignal },
    {
      label: "MACD",
      value: state.macdValue.toFixed(2),
      signal: state.macdSignal,
    },
    {
      label: "Bollinger",
      value: BB_LABELS[state.bbPosition] ?? state.bbPosition,
      signal: (state.bbPosition === "near_lower" ||
      state.bbPosition === "below_lower"
        ? "bullish"
        : state.bbPosition === "near_upper" ||
            state.bbPosition === "above_upper"
          ? "bearish"
          : "neutral") as SentimentValue,
    },
    {
      label: "Volume Ratio",
      value: `${state.volumeRatio.toFixed(2)}x`,
      signal: (state.volumeRatio > 2 ? "bullish" : "neutral") as SentimentValue,
    },
    { label: "PCR", value: state.pcr.toFixed(2), signal: state.pcrSignal },
    {
      label: "News Sentiment",
      value: state.newsSignal.toUpperCase(),
      signal: state.newsSignal,
    },
    {
      label: "OI Buildup",
      value: state.oiSignal.toUpperCase(),
      signal: state.oiSignal,
    },
  ];

  return (
    <div
      className="rounded-lg border border-border"
      style={{ background: "oklch(0.16 0.02 240)" }}
    >
      <div className="px-4 py-2.5 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Strategy Indicators
        </span>
      </div>
      <div className="divide-y divide-border/50">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <div className="flex items-center gap-2">
              <span className="mono text-xs font-medium text-foreground">
                {row.value}
              </span>
              <SBadge s={row.signal} />
            </div>
          </div>
        ))}

        {/* SMC Row */}
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">SMC Pattern</span>
            <SBadge s={smcSignalSentiment(state.smcSignal)} />
          </div>
          <p className="text-xs font-medium text-foreground mt-0.5 leading-snug">
            {state.smcSignal}
          </p>
        </div>

        {/* Harmonic Row */}
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Harmonic</span>
            <SBadge s={harmonicSentiment(state.harmonicPattern)} />
          </div>
          <p className="text-xs font-medium text-foreground mt-0.5 leading-snug">
            {state.harmonicPattern}
          </p>
        </div>
      </div>
    </div>
  );
}
