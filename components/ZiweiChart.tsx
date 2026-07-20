"use client";

import { useState } from "react";
import type { ZiweiResult } from "@/lib/ziwei";

interface StarInfo {
  name: string;
  brightness: string;
  type: "major" | "minor" | "adjective";
  mutagen?: string;
}

// 流年四化 by year stem → [祿, 權, 科, 忌] star names.
const LIUNIAN_SIHUA: Record<string, [string, string, string, string]> = {
  甲: ["廉貞", "破軍", "武曲", "太陽"], 乙: ["天機", "天梁", "紫微", "太陰"],
  丙: ["天同", "天機", "文昌", "廉貞"], 丁: ["太陰", "天同", "天機", "巨門"],
  戊: ["貪狼", "太陰", "右弼", "天機"], 己: ["武曲", "貪狼", "天梁", "文曲"],
  庚: ["太陽", "武曲", "太陰", "天同"], 辛: ["巨門", "太陽", "文曲", "文昌"],
  壬: ["天梁", "紫微", "左輔", "武曲"], 癸: ["破軍", "巨門", "太陰", "貪狼"],
};
const SIHUA_LABEL = ["流祿", "流權", "流科", "流忌"] as const;

/** Map a year stem → { starName: "流祿"|"流權"|"流科"|"流忌" }. */
function liuNianSihuaMap(stem: string): Record<string, string> {
  const row = LIUNIAN_SIHUA[stem];
  const m: Record<string, string> = {};
  if (row) row.forEach((star, i) => { m[star] = SIHUA_LABEL[i]; });
  return m;
}

interface Palace {
  index: number;
  name: string;
  earthlyBranch: string;
  heavenlyStem: string;
  isBodyPalace: boolean;
  isSoulPalace: boolean;
  stars: StarInfo[];
  decadalAge?: string;
  decadalStem?: string;
}

interface ZiweiChartProps {
  palaces: Palace[];
  soulPalace: string;
  bodyPalace: string;
  fiveElementsClass: string;
  mainStar: string;
  bodyStar: string;
  name?: string;
  gender: "male" | "female";
  isExample?: boolean; // hide 流年 controls/highlighting when true
  birthYear?: number;          // enables age labels + per-year drill-down
  ziwei?: ZiweiResult;         // full chart, for the per-year 詳批 request
  sessionId?: string;          // drill-down cache key
}

// Clockwise branch order for 三方四正 calculation
const BRANCH_ORDER = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];

const EARTHLY_BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const HEAVENLY_STEMS   = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];

function yearBranch(year: number) {
  return EARTHLY_BRANCHES[((year - 1984) % 12 + 12) % 12];
}
function yearStem(year: number) {
  return HEAVENLY_STEMS[((year - 1984) % 10 + 10) % 10];
}

function getTriFang(branch: string): { trine: Set<string>; opposite: string } {
  const idx = BRANCH_ORDER.indexOf(branch);
  if (idx < 0) return { trine: new Set(), opposite: "" };
  const n = BRANCH_ORDER.length;
  const trine = new Set([
    BRANCH_ORDER[(idx + 4) % n],
    BRANCH_ORDER[(idx + 8) % n],
  ]);
  const opposite = BRANCH_ORDER[(idx + 6) % n];
  return { trine, opposite };
}

const BRANCH_POSITION: Record<string, [number, number]> = {
  寅: [3, 0], 卯: [2, 0], 辰: [1, 0], 巳: [0, 0],
  午: [0, 1], 未: [0, 2], 申: [0, 3],
  酉: [1, 3], 戌: [2, 3], 亥: [3, 3],
  子: [3, 2], 丑: [3, 1],
};

const BRIGHTNESS_COLOR: Record<string, string> = {
  旺: "#16a34a",   // vivid green
  廟: "#d97706",   // amber
  得: "#8B1A1A",
  利: "#8B1A1A",
  平: "#8B1A1A",
  不: "#9ca3af",
  陷: "#9ca3af",
};

function StarName({ name, brightness }: { name: string; brightness: string }) {
  const color = BRIGHTNESS_COLOR[brightness] ?? "#8B1A1A";
  const isBright = brightness === "旺" || brightness === "廟";
  return (
    <span
      className={`text-[11px] sm:text-xs leading-snug ${isBright ? "font-black" : "font-semibold"}`}
      style={{ color }}
    >
      {name}
    </span>
  );
}

// Small brightness badge — show all brightness levels
function BrightnessBadge({ b }: { b: string }) {
  if (!b) return null;
  const colorMap: Record<string, string> = {
    "旺": "#16a34a",   // bright green
    "廟": "#d97706",   // amber
    "得": "#8B1A1A",   // dark red
    "利": "#8B1A1A",   // dark red
    "平": "#8B1A1A",   // dark red
    "不": "#9ca3af",   // gray
    "陷": "#9ca3af",   // gray
  };
  const color = colorMap[b] ?? "#8B1A1A";
  return (
    <span className="text-[7px] sm:text-[8px] leading-none font-bold" style={{ color }}>
      {b}
    </span>
  );
}

