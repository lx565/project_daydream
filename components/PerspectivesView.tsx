"use client";

import { useState } from "react";
import Md from "./Md";
import { parsePerspectives, type SchoolSection } from "@/lib/parsePerspectives";
import { parseModernBlocks } from "@/lib/modernBlocks";
import type { Reference } from "@/lib/rag";
import type { StreamResult } from "@/lib/useSSEStream";

// Per-school color config
const SCHOOL_STYLE: Record<string, {
  cardBg: string; cardBorder: string;
  badgeBg: string; badgeText: string; badgeBorder: string;
  accent: string; accentText: string;
}> = {
  "三合派": {
    cardBg: "bg-rose-50/40", cardBorder: "border-vermillion/25",
    badgeBg: "bg-vermillion", badgeText: "text-paper", badgeBorder: "border-vermillion",
    accent: "bg-vermillion", accentText: "text-vermillion",
  },
  "四化派": {
    cardBg: "bg-amber-50/40", cardBorder: "border-amber-400/30",
    badgeBg: "bg-amber-600", badgeText: "text-paper", badgeBorder: "border-amber-600",
    accent: "bg-amber-500", accentText: "text-amber-700",
  },
  "飛星派": {
    cardBg: "bg-emerald-50/40", cardBorder: "border-emerald-500/25",
    badgeBg: "bg-emerald-700", badgeText: "text-paper", badgeBorder: "border-emerald-700",
    accent: "bg-emerald-600", accentText: "text-emerald-700",
  },
  "古籍經典": {
    cardBg: "bg-stone-50/60", cardBorder: "border-stone-300/50",
    badgeBg: "bg-stone-600", badgeText: "text-paper", badgeBorder: "border-stone-600",
    accent: "bg-stone-500", accentText: "text-stone-600",
  },
  "倪師學派": {
    cardBg: "bg-indigo-50/40", cardBorder: "border-indigo-400/30",
    badgeBg: "bg-indigo-700", badgeText: "text-paper", badgeBorder: "border-indigo-700",
    accent: "bg-indigo-600", accentText: "text-indigo-700",
  },
};

const SCHOOL_DESC: Record<string, string> = {
  "三合派": "宮位星曜組合",
  "四化派": "四化飛星脈絡",
  "飛星派": "飛星入宮論斷",
  "古籍經典": "傳統經典引述",
  "倪師學派": "倪師直傳視角",
};

function SchoolBadge({ school }: { school: string }) {
  const s = SCHOOL_STYLE[school] ?? SCHOOL_STYLE["古籍經典"];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold border ${s.badgeBg} ${s.badgeText} ${s.badgeBorder}`}>
      {school}
    </span>
  );
}

function SchoolRefList({ refs, school }: { refs: Reference[]; school: string }) {
  const filtered = refs.filter((r) => r.school === school);
  if (filtered.length === 0) return null;
  return (
    <div className="mt-3 pt-2.5 border-t border-border-light">
      <p className="text-[10px] text-ink-4 mb-1">參考典籍</p>
      <div className="flex flex-wrap gap-1">
        {filtered.map((r, i) => (
          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-paper-2 border border-border-light text-ink-3">
            {r.book.replace(/-/g, " · ")}
          </span>
        ))}
      </div>
    </div>
  );
}

const PROSE_CLS = "prose max-w-none text-sm [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:mb-2 [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:space-y-1.5 [&_li]:text-ink-2 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:relative [&_li]:pl-4 [&_li]:list-none [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-0 [&_li]:before:text-vermillion [&_li]:before:font-bold [&_li>p]:inline [&_li>p]:m-0";

function ModernBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 rounded-xl border border-sky-200/80 overflow-hidden bg-sky-50/40">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left gap-2 hover:bg-sky-50/60 transition-colors">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
          現代視角
        </span>
        <span className={`text-sky-400 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-sm text-sky-900/80 leading-relaxed border-t border-sky-100">
          <Md>{content}</Md>
        </div>
      )}
    </div>
  );
}

function ClassicalMd({ text }: { text: string }) {
  const parts = parseModernBlocks(text);
  return (
    <div>
      {parts.map((part, i) =>
        part.type === "modern"
          ? <ModernBlock key={i} content={part.content} />
          : <Md key={i} className={PROSE_CLS}>{part.content}</Md>
      )}
    </div>
  );
}

function StreamingDot() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1 h-1 rounded-full bg-ink-4 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}

interface SchoolCardProps {
  section: SchoolSection;
  refs: Reference[];
  isOpen: boolean;
  isStreaming: boolean;
  onToggle: () => void;
}

