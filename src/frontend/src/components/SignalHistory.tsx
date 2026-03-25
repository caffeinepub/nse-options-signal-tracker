import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { OptionType, Status } from "../backend.d";
import type { GeneratedSignal } from "../utils/signalEngine";

interface SignalHistoryProps {
  signals: GeneratedSignal[];
  isLoading: boolean;
}

const STRATEGY_SHORT: Record<string, string> = {
  RSI: "RSI",
  MACD: "MACD X",
  Bollinger: "BB",
  Volume: "VOL",
  OI: "OI",
  PCR: "PCR",
  News: "NEWS",
};

export function SignalHistory({ signals, isLoading }: SignalHistoryProps) {
  return (
    <div
      className="rounded-lg border border-border"
      style={{ background: "oklch(0.16 0.02 240)" }}
      id="history"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Signal History
        </span>
        <span className="text-xs text-muted-foreground">
          {signals.length} total
        </span>
      </div>
      <ScrollArea className="h-56">
        {isLoading ? (
          <div className="p-4 space-y-2" data-ocid="history.loading_state">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 rounded animate-pulse"
                style={{ background: "oklch(0.20 0.025 240)" }}
              />
            ))}
          </div>
        ) : signals.length === 0 ? (
          <div
            className="p-8 text-center text-sm text-muted-foreground"
            data-ocid="history.empty_state"
          >
            No signal history yet. Signals will appear here.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Time",
                  "Symbol",
                  "Strike",
                  "Type",
                  "Strategy",
                  "Entry",
                  "Target",
                  "SL",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-muted-foreground font-medium uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map((sig, idx) => {
                const isCE = sig.optionType === OptionType.CE;
                const t = new Date(sig.timestamp);
                const timeStr = t.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });
                const rowKey = `${sig.timestamp}-${sig.strategy}-${sig.strikePrice}`;
                return (
                  <tr
                    key={rowKey}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                    data-ocid={`history.item.${idx + 1}`}
                  >
                    <td className="px-3 py-1.5 mono text-muted-foreground">
                      {timeStr}
                    </td>
                    <td className="px-3 py-1.5 font-medium">
                      {sig.symbol.replace("^", "").replace(".NS", "")}
                    </td>
                    <td className="px-3 py-1.5 mono">{sig.strikePrice}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`font-bold ${isCE ? "text-buy" : "text-sell"}`}
                      >
                        {sig.optionType}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {STRATEGY_SHORT[sig.strategy] ?? sig.strategy}
                    </td>
                    <td className="px-3 py-1.5 mono">
                      ₹{sig.entryPrice.toFixed(0)}
                    </td>
                    <td className="px-3 py-1.5 mono text-buy">
                      ₹{sig.targetPrice.toFixed(0)}
                    </td>
                    <td className="px-3 py-1.5 mono text-sell">
                      ₹{sig.stopLoss.toFixed(0)}
                    </td>
                    <td className="px-3 py-1.5">
                      <StatusBadge status={sig.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </ScrollArea>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === Status.Active) {
    return (
      <Badge
        className="text-xs h-4 px-1.5 bg-buy/10 text-buy border-buy/30 flex items-center gap-1 w-fit"
        variant="outline"
      >
        <Clock className="w-2.5 h-2.5" /> Active
      </Badge>
    );
  }
  if (status === Status.ProfitBooked) {
    return (
      <Badge
        className="text-xs h-4 px-1.5 bg-blue-500/10 text-blue-400 border-blue-500/30 flex items-center gap-1 w-fit"
        variant="outline"
      >
        <CheckCircle2 className="w-2.5 h-2.5" /> Profit
      </Badge>
    );
  }
  return (
    <Badge
      className="text-xs h-4 px-1.5 bg-muted/30 text-muted-foreground border-border flex items-center gap-1 w-fit"
      variant="outline"
    >
      <XCircle className="w-2.5 h-2.5" /> Expired
    </Badge>
  );
}
