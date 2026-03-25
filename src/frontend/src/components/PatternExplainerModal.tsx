import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PatternData {
  description: string;
  ratios: { leg: string; ratio: string }[];
}

const PATTERNS: Record<string, PatternData> = {
  Gartley: {
    description:
      "The Gartley is a retracement pattern that identifies high-probability reversal zones using precise Fibonacci relationships. It signals a potential bullish reversal at point D after a structured 5-point XABCD move.",
    ratios: [
      { leg: "XA", ratio: "1.0" },
      { leg: "AB", ratio: "0.618 of XA" },
      { leg: "BC", ratio: "0.382 – 0.886 of AB" },
      { leg: "CD", ratio: "1.272 – 1.618 of BC" },
      { leg: "D (PRZ)", ratio: "0.786 of XA" },
    ],
  },
  Bat: {
    description:
      "The Bat pattern uses a deep 0.886 retracement at D, offering a tight-risk entry near the Potential Reversal Zone. It typically precedes strong bullish or bearish moves with a favorable risk/reward ratio.",
    ratios: [
      { leg: "XA", ratio: "1.0" },
      { leg: "AB", ratio: "0.382 – 0.500 of XA" },
      { leg: "BC", ratio: "0.382 – 0.886 of AB" },
      { leg: "CD", ratio: "1.618 – 2.618 of BC" },
      { leg: "D (PRZ)", ratio: "0.886 of XA" },
    ],
  },
  Butterfly: {
    description:
      "The Butterfly extends beyond the original X point, signaling exhaustion of the prevailing trend. Point D at 1.27–1.618 of XA is a powerful reversal zone, often seen at major market tops and bottoms.",
    ratios: [
      { leg: "XA", ratio: "1.0" },
      { leg: "AB", ratio: "0.786 of XA" },
      { leg: "BC", ratio: "0.382 – 0.886 of AB" },
      { leg: "CD", ratio: "1.618 – 2.24 of BC" },
      { leg: "D (PRZ)", ratio: "1.27 – 1.618 of XA" },
    ],
  },
  Crab: {
    description:
      "The Crab is the most precise harmonic pattern, with point D at an extreme 1.618 extension of XA. It captures violent reversal moves and is best traded with tight stop-losses just beyond the D level.",
    ratios: [
      { leg: "XA", ratio: "1.0" },
      { leg: "AB", ratio: "0.382 – 0.618 of XA" },
      { leg: "BC", ratio: "0.382 – 0.886 of AB" },
      { leg: "CD", ratio: "2.618 – 3.618 of BC" },
      { leg: "D (PRZ)", ratio: "1.618 of XA" },
    ],
  },
};

// SVG XABCD diagram coordinates
const SVG_POINTS = {
  X: { x: 30, y: 120 },
  A: { x: 90, y: 20 },
  B: { x: 150, y: 85 },
  C: { x: 210, y: 40 },
  D: { x: 270, y: 100 },
};

const POINT_LABELS = ["X", "A", "B", "C", "D"] as const;
type PointKey = (typeof POINT_LABELS)[number];

const CONNECTIONS: [PointKey, PointKey][] = [
  ["X", "A"],
  ["A", "B"],
  ["B", "C"],
  ["C", "D"],
];

const POINT_COLORS: Record<PointKey, string> = {
  X: "oklch(0.65 0.15 280)",
  A: "oklch(0.72 0.2 145)",
  B: "oklch(0.65 0.18 30)",
  C: "oklch(0.72 0.2 200)",
  D: "oklch(0.75 0.25 145)",
};

function XABCDDiagram() {
  return (
    <svg
      viewBox="0 0 300 140"
      className="w-full"
      style={{ maxHeight: 130 }}
      role="img"
      aria-label="XABCD harmonic pattern diagram"
    >
      {/* Grid lines */}
      {[20, 60, 100].map((y) => (
        <line
          key={y}
          x1="10"
          y1={y}
          x2="290"
          y2={y}
          stroke="oklch(0.35 0.02 240)"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />
      ))}

      {/* Connection lines */}
      {CONNECTIONS.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={SVG_POINTS[from].x}
          y1={SVG_POINTS[from].y}
          x2={SVG_POINTS[to].x}
          y2={SVG_POINTS[to].y}
          stroke="oklch(0.55 0.08 240)"
          strokeWidth="1.5"
        />
      ))}

      {/* PRZ shading at D */}
      <rect
        x={SVG_POINTS.D.x - 12}
        y={SVG_POINTS.D.y - 12}
        width="24"
        height="24"
        rx="4"
        fill="oklch(0.72 0.2 145 / 0.15)"
        stroke="oklch(0.72 0.2 145 / 0.5)"
        strokeWidth="1"
        strokeDasharray="3 2"
      />

      {/* Points */}
      {POINT_LABELS.map((key) => {
        const pt = SVG_POINTS[key];
        const color = POINT_COLORS[key];
        const isD = key === "D";
        const labelY = pt.y > 70 ? pt.y + 16 : pt.y - 10;
        return (
          <g key={key}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isD ? 6 : 4}
              fill={color}
              stroke="oklch(0.16 0.02 240)"
              strokeWidth="1.5"
            />
            <text
              x={pt.x}
              y={labelY}
              textAnchor="middle"
              fill={color}
              fontSize="10"
              fontWeight="bold"
              fontFamily="JetBrains Mono, monospace"
            >
              {key}
            </text>
          </g>
        );
      })}

      {/* PRZ label */}
      <text
        x={SVG_POINTS.D.x + 16}
        y={SVG_POINTS.D.y + 4}
        fill="oklch(0.72 0.2 145)"
        fontSize="8"
        fontFamily="JetBrains Mono, monospace"
      >
        PRZ
      </text>
    </svg>
  );
}

interface PatternExplainerModalProps {
  pattern: string | null;
  onClose: () => void;
}

export function PatternExplainerModal({
  pattern,
  onClose,
}: PatternExplainerModalProps) {
  const data = pattern ? PATTERNS[pattern] : null;

  return (
    <Dialog open={pattern !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md border-border"
        style={{ background: "oklch(0.16 0.02 240)" }}
        data-ocid="pattern_explainer.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <span
              className="text-xs px-2 py-0.5 rounded font-mono"
              style={{
                background: "oklch(0.25 0.06 280)",
                color: "oklch(0.75 0.2 280)",
              }}
            >
              HARMONIC
            </span>
            <span>{pattern} Pattern</span>
          </DialogTitle>
        </DialogHeader>

        {data ? (
          <div className="flex flex-col gap-4">
            {/* SVG Diagram */}
            <div
              className="rounded-lg border border-border/50 p-3"
              style={{ background: "oklch(0.13 0.02 240)" }}
            >
              <div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">
                XABCD Structure
              </div>
              <XABCDDiagram />
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.description}
            </p>

            {/* Fibonacci Ratio Table */}
            <div>
              <div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">
                Fibonacci Ratios
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs h-7 text-muted-foreground">
                      Leg
                    </TableHead>
                    <TableHead className="text-xs h-7 text-muted-foreground">
                      Ratio
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ratios.map((row) => (
                    <TableRow key={row.leg} className="border-border/30">
                      <TableCell
                        className="py-1.5 font-mono text-xs font-bold"
                        style={{ color: "oklch(0.72 0.2 280)" }}
                      >
                        {row.leg}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-foreground/80 font-mono">
                        {row.ratio}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
