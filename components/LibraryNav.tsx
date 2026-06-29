"use client";

import Link from "next/link";

export type LibraryCategory = "mingge" | "star" | "palace" | "guide" | "famous" | "personality" | "books" | "sources" | "bazi" | "zodiac" | "qinggan" | "sihua" | "xiong" | "liunian" | "hunyin" | "shiye" | "caiyun" | "jibing" | "cases";

interface LibraryNavProps {
  category: LibraryCategory;
  currentTitle?: string;
}

type Tab = { key: LibraryCategory; label: string; href: string };

const TAB_GROUPS: { tabs: Tab[] }[] = [
  {
    tabs: [
      { key: "mingge", label: "格局",  href: "/mingge" },
      { key: "star",   label: "星曜",  href: "/star"   },
      { key: "palace", label: "宫位",  href: "/palace" },
      { key: "famous", label: "名人",  href: "/famous" },
    ],
  },
  {
    tabs: [
      { key: "bazi",    label: "八字", href: "/bazi"    },
      { key: "cases",   label: "命造案例", href: "/cases" },
      { key: "books",   label: "书单", href: "/books"   },
      { key: "sources", label: "典籍", href: "/sources" },
    ],
  },
  {
    tabs: [
      { key: "hunyin",  label: "婚姻", href: "/hunyin"  },
      { key: "shiye",   label: "事业", href: "/shiye"   },
      { key: "caiyun",  label: "财运", href: "/caiyun"  },
      { key: "jibing",  label: "健康", href: "/jibing"  },
      { key: "qinggan", label: "感情", href: "/qinggan" },
    ],
  },
  {
    tabs: [
      { key: "sihua",   label: "四化", href: "/sihua"   },
      { key: "liunian", label: "流年", href: "/liunian" },
      { key: "xiong",   label: "凶象", href: "/xiong"   },
    ],
  },
  {
    tabs: [
      { key: "guide",       label: "学习",  href: "/guide"       },
      { key: "personality", label: "×MBTI", href: "/personality" },
      { key: "zodiac",      label: "×星座", href: "/zodiac"      },
    ],
  },
];

export default function LibraryNav({ category, currentTitle }: LibraryNavProps) {
  return (
    <div className="border-b border-border-warm bg-paper-2/60 backdrop-blur-sm sticky top-0 z-40">
      {/* Row 1: breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-2 pb-1 flex items-center gap-1.5 text-xs text-ink-4 min-w-0">
        <Link href="/" className="hover:text-vermillion transition-colors shrink-0">命里</Link>
        <span className="text-ink-4/50">/</span>
        <Link href="/library" className="hover:text-vermillion transition-colors shrink-0">知识库</Link>
        {currentTitle && (
          <>
            <span className="text-ink-4/50">/</span>
            <span className="text-ink-3 truncate">{currentTitle}</span>
          </>
        )}
      </div>

      {/* Row 2: grouped tabs */}
      <div className="max-w-4xl mx-auto px-4 border-t border-border-light/30 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {TAB_GROUPS.map((group, gi) => (
            <div key={gi} className="flex items-center gap-1">
              {gi > 0 && (
                <span className="w-px h-3 bg-border-warm mx-2 flex-shrink-0" />
              )}
              {group.tabs.map(tab => (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`py-2 px-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                    category === tab.key
                      ? "text-vermillion border-vermillion"
                      : "text-ink-3 border-transparent hover:text-ink-2"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
