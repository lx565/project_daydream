import Link from "next/link";
import { STAR_TO_MBTI } from "@/lib/personalityData";
import type { Palace } from "@/lib/ziwei";

interface Props {
  palaces: Palace[];
}

export default function MbtiCard({ palaces }: Props) {
  const soulPalace = palaces.find(p => p.isSoulPalace);
  let soulStars = soulPalace?.stars.filter(s => s.type === "major") ?? [];
  // 空宮看對宮: when 命宮 has no main star (common, ~1 in 6 charts), borrow the
  // 遷移宮 (opposite palace) main stars per standard 紫微 practice — otherwise the
  // MBTI card silently disappears for those users.
  if (soulStars.length === 0) {
    const migration = palaces.find(p => p.name === "遷移" || p.name === "遷移宮");
    soulStars = migration?.stars.filter(s => s.type === "major") ?? [];
  }
  const primaryStarName = soulStars[0]?.name ?? "";
  const mbti = STAR_TO_MBTI[primaryStarName];

  if (!mbti || !primaryStarName) return null;

  return (
    <Link
      href={`/personality/${mbti.slug}`}
      className="paper-card rounded-2xl border border-border-warm p-4 flex items-center justify-between gap-4 hover:border-jade/40 transition-colors group"
    >
      <div className="space-y-1">
        <p className="text-[11px] text-ink-4 tracking-widest uppercase flex items-center gap-2">
          <span className="w-px h-3 bg-ink-4 inline-block" />
          紫微 × MBTI
        </p>
        <p className="text-sm text-ink-2 leading-snug">
          命宮<span className="font-semibold text-ink">·{primaryStarName}星</span>
          {soulStars[1] && <span className="text-ink-3">·{soulStars[1].name}星</span>}
          的西方人格畫像
        </p>
        <p className="text-xs text-ink-4">點選檢視與 MBTI 的深度對照</p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <div className="text-lg font-mono font-bold text-jade group-hover:text-jade transition-colors">
          {mbti.code}
        </div>
        <div className="text-xs text-ink-3">{mbti.name}</div>
        <div className="text-ink-4 text-sm group-hover:text-jade transition-colors">→</div>
      </div>
    </Link>
  );
}