const MUTAGEN_STYLE: Record<string, string> = {
  化祿: "bg-jade/15 text-jade border-jade/40 font-bold",
  化權: "bg-amber-100 text-amber-700 border-amber-300 font-bold",
  化科: "bg-blue-50 text-blue-600 border-blue-200 font-bold",
  化忌: "bg-red-100 text-red-600 border-red-300 font-bold",
};

function MutagenPill({ mutagen }: { mutagen: string }) {
  const style = MUTAGEN_STYLE[mutagen] ?? "bg-paper-2 text-ink-3 border-border-warm";
  const isJi = mutagen === "化忌";
  return (
    <span className={`inline-block text-[8px] sm:text-[9px] leading-none px-1 py-0.5 rounded border ml-0.5 ${style} ${isJi ? "ring-1 ring-red-300" : ""}`}>
      {mutagen.replace("化", "")}
    </span>
  );
}

// 流年四化 pill (purple, distinct from natal 化X pills).
function LiuNianPill({ label }: { label: string }) {
  return (
    <span className="inline-block text-[8px] sm:text-[9px] leading-none px-1 py-0.5 rounded border ml-0.5 bg-purple-100 text-purple-700 border-purple-300 font-bold">
      {label.replace("流", "流")}
    </span>
  );
}

interface PalaceCellProps {
  palace: Palace;
  isSelected: boolean;
  isTrine: boolean;
  isOpposite: boolean;
  isLiuNian: boolean;
  liuNianSihua: Record<string, string>;
  onClick: () => void;
}

function PalaceCell({ palace, isSelected, isTrine, isOpposite, isLiuNian, liuNianSihua, onClick }: PalaceCellProps) {
  const pos = BRANCH_POSITION[palace.earthlyBranch];
  if (!pos) return null;
  const [row, col] = pos;

  const majorStars = palace.stars.filter((s) => s.type === "major");
  const minorStars = palace.stars.filter((s) => s.type === "minor");
  const adjStars   = palace.stars.filter((s) => s.type === "adjective");

  // 命宮 is the most important palace — strong border + background, always visible.
  // 流年 is secondary — only a faint tint + the "年" badge, never overrides 命宮.
  let borderCls = "border-border-warm bg-paper";
  let ringCls = "";
  let leftAccent = "";

  if (palace.isSoulPalace) {
    borderCls = "border-vermillion bg-rose-50";
  } else if (palace.isBodyPalace) {
    leftAccent = "border-l-amber-400 border-l-[3px]";
  }

  // 流年: very subtle marker — slight purple border + barely-there tint.
  // Never overrides 命宮 highlight.
  if (isLiuNian && !isSelected && !isTrine && !isOpposite && !palace.isSoulPalace) {
    borderCls = "border-purple-200 bg-purple-50/25";
    leftAccent = "";
  }

  // Click-triggered states override everything
  if (isSelected) {
    borderCls = "border-vermillion bg-rose-100";
    ringCls = "";
    leftAccent = "";
  } else if (isTrine) {
    borderCls = "border-amber-400 bg-amber-50/60";
    ringCls = "";
    leftAccent = "";
  } else if (isOpposite) {
    borderCls = "border-sky-400 bg-sky-50/60";
    ringCls = "";
    leftAccent = "";
  }

  return (
    <div
      onClick={onClick}
      className={`border ${borderCls} ${ringCls} ${leftAccent} p-1 sm:p-1.5 flex flex-col justify-between min-h-0 overflow-hidden cursor-pointer transition-all duration-150 hover:bg-paper-2`}
      style={{ gridColumn: col + 1, gridRow: row + 1 }}
    >
      {/* Stars */}
      <div className="flex-1 overflow-hidden">
        {majorStars.map((star) => (
          <div key={star.name} className="flex items-baseline flex-wrap gap-x-0.5 leading-snug">
            <StarName name={star.name} brightness={star.brightness} />
            <BrightnessBadge b={star.brightness} />
            {star.mutagen && <MutagenPill mutagen={star.mutagen} />}
            {liuNianSihua[star.name] && <LiuNianPill label={liuNianSihua[star.name]} />}
          </div>
        ))}
        {minorStars.length > 0 && (
          <div className="mt-0.5 text-[9px] sm:text-[10px] leading-snug text-ink-2">
            {minorStars.map((s) => (
              <span key={s.name} className="mr-0.5">
                {s.name}<BrightnessBadge b={s.brightness} />{s.mutagen && <MutagenPill mutagen={s.mutagen} />}
                {liuNianSihua[s.name] && <LiuNianPill label={liuNianSihua[s.name]} />}
              </span>
            ))}
          </div>
        )}
        {adjStars.length > 0 && (
          <div className="hidden sm:block mt-0.5 text-ink-3 text-[8px] leading-snug">
            {adjStars.map((s) => <span key={s.name} className="mr-0.5">{s.name}</span>)}
          </div>
        )}
      </div>

      {/* Decadal */}
      {palace.decadalAge && (
        <div className="text-ink-4 text-[8px] sm:text-[9px] mt-0.5 leading-none">
          {palace.decadalStem && <span className="mr-0.5">{palace.decadalStem}</span>}
          {palace.decadalAge}
        </div>
      )}

      {/* Palace name row */}
      <div className="flex items-end justify-between mt-1 gap-0.5">
        <div className="flex items-center gap-0.5 flex-wrap">
          <span className={palace.isSoulPalace
            ? "text-xs sm:text-sm font-black text-vermillion leading-none tracking-wide"
            : "text-[10px] sm:text-xs font-medium leading-none text-ink-2"}>
            {palace.name}
          </span>
          {palace.isSoulPalace && (
            <span className="inline-block text-[7px] sm:text-[8px] leading-none px-1 py-px bg-vermillion text-white font-bold rounded-sm">命</span>
          )}
          {palace.isBodyPalace && (
            <span className="inline-block text-[7px] sm:text-[8px] leading-none px-1 py-px bg-amber-500 text-white font-bold rounded-sm">身</span>
          )}
          {isLiuNian && (
            <span className="inline-block text-[7px] sm:text-[8px] leading-none px-1 py-px bg-purple-500 text-white font-bold rounded-sm">年</span>
          )}
        </div>
        <span className="text-ink-3 font-bold text-[10px] sm:text-xs leading-none shrink-0">{palace.earthlyBranch}</span>
      </div>
    </div>
  );
}

