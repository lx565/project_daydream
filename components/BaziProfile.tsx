"use client";

import type { BaziResult } from "@/lib/bazi";
import ElementsRadar from "./ElementsRadar";

const EL_COLORS: Record<string, string> = {
  木: "text-jade", 火: "text-vermillion", 土: "text-gold",
  金: "text-ink-3", 水: "text-blue-700",
};
const EL_KEY: Record<string, keyof BaziResult["elements"]> = {
  木: "wood", 火: "fire", 土: "earth", 金: "metal", 水: "water",
};

export default function BaziProfile({ result, name, gender }: { result: BaziResult; name?: string; gender: "male" | "female" }) {
  const { year, month, day, hour, elements, dayMaster, dayMasterElement } = result;
  const pillars = [
    { label: "年", stem: year.stem, branch: year.branch, sEl: year.stemElement, bEl: year.branchElement },
    { label: "月", stem: month.stem, branch: month.branch, sEl: month.stemElement, bEl: month.branchElement },
    { label: "日", stem: day.stem, branch: day.branch, sEl: day.stemElement, bEl: day.branchElement },
    { label: "時", stem: hour.stem, branch: hour.branch, sEl: hour.stemElement, bEl: hour.branchElement },
  ];

  return (
    <div className="rounded-xl border border-border-warm bg-paper p-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <ElementsRadar elements={elements} size={100} />
        </div>
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {name && <span className="text-sm font-semibold text-ink">{name}</span>}
            <span className="text-xs text-ink-3">{gender === "male" ? "男命" : "女命"}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border border-border-warm bg-paper-2 ${EL_COLORS[dayMasterElement] ?? "text-vermillion"}`}>
              日主 {dayMaster}（{dayMasterElement}）
            </span>
          </div>
          {/* Four pillars */}
          <div className="flex gap-3">
            {pillars.map((p) => (
              <div key={p.label} className="flex flex-col items-center gap-0">
                <span className="text-[9px] text-ink-4 mb-0.5">{p.label}</span>
                <span className={`text-sm font-bold leading-tight ${EL_COLORS[p.sEl] ?? "text-ink"}`}>{p.stem}</span>
                <span className={`text-sm font-bold leading-tight ${EL_COLORS[p.bEl] ?? "text-ink"}`}>{p.branch}</span>
              </div>
            ))}
          </div>
          {/* Elements */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-ink-4 mr-0.5">五行：</span>
            {(["木", "火", "土", "金", "水"] as const).map((el) => {
              const val = elements[EL_KEY[el]] ?? 0;
              return val > 0 ? (
                <span key={el} className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border border-current/20 bg-current/5 ${EL_COLORS[el]}`}>
                  {el}×{val}
                </span>
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
