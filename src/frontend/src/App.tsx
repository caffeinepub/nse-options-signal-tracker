import { Toaster } from "@/components/ui/sonner";
import {
  BarChart2,
  Bell,
  History,
  LayoutDashboard,
  Newspaper,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Status } from "./backend.d";
import { CandlestickChart } from "./components/CandlestickChart";
import { IndicesBar } from "./components/IndicesBar";
import { NewsFeed } from "./components/NewsFeed";
import { PCRWidget } from "./components/PCRWidget";
import { SignalCards } from "./components/SignalCards";
import { SignalHistory } from "./components/SignalHistory";
import { StrategyPanel } from "./components/StrategyPanel";
import { TopBar } from "./components/TopBar";
import { useActor } from "./hooks/useActor";
import {
  useAddSignal,
  useGetAllSignals,
  useUpdateSignalStatus,
} from "./hooks/useQueries";
import {
  type NewsItem,
  type QuoteData,
  fetchIndices,
  fetchNews,
  fetchOHLCV,
} from "./utils/marketData";
import {
  type GeneratedSignal,
  type StrategyState,
  backendToGenerated,
  generatedToBackend,
  runSignalEngine,
} from "./utils/signalEngine";

const defaultState: StrategyState = {
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

export default function App() {
  const { actor } = useActor();
  const [symbol, setSymbol] = useState("^NSEI");
  const [indices, setIndices] = useState<QuoteData[]>([]);
  const [indicesLoading, setIndicesLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [signals, setSignals] = useState<GeneratedSignal[]>([]);
  const [stratState, setStratState] = useState<StrategyState>(defaultState);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const addedIdsRef = useRef<Set<string>>(new Set());

  const { data: backendSignals, isLoading: backendLoading } =
    useGetAllSignals();
  const addSignal = useAddSignal();
  const updateStatus = useUpdateSignalStatus();

  const addSignalMutateRef = useRef(addSignal.mutate);
  addSignalMutateRef.current = addSignal.mutate;
  const updateStatusMutateRef = useRef(updateStatus.mutate);
  updateStatusMutateRef.current = updateStatus.mutate;

  const allSignals: GeneratedSignal[] = [
    ...signals,
    ...(backendSignals ?? [])
      .map(backendToGenerated)
      .filter((bs) => !signals.find((s) => s.id === bs.id)),
  ].sort((a, b) => b.timestamp - a.timestamp);

  useEffect(() => {
    if (!backendSignals) return;
    const now = Date.now();
    for (const sig of backendSignals) {
      if (sig.status === Status.Active) {
        const age = now - Number(sig.timestamp);
        if (age > 15 * 60 * 1000) {
          updateStatusMutateRef.current({ id: sig.id, status: Status.Expired });
        }
      }
    }
  }, [backendSignals]);

  const runAnalysis = useCallback(async () => {
    try {
      const [{ data: candles, isLive: liveFlag }, fetchedNews] =
        await Promise.all([fetchOHLCV(symbol, "5m", "1d", actor), fetchNews()]);
      setIsLive(liveFlag);
      setNews(fetchedNews);
      setNewsLoading(false);

      const { signals: newSigs, state } = runSignalEngine(
        candles,
        symbol,
        fetchedNews,
      );
      setStratState(state);

      const unique = newSigs.filter(
        (s, i, arr) =>
          arr.findIndex(
            (x) =>
              x.strategy === s.strategy &&
              x.advancedStrategy === s.advancedStrategy,
          ) === i,
      );
      setSignals(unique);

      for (const sig of unique.slice(0, 2)) {
        const key = `${sig.symbol}-${sig.strategy}-${sig.advancedStrategy ?? ""}-${sig.strikePrice}-${sig.optionType}`;
        if (!addedIdsRef.current.has(key)) {
          addedIdsRef.current.add(key);
          addSignalMutateRef.current(generatedToBackend(sig));
        }
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Analysis error:", err);
    }
  }, [symbol, actor]);

  const loadIndices = useCallback(async () => {
    setIndicesLoading(true);
    try {
      const data = await fetchIndices(actor);
      setIndices(data);
    } finally {
      setIndicesLoading(false);
    }
  }, [actor]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadIndices(), runAnalysis()]);
      toast.success("Data refreshed");
    } finally {
      setIsRefreshing(false);
    }
  }, [loadIndices, runAnalysis]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    loadIndices();
    runAnalysis();
  }, []);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  useEffect(() => {
    const iv = setInterval(() => {
      loadIndices();
      runAnalysis();
    }, 60000);
    return () => clearInterval(iv);
  }, [loadIndices, runAnalysis]);

  const sidebarIcons = [
    { Icon: LayoutDashboard, label: "Dashboard", href: "#market" },
    { Icon: BarChart2, label: "Chart", href: "#signals" },
    { Icon: Bell, label: "Signals", href: "#signals" },
    { Icon: Newspaper, label: "News", href: "#news" },
    { Icon: History, label: "History", href: "#history" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.12 0.015 240)" }}
    >
      <TopBar
        isLive={isLive}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <Toaster theme="dark" />

      <div className="flex flex-1 pt-12">
        <aside
          className="hidden lg:flex flex-col items-center gap-2 w-12 border-r border-border py-4 flex-shrink-0"
          style={{ background: "oklch(0.14 0.018 240)" }}
        >
          {sidebarIcons.map(({ Icon, label, href }) => (
            <a
              key={label}
              href={href}
              title={label}
              className="w-8 h-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              data-ocid={`sidebar.${label.toLowerCase()}.link`}
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </aside>

        <main className="flex-1 min-w-0 p-3 flex gap-3 overflow-hidden">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <IndicesBar indices={indices} isLoading={indicesLoading} />
            <CandlestickChart symbol={symbol} onSymbolChange={setSymbol} />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-3.5 h-3.5 text-buy" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Buy Signals
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-buy/20 text-buy font-bold">
                  {signals.length}
                </span>
              </div>
              <SignalCards signals={signals} />
            </div>

            <SignalHistory signals={allSignals} isLoading={backendLoading} />
          </div>

          <div className="hidden xl:flex flex-col gap-3 w-72 flex-shrink-0">
            <StrategyPanel state={stratState} />
            <PCRWidget
              pcr={stratState.pcr}
              oiSignal={stratState.oiSignal}
              volumeRatio={stratState.volumeRatio}
            />
            <NewsFeed news={news} isLoading={newsLoading} />
          </div>
        </main>
      </div>

      <footer className="border-t border-border px-4 py-2 text-center">
        <p className="text-xs text-muted-foreground">
          ⚠️ For educational purposes only. Not financial advice. Trade at your
          own risk.
          {" · "}© {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Built with ❤️ using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
