"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type LibraryCategory = "mingge" | "star" | "palace" | "guide" | "famous" | "personality" | "books" | "sources" | "bazi" | "zodiac" | "qinggan" | "sihua" | "xiong" | "liunian" | "huangli" | "hunyin" | "shiye" | "caiyun" | "jibing" | "cases";

interface LibraryNavProps {
  category: LibraryCategory;
  currentTitle?: string;
}

type Tab = { key: LibraryCategory; label: string; href: string };

// Grouped into 5 named menus mirroring /library's intent-based groups. Rendering
// all 18 links inline overflowed the bar and clipped the active tab (worst case:
// the one item the reader needs to see). 5 triggers always fit, and the group
// names carry meaning the old bare dividers did not.
const TAB_GROUPS: { label: string; tabs: Tab[] }[] = [
  {
    label: "基礎",
    tabs: [
      { key: "mingge", label: "格局",  href: "/mingge" },
      { key: "star",   label: "星曜",  href: "/star"   },
      { key: "palace", label: "宮位",  href: "/palace" },
      { key: "famous", label: "名人",  href: "/famous" },
    ],
  },
  {
    label: "八字",
    tabs: [
      { key: "bazi",    label: "八字知識庫", href: "/bazi"    },
      { key: "books",   label: "書單",      href: "/books"   },
      { key: "sources", label: "典籍",      href: "/sources" },
    ],
  },
  {
    label: "生活",
    tabs: [
      { key: "hunyin",  label: "婚姻", href: "/hunyin"  },
      { key: "shiye",   label: "事業", href: "/shiye"   },
      { key: "caiyun",  label: "財運", href: "/caiyun"  },
      { key: "jibing",  label: "健康", href: "/jibing"  },
      { key: "qinggan", label: "感情", href: "/qinggan" },
    ],
  },
  {
    label: "運勢",
    tabs: [
      { key: "huangli", label: "黃曆", href: "/huangli" },
      { key: "sihua",   label: "四化", href: "/sihua"   },
      { key: "liunian", label: "流年", href: "/liunian" },
      { key: "xiong",   label: "凶象", href: "/xiong"   },
    ],
  },
  {
    label: "學習",
    tabs: [
      { key: "guide",       label: "學習中心", href: "/guide"       },
      { key: "personality", label: "紫微×MBTI", href: "/personality" },
      { key: "zodiac",      label: "紫微×星座", href: "/zodiac"      },
    ],
  },
];

export default function LibraryNav({ category, currentTitle }: LibraryNavProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape — a sticky nav left open would sit on
  // top of the article the reader just navigated to.
  useEffect(() => {
    if (openIdx === null) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenIdx(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIdx(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openIdx]);

  return (
    <div ref={navRef} className="border-b border-border-warm bg-paper-2/60 backdrop-blur-sm sticky top-0 z-40">
      {/* Row 1: breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-2 pb-1 flex items-center gap-1.5 text-xs text-ink-4 min-w-0">
        <Link href="/" className="hover:text-vermillion transition-colors shrink-0">命裡</Link>
        <span className="text-ink-4/50">/</span>
        <Link href="/library" className="hover:text-vermillion transition-colors shrink-0">知識庫</Link>
        {currentTitle && (
          <>
            <span className="text-ink-4/50">/</span>
            <span className="text-ink-3 truncate">{currentTitle}</span>
          </>
        )}
      </div>

      {/* Row 2: grouped dropdown menus */}
      <div className="max-w-4xl mx-auto px-4 border-t border-border-light/30">
        <div className="flex items-center gap-1">
          {TAB_GROUPS.map((group, gi) => {
            const isActiveGroup = group.tabs.some(t => t.key === category);
            const isOpen = openIdx === gi;
            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : gi)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-1 py-2 px-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                    isActiveGroup
                      ? "text-vermillion border-vermillion"
                      : "text-ink-3 border-transparent hover:text-ink-2"
                  }`}
                >
                  {group.label}
                  <span className={`text-[9px] transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                </button>

                {/* Always rendered, visibility toggled via CSS — NOT conditionally
                    mounted. These are the site's primary internal links; with
                    `{isOpen && ...}` they were absent from the server-rendered
                    HTML entirely (verified: 書單/學習中心 had 0 occurrences),
                    so crawlers would never see them and the internal-link equity
                    this nav exists to pass would be lost. */}
                <div
                  className={`absolute left-0 top-full mt-0.5 min-w-[9rem] rounded-lg border border-border-warm bg-paper shadow-lg py-1 z-50 ${
                    isOpen ? "block" : "hidden"
                  }`}
                >
                  {group.tabs.map(tab => (
                    <Link
                      key={tab.key}
                      href={tab.href}
                      onClick={() => setOpenIdx(null)}
                      className={`block px-3 py-2 text-xs whitespace-nowrap transition-colors ${
                        category === tab.key
                          ? "text-vermillion font-semibold bg-vermillion-l/40"
                          : "text-ink-3 hover:text-vermillion hover:bg-paper-2"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
