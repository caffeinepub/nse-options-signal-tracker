import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Newspaper } from "lucide-react";
import type { NewsItem } from "../utils/marketData";

interface NewsFeedProps {
  news: NewsItem[];
  isLoading: boolean;
}

export function NewsFeed({ news, isLoading }: NewsFeedProps) {
  return (
    <div
      className="rounded-lg border border-border"
      style={{ background: "oklch(0.16 0.02 240)" }}
      id="news"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Market News
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-sell/10 text-sell border border-sell/30 animate-pulse">
          LIVE
        </span>
      </div>
      <ScrollArea className="h-64">
        {isLoading ? (
          <div className="p-3 space-y-3" data-ocid="news.loading_state">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 rounded animate-pulse"
                style={{ background: "oklch(0.20 0.025 240)" }}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {news.map((item) => {
              const timeAgo = Math.floor(
                (Date.now() / 1000 - item.publishedAt) / 60,
              );
              const timeStr =
                timeAgo < 60
                  ? `${timeAgo}m ago`
                  : `${Math.floor(timeAgo / 60)}h ago`;
              const itemKey = `${item.publishedAt}-${item.title.slice(0, 20)}`;
              return (
                <div
                  key={itemKey}
                  className="px-4 py-2.5 hover:bg-accent/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Newspaper className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {item.publisher}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          · {timeStr}
                        </span>
                        {item.sentiment !== "neutral" && (
                          <span
                            className={`text-xs px-1 rounded ${item.sentiment === "bullish" ? "bg-buy/15 text-buy" : "bg-sell/15 text-sell"}`}
                          >
                            {item.sentiment === "bullish" ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs leading-relaxed ${
                          item.sentiment === "bullish"
                            ? "text-foreground"
                            : item.sentiment === "bearish"
                              ? "text-foreground"
                              : "text-foreground"
                        }`}
                      >
                        {item.title}
                      </p>
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
