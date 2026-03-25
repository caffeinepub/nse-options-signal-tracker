import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw } from "lucide-react";

interface TopBarProps {
  isLive: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function TopBar({
  isLive,
  lastUpdated,
  onRefresh,
  isRefreshing,
}: TopBarProps) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4 border-b border-border"
      style={{ background: "oklch(0.14 0.018 240)" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-buy flex items-center justify-center">
            <Activity
              className="w-3.5 h-3.5"
              style={{ color: "oklch(0.12 0.015 240)" }}
            />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">
            NSE OPTIONS PRO
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1 ml-4">
          {["Market", "Signals", "History", "News"].map((nav) => (
            <a
              key={nav}
              href={`#${nav.toLowerCase()}`}
              className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent"
              data-ocid={`nav.${nav.toLowerCase()}.link`}
            >
              {nav}
            </a>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="mono text-xs text-muted-foreground hidden sm:block">
          {timeStr} IST
        </span>
        <Badge
          className={`text-xs px-2 py-0.5 flex items-center gap-1 ${isLive ? "bg-buy/10 text-buy border-buy/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}
          variant="outline"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-buy pulse-dot" : "bg-amber-400"}`}
          />
          {isLive ? "LIVE" : "DEMO"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onRefresh}
          data-ocid="app.refresh.button"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
        {lastUpdated && (
          <span className="text-xs text-muted-foreground hidden lg:block">
            Updated{" "}
            {lastUpdated.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </span>
        )}
      </div>
    </header>
  );
}
