import { BarChart3 } from "lucide-react";

interface PCRWidgetProps {
  pcr: number;
  oiSignal: "bullish" | "bearish" | "neutral";
  volumeRatio: number;
}

export function PCRWidget({ pcr, oiSignal, volumeRatio }: PCRWidgetProps) {
  const pcrSentiment =
    pcr < 0.7
      ? "Extreme Bullish"
      : pcr < 1.0
        ? "Bullish"
        : pcr < 1.3
          ? "Neutral"
          : pcr < 1.6
            ? "Bearish"
            : "Extreme Bearish";
  const pcrColor =
    pcr < 0.85 ? "text-buy" : pcr > 1.2 ? "text-sell" : "text-muted-foreground";

  const pcrPct = Math.min(100, Math.max(0, (pcr / 2.0) * 100));

  return (
    <div
      className="rounded-lg border border-border p-4"
      style={{ background: "oklch(0.16 0.02 240)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          PCR / OI Analysis
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground">
              Put-Call Ratio
            </span>
            <span className={`mono font-bold text-sm ${pcrColor}`}>
              {pcr.toFixed(2)}
            </span>
          </div>
          <div
            className="h-1.5 rounded-full"
            style={{ background: "oklch(0.20 0.025 240)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pcrPct}%`,
                background:
                  pcr < 0.85
                    ? "oklch(0.77 0.17 162)"
                    : pcr > 1.2
                      ? "oklch(0.63 0.19 25)"
                      : "oklch(0.67 0.04 230)",
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>0 (Bullish)</span>
            <span className={pcrColor}>{pcrSentiment}</span>
            <span>2+ (Bearish)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded p-2"
            style={{ background: "oklch(0.20 0.025 240)" }}
          >
            <div className="text-xs text-muted-foreground mb-1">OI Signal</div>
            <div
              className={`text-xs font-bold ${
                oiSignal === "bullish"
                  ? "text-buy"
                  : oiSignal === "bearish"
                    ? "text-sell"
                    : "text-muted-foreground"
              }`}
            >
              {oiSignal === "bullish"
                ? "▲ Long Buildup"
                : oiSignal === "bearish"
                  ? "▼ Short Buildup"
                  : "— Sideways"}
            </div>
          </div>
          <div
            className="rounded p-2"
            style={{ background: "oklch(0.20 0.025 240)" }}
          >
            <div className="text-xs text-muted-foreground mb-1">Vol Ratio</div>
            <div
              className={`mono text-xs font-bold ${
                volumeRatio > 2
                  ? "text-buy"
                  : volumeRatio > 1.5
                    ? "text-amber-400"
                    : "text-muted-foreground"
              }`}
            >
              {volumeRatio.toFixed(2)}x
              {volumeRatio > 2 && <span className="ml-1 text-buy">SPIKE!</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
