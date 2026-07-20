#!/usr/bin/env python3
"""
OCR pipeline for scanned image PDFs using pdftoppm + Tesseract.
(Replaces the old ocrmypdf approach — ocrmypdf is not installed.)

Tools required (both already installed via Homebrew):
  - pdftoppm  (part of poppler)
  - tesseract (with chi_sim + chi_tra language data)

Targets:
  knowledge/sources/八字命理/子平正解.pdf
  knowledge/sources/八字命理/秦伦诗-八字应用经验学.pdf
  knowledge/sources/其他名家/紫微斗数流年提要.pdf

Output → knowledge/extracted/<school>/<book>.txt

Usage:
  python3 scripts/ocr-scanned-pdfs.py
  python3 scripts/ocr-scanned-pdfs.py --book 子平正解
"""

import argparse
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.stdout.reconfigure(line_buffering=True)

ROOT     = Path(__file__).parent.parent
SOURCES  = ROOT / "knowledge" / "sources"
EXTRACTED = ROOT / "knowledge" / "extracted"

TARGETS = [
    # ── 八字命理 ──────────────────────────────────────────────────────────────
    {
        "pdf":    SOURCES / "八字命理" / "子平正解.pdf",
        "output": EXTRACTED / "八字命理" / "子平正解.txt",
    },
    {
        "pdf":    SOURCES / "八字命理" / "秦伦诗-八字应用经验学.pdf",
        "output": EXTRACTED / "八字命理" / "秦伦诗-八字应用经验学.txt",
    },
    {
        "pdf":    SOURCES / "八字命理" / "梁湘润-子平基础概要.pdf",
        "output": EXTRACTED / "八字命理" / "梁湘润-子平基础概要.txt",
    },
    {
        "pdf":    SOURCES / "八字命理" / "潘东光-八字批论选集.pdf",
        "output": EXTRACTED / "八字命理" / "潘东光-八字批论选集.txt",
    },
    {
        "pdf":    SOURCES / "八字命理" / "陈国日-命理金鉴.pdf",
        "output": EXTRACTED / "八字命理" / "陈国日-命理金鉴.txt",
    },
    {
        "pdf":    SOURCES / "八字命理" / "任铁樵-图解滴天髓(上).pdf",
        "output": EXTRACTED / "八字命理" / "任铁樵-图解滴天髓(上).txt",
    },
    {
        "pdf":    SOURCES / "八字命理" / "徐子平-渊海子平.pdf",
        "output": EXTRACTED / "八字命理" / "徐子平-渊海子平.txt",
    },
    # ── 天纪系列 ──────────────────────────────────────────────────────────────
    {
        "pdf":    SOURCES / "天纪系列" / "天纪-人间道.pdf",
        "output": EXTRACTED / "倪师学派" / "天纪-人间道.txt",
    },
    {
        "pdf":    SOURCES / "天纪系列" / "天纪-地脉道.pdf",
        "output": EXTRACTED / "倪师学派" / "天纪-地脉道.txt",
    },
    {
        "pdf":    SOURCES / "天纪系列" / "天纪-天机道.pdf",
        "output": EXTRACTED / "倪师学派" / "天纪-天机道.txt",
    },
    # ── 三合派 ────────────────────────────────────────────────────────────────
    {
        "pdf":    SOURCES / "三合派" / "王亭之-紫微斗数全集流年凶灾详析.pdf",
        "output": EXTRACTED / "三合派" / "王亭之-紫微斗数全集流年凶灾详析.txt",
    },
    {
        "pdf":    SOURCES / "三合派" / "陆斌兆+王亭之-星曜性质讲义.pdf",
        "output": EXTRACTED / "三合派" / "陆斌兆+王亭之-星曜性质讲义.txt",
    },
    # ── 四化派 ────────────────────────────────────────────────────────────────
    {
        "pdf":    SOURCES / "四化派" / "蔡明宏-华山钦天四化飞星秘仪.pdf",
        "output": EXTRACTED / "四化派" / "蔡明宏-华山钦天四化飞星秘仪.txt",
    },
    {
        "pdf":    SOURCES / "四化派" / "蔡明宏-紫微斗数悟我十八年.pdf",
        "output": EXTRACTED / "四化派" / "蔡明宏-紫微斗数悟我十八年.txt",
    },
    # ── 古籍经典 ──────────────────────────────────────────────────────────────
    {
        "pdf":    SOURCES / "古籍经典" / "南北山人-紫微斗数全书(明版今注).pdf",
        "output": EXTRACTED / "古籍经典" / "南北山人-紫微斗数全书(明版今注).txt",
    },
    {
        "pdf":    SOURCES / "古籍经典" / "陈希夷-紫微斗数全书(金星修订版).pdf",
        "output": EXTRACTED / "古籍经典" / "陈希夷-紫微斗数全书(金星修订版).txt",
    },
    {
        "pdf":    SOURCES / "古籍经典" / "潘国森-紫微斗数全书古诀辨正.pdf",
        "output": EXTRACTED / "古籍经典" / "潘国森-紫微斗数全书古诀辨正.txt",
    },
    # ── 八字命理（续）────────────────────────────────────────────────────────
    {
        "pdf":    SOURCES / "八字命理" / "李洪成-古今四柱6000例简析-丙丁年生命造1000例.pdf",
        "output": EXTRACTED / "八字命理" / "李洪成-古今四柱6000例简析-丙丁年生命造1000例.txt",
    },
    # ── 其他名家 ──────────────────────────────────────────────────────────────
    {
        "pdf":    SOURCES / "其他名家" / "紫微斗数流年提要.pdf",
        "output": EXTRACTED / "其他名家" / "紫微斗数流年提要.txt",
    },
    {
        "pdf":    SOURCES / "其他名家" / "张开卷-紫微斗数命理研究(上册).pdf",
        "output": EXTRACTED / "其他名家" / "张开卷-紫微斗数命理研究(上册).txt",
    },
    {
        "pdf":    SOURCES / "其他名家" / "张开卷-紫微斗数命理研究(下册).pdf",
        "output": EXTRACTED / "其他名家" / "张开卷-紫微斗数命理研究(下册).txt",
    },
    {
        "pdf":    SOURCES / "其他名家" / "慧心斋主-紫微斗数看钱财.pdf",
        "output": EXTRACTED / "其他名家" / "慧心斋主-紫微斗数看钱财.txt",
    },
    {
        "pdf":    SOURCES / "其他名家" / "未知-命理讲义绝密面授手稿2.pdf",
        "output": EXTRACTED / "其他名家" / "未知-命理讲义绝密面授手稿2.txt",
    },
    {
        "pdf":    SOURCES / "其他名家" / "梁湘润-术天机太乙金井紫微斗数.pdf",
        "output": EXTRACTED / "其他名家" / "梁湘润-术天机太乙金井紫微斗数.txt",
    },
    {
        "pdf":    SOURCES / "其他名家" / "潘子渔-紫微斗数经典.pdf",
        "output": EXTRACTED / "其他名家" / "潘子渔-紫微斗数经典.txt",
    },
]