// Compute the point where a line from cellCenter exits the cell boundary
function cellEdgePoint(fromBranch: string, toBranch: string): [number, number] | null {
  const fromPos = BRANCH_POSITION[fromBranch];
  const toPos = BRANCH_POSITION[toBranch];
  if (!fromPos || !toPos) return null;
  const [r1, c1] = fromPos;
  const [r2, c2] = toPos;
  const cx = (c1 + 0.5) * 25, cy = (r1 + 0.5) * 25;
  const tx = (c2 + 0.5) * 25, ty = (r2 + 0.5) * 25;
  const dx = tx - cx, dy = ty - cy;
  // t at which the ray from center exits the 25×25 cell (half-width = 12.5)
  const t = 12.5 / Math.max(Math.abs(dx), Math.abs(dy));
  return [cx + t * dx, cy + t * dy];
}

function TriFangLines({ selected, trine, opposite }: { selected: string; trine: Set<string>; opposite: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {[...trine].map((b) => {
        const p1 = cellEdgePoint(selected, b);
        const p2 = cellEdgePoint(b, selected);
        if (!p1 || !p2) return null;
        return (
          <line key={b}
            x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]}
            stroke="#F59E0B" strokeWidth="0.15" strokeDasharray="1.5 1" opacity="0.35"
          />
        );
      })}
      {opposite && (() => {
        const p1 = cellEdgePoint(selected, opposite);
        const p2 = cellEdgePoint(opposite, selected);
        if (!p1 || !p2) return null;
        return (
          <line
            x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]}
            stroke="#38BDF8" strokeWidth="0.15" strokeDasharray="1 1" opacity="0.35"
          />
        );
      })()}
    </svg>
  );
}

function CenterBlock({ name, gender, fiveElementsClass, mainStar, bodyStar, hint }:
  Pick<ZiweiChartProps, "name" | "gender" | "fiveElementsClass" | "mainStar" | "bodyStar"> & { hint: boolean }) {
  return (
    <div
      className="border border-border-warm bg-paper flex flex-col items-center justify-center gap-1 sm:gap-1.5 p-2 sm:p-3"
      style={{ gridColumn: "2 / 4", gridRow: "2 / 4" }}
    >
      <span className="text-vermillion text-xs sm:text-sm font-bold tracking-wide">命裡</span>
      <div className="w-full h-px bg-vermillion/20" />
      <span className="text-ink-2 text-[10px] sm:text-xs text-center leading-snug">
        {name ?? "匿名"} · {gender === "male" ? "男命" : "女命"}
      </span>
      <span className="text-ink-3 text-[9px] sm:text-[10px]">{fiveElementsClass}</span>
      <div className="w-full h-px bg-vermillion/20" />
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[9px] sm:text-[10px]">
          <span className="text-ink-4">命主 </span>
          <span className="text-vermillion font-semibold">{mainStar}</span>
        </span>
        <span className="text-[9px] sm:text-[10px]">
          <span className="text-ink-4">身主 </span>
          <span className="text-amber-600 font-semibold">{bodyStar}</span>
        </span>
      </div>
      {hint && (
        <p className="text-[8px] text-ink-4 text-center mt-1 leading-tight hidden sm:block">
          點選宮位<br/>檢視三方四正
        </p>
      )}
    </div>
  );
}