function SchoolCard({ section, refs, isOpen, isStreaming, onToggle }: SchoolCardProps) {
  const s = SCHOOL_STYLE[section.school] ?? SCHOOL_STYLE["古籍經典"];
  const schoolRefs = refs.filter((r) => r.school === section.school);

  return (
    <div className={`rounded-xl border-2 ${s.cardBorder} ${s.cardBg} overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/30 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <SchoolBadge school={section.school} />
          <span className="text-xs text-ink-4 hidden sm:inline">{SCHOOL_DESC[section.school]}</span>
          {schoolRefs.length > 0 && (
            <span className="text-[10px] text-ink-4 shrink-0">· {schoolRefs.length}部典籍</span>
          )}
          {isStreaming && <StreamingDot />}
        </div>
        <span className={`text-xs ${s.accentText} transition-transform duration-200 ml-2 ${isOpen ? "rotate-180" : ""}`}>▾</span>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="px-4 pb-4 border-t border-white/40">
          <div className="pt-3">
            {section.text ? (
              <ClassicalMd text={section.text} />
            ) : (
              <p className="text-sm text-ink-4 italic">（生成中…）</p>
            )}
          </div>
          <SchoolRefList refs={refs} school={section.school} />
        </div>
      )}
    </div>
  );
}

interface PerspectivesViewProps {
  stream: StreamResult;
  ziweiPayload: object;
}

export default function PerspectivesView({ stream, ziweiPayload }: PerspectivesViewProps) {
  const [openSchools, setOpenSchools] = useState<Set<string>>(new Set());
  const [userToggled, setUserToggled] = useState(false);

  function toggle(school: string) {
    setUserToggled(true);
    setOpenSchools((prev) => {
      const next = new Set(prev);
      if (next.has(school)) next.delete(school);
      else next.add(school);
      return next;
    });
  }

  if (stream.status === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-ink-3 text-center">各門派典籍各自解讀命盤，呈現不同視角</p>
        <button onClick={() => stream.start(ziweiPayload)}
          style={{ color: "#FDFCF8" }}
          className="px-5 py-2 bg-vermillion text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
          開始多派解讀
        </button>
      </div>
    );
  }

  if (stream.status === "error") {
    return (
      <div className="space-y-2 py-4">
        <p className="text-sm text-vermillion">{stream.errorMsg}</p>
        <button onClick={() => stream.start(ziweiPayload)} className="text-xs text-gold underline">重試</button>
      </div>
    );
  }

  const parsed = parsePerspectives(stream.text);
  const isDone = stream.status === "done";
  const isStreaming = stream.status === "streaming";

  // Auto-open first school that appears (until user toggles manually)
  const effectiveOpen = userToggled
    ? openSchools
    : new Set([parsed.schools[0]?.school].filter(Boolean));

  // Show initial spinner before any markers appear
  if (isStreaming && !parsed.hasMarkers) {
    return (
      <div className="flex items-center gap-3 py-6">
        <div className="relative w-6 h-6 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-vermillion/20" />
          <div className="absolute inset-0 rounded-full border-2 border-vermillion border-t-transparent animate-spin" />
        </div>
        <span className="text-sm text-ink-3">正在檢索各派典籍…</span>
      </div>
    );
  }

  // Fallback: if done but no markers parsed, render raw
  if (isDone && !parsed.hasMarkers) {
    return (
      <div className="space-y-3">
        <ClassicalMd text={stream.text} />
        <button onClick={() => stream.rerun()} className="text-xs text-ink-4 hover:text-vermillion underline">重新生成</button>
      </div>
    );
  }

  const lastStreamingIdx = isStreaming ? parsed.schools.length - 1 : -1;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Intro label */}
      <div className="flex items-center gap-2 text-xs text-ink-4">
        <span className="w-px h-3 bg-ink-4 inline-block" />
        各門派獨立解讀 · 典籍直接引用
      </div>

      {/* School accordion cards */}
      {parsed.schools.map((section, i) => (
        <SchoolCard
          key={section.school}
          section={section}
          refs={stream.refs}
          isOpen={effectiveOpen.has(section.school)}
          isStreaming={i === lastStreamingIdx && isStreaming}
          onToggle={() => toggle(section.school)}
        />
      ))}

      {/* Consensus */}
      {parsed.consensus && (
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-50/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-emerald-600 rounded-full" />
            <span className="text-xs font-bold text-emerald-700 tracking-wide">綜合共識</span>
          </div>
          <ClassicalMd text={parsed.consensus} />
        </div>
      )}

      {/* Rerun button */}
      {isDone && (
        <button onClick={() => stream.rerun()}
          className="text-xs text-ink-4 hover:text-vermillion underline transition-colors">
          重新生成
        </button>
      )}
    </div>
  );
}
