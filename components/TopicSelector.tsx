"use client";

export type Topic = "wealth" | "love" | "career" | "health" | "annual";

const TOPICS: { id: Topic; char: string; label: string; desc: string }[] = [
  { id: "wealth",  char: "財", label: "財運",  desc: "錢財·投資·積累" },
  { id: "love",    char: "情", label: "感情",  desc: "婚戀·桃花·緣分" },
  { id: "career",  char: "業", label: "事業",  desc: "職場·晉升·創業" },
  { id: "health",  char: "康", label: "健康",  desc: "身體·精神·調養" },
  { id: "annual",  char: "年", label: "流年",  desc: "當年運勢走向" },
];

export default function TopicSelector({ onSelect }: { onSelect: (t: Topic) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-4 text-center tracking-widest">選擇你最想了解的方向</p>
      <div className="grid grid-cols-5 gap-2">
        {TOPICS.map((t) => (
          <button key={t.id} onClick={() => onSelect(t.id)}
            className="group flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border-2 border-border-warm bg-paper hover:border-vermillion/50 hover:bg-vermillion-l/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-vermillion/30">
            <span className="text-2xl font-bold text-vermillion/60 group-hover:text-vermillion transition-colors leading-none">
              {t.char}
            </span>
            <span className="text-xs font-semibold text-ink-2 group-hover:text-vermillion transition-colors">{t.label}</span>
            <span className="text-[9px] text-ink-4 text-center leading-tight">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
