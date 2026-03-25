import { TrendingDown, TrendingUp } from "lucide-react";
import type { QuoteData } from "../utils/marketData";

interface IndicesBarProps {
  indices: QuoteData[];
  isLoading: boolean;
}

export function IndicesBar({ indices, isLoading }: IndicesBarProps) {
  return (
    <div
      className="flex flex-wrap gap-2 p-3 rounded-lg border border-border"
      style={{ background: "oklch(0.16 0.02 240)" }}
      id="market"
    >
      {isLoading
        ? [1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 min-w-36 h-14 rounded animate-pulse"
              style={{ background: "oklch(0.20 0.025 240)" }}
            />
          ))
        : indices.map((idx) => {
            const isPos = idx.change >= 0;
            return (
              <div
                key={idx.symbol}
                className="flex-1 min-w-36 px-4 py-2 rounded border flex flex-col justify-between"
                style={{
                  borderColor: isPos
                    ? "oklch(0.77 0.17 162 / 0.3)"
                    : "oklch(0.63 0.19 25 / 0.3)",
                  background: isPos
                    ? "oklch(0.77 0.17 162 / 0.05)"
                    : "oklch(0.63 0.19 25 / 0.05)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {idx.name}
                  </span>
                  {isPos ? (
                    <TrendingUp className="w-3 h-3 text-buy" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-sell" />
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="mono font-bold text-base text-foreground">
                    {idx.price.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span
                    className={`mono text-xs font-medium ${isPos ? "text-buy" : "text-sell"}`}
                  >
                    {isPos ? "+" : ""}
                    {idx.change.toFixed(2)} ({isPos ? "+" : ""}
                    {idx.changePct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            );
          })}
    </div>
  );
}