export default function ZiweiChart({ palaces, soulPalace, bodyPalace, fiveElementsClass, mainStar, bodyStar, name, gender, isExample, birthYear, ziwei, sessionId }: ZiweiChartProps) {
  void soulPalace; void bodyPalace; void sessionId; void ziwei;
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [liuNianYear, setLiuNianYear] = useState(() => new Date().getFullYear());

  const liuNianBranch = yearBranch(liuNianYear);
  const liuNianStem = yearStem(liuNianYear);
  const liuNianLabel = `${liuNianStem}${liuNianBranch}`;
  const liuNianSihua = isExample ? {} : liuNianSihuaMap(liuNianStem);
  const age = typeof birthYear === "number" ? liuNianYear - birthYear : null;

  const branchOrder = ["巳", "午", "未", "申", "辰", "酉", "卯", "戌", "寅", "丑", "子", "亥"];
  const sorted = [...palaces].sort((a, b) => branchOrder.indexOf(a.earthlyBranch) - branchOrder.indexOf(b.earthlyBranch));

  const { trine, opposite } = selectedBranch ? getTriFang(selectedBranch) : { trine: new Set<string>(), opposite: "" };

  function handlePalaceClick(branch: string) {
    setSelectedBranch((prev) => prev === branch ? null : branch);
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border-warm">
      {/* 流年 controls — hidden for examples */}
      {!isExample && (
        <div className="flex items-center gap-2 px-3 py-2 bg-paper-2 border-b border-border-light">
          <span className="w-2 h-2 rounded-sm bg-purple-500 inline-block" />
          <span className="text-[11px] text-ink-3">流年</span>
          <button
            onClick={() => setLiuNianYear(y => y - 1)}
            className="w-5 h-5 flex items-center justify-center rounded text-ink-4 hover:text-vermillion hover:bg-paper text-xs"
          >‹</button>
          <span className="text-xs font-medium text-purple-700 min-w-[5.5rem] text-center">
            {age !== null && age >= 0 ? `${age}歲 · ` : ""}{liuNianYear} {liuNianLabel}
          </span>
          <button
            onClick={() => setLiuNianYear(y => y + 1)}
            className="w-5 h-5 flex items-center justify-center rounded text-ink-4 hover:text-vermillion hover:bg-paper text-xs"
          >›</button>
          <button
            onClick={() => setLiuNianYear(new Date().getFullYear())}
            className="ml-1 text-[10px] text-ink-4 hover:text-vermillion underline"
          >今年</button>
          <span className="ml-auto text-[10px] text-ink-4">流年命宮 · {liuNianBranch}宮</span>
        </div>
      )}

      <div className="relative grid grid-cols-4 grid-rows-4 gap-px bg-border-warm w-full aspect-square">
        {selectedBranch && (
          <TriFangLines selected={selectedBranch} trine={trine} opposite={opposite} />
        )}
        {sorted.map((palace) => (
          <PalaceCell
            key={palace.earthlyBranch}
            palace={palace}
            isSelected={selectedBranch === palace.earthlyBranch}
            isTrine={trine.has(palace.earthlyBranch)}
            isOpposite={opposite === palace.earthlyBranch}
            isLiuNian={!isExample && palace.earthlyBranch === liuNianBranch}
            liuNianSihua={liuNianSihua}
            onClick={() => handlePalaceClick(palace.earthlyBranch)}
          />
        ))}
        <CenterBlock
          name={name} gender={gender}
          fiveElementsClass={fiveElementsClass}
          mainStar={mainStar} bodyStar={bodyStar}
          hint={!selectedBranch}
        />
      </div>
      {/* Legend — hidden entirely on example charts with no selection (no 流年 refs) */}
      {(!isExample || selectedBranch) && (
      <div className="flex items-center gap-3 px-3 py-1.5 bg-paper-2 border-t border-border-light text-[10px] text-ink-3 flex-wrap">
        {!isExample && (
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-50 border border-purple-300 inline-block" />
            流年命宮
          </span>
        )}
        {selectedBranch && (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-50 border border-vermillion inline-block" />
              已選
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-400 inline-block" />
              三方
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-50 border border-sky-400 inline-block" />
              對宮
            </span>
            <button onClick={() => setSelectedBranch(null)} className="ml-auto text-ink-4 hover:text-vermillion underline">
              取消
            </button>
          </>
        )}
      </div>
      )}

    </div>
  );
}
