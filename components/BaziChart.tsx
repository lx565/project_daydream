interface Pillar {
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
}

interface BaziResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
  elements: { wood: number; fire: number; earth: number; metal: number; water: number };
  dayMaster: string;
  dayMasterElement: string;
  summary: string;
}

interface BaziChartProps {
  result: BaziResult;
  label?: string;
}

const ELEMENT_COLORS: Record<string, string> = {
  木: "text-green-400",
  火: "text-red-400",
  土: "text-yellow-600",
  金: "text-gray-300",
  水: "text-blue-400",
};

const ELEMENT_BAR_COLORS: Record<string, string> = {
  木: "bg-green-400",
  火: "bg-red-400",
  土: "bg-yellow-600",
  金: "bg-gray-300",
  水: "bg-blue-400",
};

const ELEMENT_ORDER = [
  { key: "wood", label: "木" },
  { key: "fire", label: "火" },
  { key: "earth", label: "土" },
  { key: "metal", label: "金" },
  { key: "water", label: "水" },
] as const;

function ElementBadge({ element }: { element: string }) {
  const color = ELEMENT_COLORS[element] ?? "text-zinc-400";
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 ${color}`}>
      {element}
    </span>
  );
}

function PillarCard({
  pillar,
  label,
  isDay,
}: {
  pillar: Pillar;
  label: string;
  isDay?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 flex-1 rounded-xl p-4 bg-zinc-900 border ${
        isDay ? "border-amber-500/50" : "border-zinc-800"
      }`}
    >
      {/* Pillar label */}
      <span className="text-xs text-zinc-500 tracking-widest">{label}</span>

      {/* Heavenly Stem — 天干 */}
      <span className="text-4xl font-bold text-amber-400 leading-none">{pillar.stem}</span>

      {/* Earthly Branch — 地支 */}
      <span className="text-4xl font-semibold text-zinc-100 leading-none">{pillar.branch}</span>

      {/* 五行 of stem */}
      <ElementBadge element={pillar.stemElement} />

      {/* 五行 of branch */}
      <ElementBadge element={pillar.branchElement} />
    </div>
  );
}

function ElementBar({
  elements,
}: {
  elements: BaziResult["elements"];
}) {
  const total = 8; // 4 pillars × 2 characters each

  return (
    <div className="flex flex-col gap-2">
      {ELEMENT_ORDER.map(({ key, label }) => {
        const count = elements[key];
        const pct = Math.round((count / total) * 100);
        const colorText = ELEMENT_COLORS[label] ?? "text-zinc-400";
        const colorBar = ELEMENT_BAR_COLORS[label] ?? "bg-zinc-400";

        return (
          <div key={key} className="flex items-center gap-3">
            {/* Element label */}
            <span className={`w-4 text-sm font-semibold ${colorText}`}>{label}</span>

            {/* Bar track */}
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorBar}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Count */}
            <span className="w-4 text-right text-xs text-zinc-400">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function BaziChart({ result, label }: BaziChartProps) {
  const pillars = [
    { pillar: result.year, label: "年柱" },
    { pillar: result.month, label: "月柱" },
    { pillar: result.day, label: "日柱", isDay: true },
    { pillar: result.hour, label: "時柱" },
  ];

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
      {/* Optional section label */}
      {label && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-widest text-amber-400 uppercase">
            {label}
          </span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>
      )}

      {/* Day master note */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500">日主</span>
        <span className="text-amber-400 font-bold text-base">{result.dayMaster}</span>
        <span className={`text-sm font-medium ${ELEMENT_COLORS[result.dayMasterElement] ?? "text-zinc-400"}`}>
          {result.dayMasterElement}
        </span>
      </div>

      {/* Four Pillars */}
      <div className="flex gap-2 sm:gap-3">
        {pillars.map(({ pillar, label: pLabel, isDay }) => (
          <PillarCard key={pLabel} pillar={pillar} label={pLabel} isDay={isDay} />
        ))}
      </div>

      {/* 五行 Distribution */}
      <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
        <p className="text-xs text-zinc-500 tracking-widest mb-3">五行分佈</p>
        <ElementBar elements={result.elements} />
      </div>

      {/* Summary */}
      {result.summary && (
        <p className="text-sm italic text-zinc-400 leading-relaxed border-l-2 border-amber-400/30 pl-3">
          {result.summary}
        </p>
      )}
    </div>
  );
}