DPI   = 200   # 200dpi: good balance of speed and OCR quality for printed books
LANGS = "chi_tra+chi_sim"
PSM   = 6     # assume a single uniform block of text per page
OEM   = 3     # LSTM engine


def count_cjk(text: str) -> int:
    return sum(1 for c in text if '一' <= c <= '鿿')


def ocr_pdf(pdf_path: Path, output_path: Path, force: bool = False) -> bool:
    if not pdf_path.exists():
        print(f"  ✗ PDF not found: {pdf_path}")
        return False

    # Skip if already have a high-quality extract (>20k CJK chars), unless --force
    if not force and output_path.exists():
        existing = count_cjk(output_path.read_text(errors="ignore"))
        if existing >= 20_000:
            print(f"\n⏭  {pdf_path.name}  — skip (already {existing:,} CJK chars)")
            return True

    size_mb = pdf_path.stat().st_size // (1024 * 1024)
    print(f"\n📄  {pdf_path.name}  ({size_mb}MB)", flush=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="ocr_") as tmpdir:
        tmp = Path(tmpdir)

        # Step 1 — render PDF pages to PPM images via pdftoppm
        print(f"  → Rendering at {DPI} DPI …", flush=True)
        t0 = time.time()
        r = subprocess.run(
            ["pdftoppm", "-r", str(DPI), str(pdf_path), str(tmp / "page")],
            capture_output=True, timeout=600,
        )
        if r.returncode != 0:
            print(f"  ✗ pdftoppm error: {r.stderr.decode()[:200]}")
            return False

        pages = sorted(tmp.glob("page-*.ppm")) or sorted(tmp.glob("page*.ppm"))
        print(f"  → {len(pages)} pages rendered in {time.time()-t0:.0f}s", flush=True)
        if not pages:
            print("  ✗ No page images — unexpected pdftoppm output")
            return False

        # Step 2 — OCR each page with Tesseract
        print(f"  → OCR with Tesseract ({LANGS}) …", flush=True)
        all_text: list[str] = []
        t1 = time.time()

        for idx, img in enumerate(pages, 1):
            r = subprocess.run(
                ["tesseract", str(img), "stdout",
                 "-l", LANGS, "--psm", str(PSM), "--oem", str(OEM)],
                capture_output=True, timeout=120,
            )
            if r.returncode != 0:
                print(f"  ⚠ page {idx} tesseract error: {r.stderr.decode()[:80]}")
                continue
            text = r.stdout.decode("utf-8", errors="replace").strip()
            if count_cjk(text) >= 10:
                all_text.append(f"[第{idx}页]\n{text}")

            if idx % 20 == 0:
                elapsed = time.time() - t1
                rate = idx / elapsed if elapsed > 0 else 1
                remaining = (len(pages) - idx) / rate
                print(f"  … {idx}/{len(pages)} pages (~{remaining:.0f}s left)", flush=True)

        elapsed_ocr = time.time() - t1
        print(f"  → OCR done in {elapsed_ocr:.0f}s — {len(all_text)}/{len(pages)} pages have text")

    if not all_text:
        print("  ✗ No readable text — scan quality may be too low")
        return False

    body = "\n\n".join(all_text)
    total_cjk = count_cjk(body)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(body)

    size_kb = output_path.stat().st_size // 1024
    print(f"  ✅  {total_cjk:,} CJK chars, {size_kb}KB → {output_path.relative_to(ROOT)}")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--book", help="Only process books whose filename contains this string")
    parser.add_argument("--force", action="store_true", help="Re-OCR even if output already exists with good quality")
    args = parser.parse_args()

    targets = TARGETS
    if args.book:
        targets = [t for t in TARGETS if args.book in t["pdf"].name]
        if not targets:
            print(f"No target matches --book '{args.book}'")
            sys.exit(1)

    print(f"OCR pipeline — {len(targets)} book(s)\n")
    t_start = time.time()
    results = []

    for t in targets:
        ok = ocr_pdf(t["pdf"], t["output"], force=args.force)
        results.append((t["pdf"].name, ok))

    print(f"\n{'='*50}")
    print(f"Total time: {(time.time()-t_start)/60:.1f} min\n")
    for name, ok in results:
        print(f"  {'✅' if ok else '✗'}  {name}")

    if any(not ok for _, ok in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
