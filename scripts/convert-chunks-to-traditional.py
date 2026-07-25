#!/usr/bin/env python3
"""
One-time corpus conversion: knowledge/chunks.json Simplified -> Traditional.

Context: chunk-knowledge.py originally normalized every book to Simplified so
mixed-script OCR sources would match consistently. But the rest of the app
(iztro output via zh-TW, all TS-side school/star/palace constants) is
Traditional, so the corpus was silently mismatched against every query built
from ZiweiResult star/palace names, three of the ten school tags (飛星派/
古籍經典/倪師學派), and the EXCLUDED_SCHOOLS filter — see the 2026-07-25
reading-quality audit for the full trace. This flips the corpus to match the
app instead of the other way around.

Converts: id, school, book, text, keywords[] via OpenCC s2twp (Taiwan
Traditional with phrase-aware conversion — matches iztro's zh-TW locale).
chunk_idx is left untouched (int, not text).

Usage: python3 scripts/convert-chunks-to-traditional.py
Requires: pip3 install opencc-python-reimplemented
"""

import json
from pathlib import Path
from opencc import OpenCC

CHUNKS_FILE = Path(__file__).parent.parent / "knowledge" / "chunks.json"

cc = OpenCC("s2twp")


def main():
    with open(CHUNKS_FILE, encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"Converting {len(chunks)} chunks Simplified -> Traditional (s2twp)...")

    school_counts = {}
    for c in chunks:
        old_school = c["school"]
        school_counts[old_school] = school_counts.get(old_school, [0, None])
        school_counts[old_school][0] += 1

        c["id"] = cc.convert(c["id"])
        c["school"] = cc.convert(c["school"])
        c["book"] = cc.convert(c["book"])
        c["text"] = cc.convert(c["text"])
        c["keywords"] = [cc.convert(k) for k in c["keywords"]]

        school_counts[old_school][1] = c["school"]

    print("\nSchool tag changes:")
    for old, (count, new) in sorted(school_counts.items()):
        marker = "  (changed)" if old != new else ""
        print(f"  {old!r} -> {new!r}: {count} chunks{marker}")

    with open(CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False)

    print(f"\nWrote {CHUNKS_FILE}")


if __name__ == "__main__":
    main()
