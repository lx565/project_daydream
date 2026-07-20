#!/usr/bin/env python3
"""Surgical fixes for 4 QA-confirmed errors in 命格 articles."""
import json, os

BASE = os.path.join(os.path.dirname(__file__), "..", "content", "seo", "mingge")

def load(slug):
    with open(os.path.join(BASE, slug + ".json")) as f:
        return json.load(f)

def save(slug, d):
    with open(os.path.join(BASE, slug + ".json"), "w") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

# ── Fix 1: 紫府同宫格 ─────────────────────────────────────────────────────────
d = load("紫府同宫格")
md = d["markdown"]
md = md.replace("坐入命宫的寅宫或申宫", "坐入命宫的丑宫或未宫")
md = md.replace("命宫在寅或申，且紫微、天府同度，且两星均处于庙旺状态（寅申恰好是它们的最佳亮度位置）",
                "命宫在丑或未，且紫微、天府同度于此宫")
d["markdown"] = md
save("紫府同宫格", d)
print("✓ 紫府同宫格 fixed (寅申 → 丑未)")

# ── Fix 2: 日照雷门格 ─────────────────────────────────────────────────────────
d = load("日照雷门格")
md = d["markdown"]
# Find and replace the wrong paragraph about 天梁 being required
old_marker = "而且，命宫里不是只有太阳，它身边一定会陪伴着天梁星，这是固定的星曜组合。"
end_marker = "成就一番事业。"
if old_marker in md:
    idx_start = md.find(old_marker)
    idx_end = md.find(end_marker, idx_start)
    if idx_end >= 0:
        replacement = ("需要特别说明：日照雷门格的成格核心是太阳**独坐**命宫于卯宫"
                       "（独坐意指命宫唯太阳一颗主星，无其他主星同宫）。"
                       "古人认为太阳在卯宫如旭日东升，光芒照耀大地，"
                       "命主天生带有正气与领导力，能发挥光和热、成就一番事业。")
        md = md[:idx_start] + replacement + md[idx_end + len(end_marker):]
        print("✓ 日照雷门格 fixed (天梁非必要条件，独坐说明)")
    else:
        print("! 日照雷门格: could not find end_marker")
else:
    print("! 日照雷门格: old_marker not found")
d["markdown"] = md
save("日照雷门格", d)

# ── Fix 3: 日月反背格 ─────────────────────────────────────────────────────────
d = load("日月反背格")
md = d["markdown"]
# Fix ancient quote: 戌→酉, 辰→卯
# The 古诀 section has: 太阳在戌，太阴在辰
md = md.replace("成，太阳在戌，太阴在辰",
                "成，太阳在酉，太阴在卯")
# Fallback plain replace
if "太阳在戌，太阴在辰" in md:
    md = md.replace("太阳在戌，太阴在辰", "太阳在酉，太阴在卯")
    print("✓ 日月反背格 fixed (古诀 戌→酉, 辰→卯 in quote)")
else:
    print("! 日月反背格: quote replacement may have been done via unicode already")
# Fix the explanation that follows
if "太阳在戌（晚上8-9点），太阴在辰（早上8-9点）" in md:
    md = md.replace("太阳在戌（晚上8-9点），太阴在辰（早上8-9点）",
                    "太阳在酉（傍晚5-7点），太阴在卯（清晨5-7点）")
    print("✓ 日月反背格 fixed (explanation 戌→酉)")
elif "戌" in md:
    print(f"! 日月反背格: 戌 still found, context: {md[md.find('戌')-40:md.find('戌')+80]!r}")
d["markdown"] = md
save("日月反背格", d)

# ── Fix 4: 极居卯酉格 ─────────────────────────────────────────────────────────
d = load("极居卯酉格")
md = d["markdown"]
if "落陷" in md:
    md = md.replace(
        '紫微星在卵、酉宫本就处于“落陷”的位置，力量较弱，',
        '紫微星在卵、酉宫亮度为“平”，力量不及寅申宫旺地，'
    )
    # Fallback plain
    if "落陷" in md:
        md = md.replace(
            '紫微星在卯、酉宫本就处于“落陷”的位置，力量较弱，',
            '紫微星在卯、酉宫亮度为“平”，力量不及寅申宫旺地，'
        )
    if "落陷" in md:
        # last resort - simple
        md = md.replace('"落陷"的位置，力量较弱', '"平"，力量不及旺地')
    if "落陷" not in md:
        print("✓ 极居卯酉格 fixed (落陷 → 平)")
    else:
        print(f"! 极居卯酉格: 落陷 still found")
d["markdown"] = md
save("极居卯酉格", d)

print("\nAll done.")
