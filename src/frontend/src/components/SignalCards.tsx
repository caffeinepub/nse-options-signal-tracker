import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Info, ShieldAlert, Target, TrendingUp } from "lucide-react";
import { useState } from "react";
import { OptionType } from "../backend.d";
import type { GeneratedSignal } from "../utils/signalEngine";
import { PatternExplainerModal } from "./PatternExplainerModal";

interface SignalCardsProps {
  signals: GeneratedSignal[];
}

const STRATEGY_LABELS: Record<string, string> = {
  RSI: "RSI Oversold",
  MACD: "MACD Crossover",
  Bollinger: "BB Bounce",
  Volume: "Volume Spike",
  OI: "OI Buildup",
  PCR: "PCR Signal",
  News: "News Sentiment",
};

function getStrategyLabel(sig: GeneratedSignal): string {
  if (sig.advancedStrategy) {
    const [type, name] = sig.advancedStrategy.split(":");
    if (type === "Harmonic") return `Harmonic: ${name}`;
    if (type === "SMC") {
      const smc: Record<string, string> = {
        CHoCH: "SMC: CHoCH",
        BOS: "SMC: BOS",
        OrderBlock: "SMC: Order Block",
        FVG: "SMC: Fair Value Gap",
      };
      return smc[name] ?? `SMC: ${name}`;
    }
  }
  return STRATEGY_LABELS[sig.strategy] ?? sig.strategy;
}

export function SignalCards({ signals }: SignalCardsProps) {
  const [explainerPattern, setExplainerPattern] = useState<string | null>(null);
  const top3 = signals.slice(0, 3);

  if (top3.length === 0) {
    return (
      <>
        <div
          className="rounded-lg border border-border p-6 text-center"
          style={{ background: "oklch(0.16 0.02 240)" }}
          data-ocid="signals.empty_state"
        >
          <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No active signals. Market scanning...
          </p>
        </div>
        <PatternExplainerModal
          pattern={explainerPattern}
          onClose={() => setExplainerPattern(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {top3.map((sig, idx) => {
          const isCE = sig.optionType === OptionType.CE;
          const cardKey = `${sig.symbol}-${sig.strategy}-${sig.optionType}-${sig.strikePrice}`;
          const isHarmonic =
            sig.advancedStrategy?.startsWith("Harmonic:") ?? false;
          const harmonicName = isHarmonic
            ? sig.advancedStrategy!.split(":")[1]
            : null;

          return (
            <div
              key={cardKey}
              className={`signal-enter rounded-lg border p-3 flex flex-col gap-2 ${
                isCE ? "border-buy/40 bg-buy/5" : "border-sell/40 bg-sell/5"
              }`}
              data-ocid={`signals.item.${idx + 1}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        isCE ? "bg-buy/20 text-buy" : "bg-sell/20 text-sell"
                      }`}
                    >
                      BUY {sig.optionType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getStrategyLabel(sig)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="font-bold text-sm text-foreground">
                      {sig.symbol.replace("^", "").replace(".NS", "")}{" "}
                      {sig.strikePrice} {sig.optionType}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {sig.expiry}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-xs text-muted-foreground">
                    Confidence
                  </div>
                  <div
                    className={`mono font-bold text-sm ${
                      isCE ? "text-buy" : "text-sell"
                    }`}
                  >
                    {sig.confidence}%
                  </div>
                </div>
              </div>

              {sig.reason ? (
                <div className="flex items-start gap-1 rounded px-2 py-1.5 bg-muted/20 border border-border/40">
                  <Info className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground italic leading-snug">
                    {sig.reason}
                  </span>
                </div>
              ) : null}

              {isHarmonic && harmonicName ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2 w-fit self-start border border-border/40 hover:bg-muted/20"
                  style={{ color: "oklch(0.72 0.15 280)" }}
                  onClick={() => setExplainerPattern(harmonicName)}
                  data-ocid={`signals.pattern_explainer.${idx + 1}.button`}
                >
                  📐 Explain Pattern
                </Button>
              ) : null}

              <Progress value={sig.confidence} className="h-1" />

              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Entry</div>
                  <div className="mono text-xs font-bold text-foreground">
                    ₹{sig.entryPrice.toFixed(0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs flex items-center justify-center gap-0.5">
                    <Target className="w-2.5 h-2.5 text-buy" /> Target
                  </div>
                  <div className="mono text-xs font-bold text-buy">
                    ₹{sig.targetPrice.toFixed(0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs flex items-center justify-center gap-0.5">
                    <ShieldAlert className="w-2.5 h-2.5 text-sell" /> SL
                  </div>
                  <div className="mono text-xs font-bold text-sell">
                    ₹{sig.stopLoss.toFixed(0)}
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                className={`h-7 text-xs w-full mt-1 ${
                  isCE
                    ? "bg-buy hover:bg-buy/80 text-background"
                    : "bg-sell hover:bg-sell/80 text-foreground"
                }`}
                data-ocid={`signals.execute.${idx + 1}.button`}
              >
                EXECUTE TRADE
              </Button>
            </div>
          );
        })}
      </div>
      <PatternExplainerModal
        pattern={explainerPattern}
        onClose={() => setExplainerPattern(null)}
      />
    </>
  );
}
