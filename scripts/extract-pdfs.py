#!/usr/bin/env python3
"""
任务1：从 knowledge/sources/ 批量提取 PDF 文字
输出到 knowledge/extracted/<学派>/<书名>.txt

用法：python3 scripts/extract-pdfs.py
"""

import os
import subprocess
import sys
import pdfplumber
from pathlib import Path

SOURCES_DIR = Path(__file__).parent.parent / "knowledge" / "sources"
OUTPUT_DIR = Path(__file__).parent.parent / "knowledge" / "extracted"

def extract_pdf(pdf_path: Path, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pages_text = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages_text.append(f"[第{i+1}页]\n{text.strip()}")
                if (i + 1) % 50 == 0:
                    print(f"  进度：{i+1}/{total} 页", end="\r")
    except Exception as e:
        print(f"  ⚠️  读取失败：{e}")
        return False

    if not pages_text:
        print(f"  ⚠️  无文字内容（可能是扫描图片PDF）")
        return False

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(pages_text))

    size_kb = output_path.stat().st_size // 1024
    print(f"  ✅  {len(pages_text)} 页 → {size_kb}KB")
    return True

ANTIWORD = "/opt/homebrew/bin/antiword"
ANTIWORD_MAP = "UTF-8.txt"  # must be in ~/.antiword/

def extract_doc(doc_path: Path, output_path: Path):
    """Extract old .doc (OLE2) using antiword. Skips if antiword not installed or file fails."""
    if not os.path.exists(ANTIWORD):
        print(f"  ⏭️  antiword 未安装，跳过：{doc_path.name}")
        return False
    output_path.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [ANTIWORD, "-m", ANTIWORD_MAP, str(doc_path)],
        capture_output=True, timeout=60,
        env={**os.environ, "ANTIWORDHOME": str(Path.home() / ".antiword")}
    )
    if result.returncode != 0:
        err = result.stderr.decode("utf-8", errors="replace").strip()
        print(f"  ⚠️  antiword 失败：{err[:80]}")
        return False
    # Strip invalid UTF-8 bytes
    raw = result.stdout
    text = raw.decode("utf-8", errors="replace")
    chinese = sum(1 for c in text if '一' <= c <= '鿿')
    if chinese < 100:
        print(f"  ⚠️  提取内容过少（{chinese} 汉字），可能为WPS格式或图片文档")
        return False
    cleaned = text.encode("utf-8", errors="replace").decode("utf-8", errors="replace")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(cleaned)
    size_kb = output_path.stat().st_size // 1024
    print(f"  ✅  {chinese} 汉字 → {size_kb}KB")
    return True


def extract_txt(src_path: Path, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copy2(src_path, output_path)
    size_kb = output_path.stat().st_size // 1024
    print(f"  ✅  直接复制（文本文件）→ {size_kb}KB")
    return True

def extract_docx(docx_path: Path, output_path: Path):
    try:
        from docx import Document
    except ImportError:
        print(f"  ⏭️  python-docx 未安装，跳过：{docx_path.name}")
        return False
    output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        doc = Document(str(docx_path))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n".join(paragraphs)
        chinese = sum(1 for c in text if '一' <= c <= '鿿')
        if chinese < 100:
            print(f"  ⚠️  内容过少（{chinese} 汉字），可能为空文档")
            return False
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        size_kb = output_path.stat().st_size // 1024
        print(f"  ✅  {chinese} 汉字 → {size_kb}KB")
        return True
    except Exception as e:
        print(f"  ⚠️  读取失败：{e}")
        return False

def main():
    if not SOURCES_DIR.exists():
        print(f"❌ 找不到 sources 目录：{SOURCES_DIR}")
        sys.exit(1)

    total_ok = 0
    total_fail = 0

    for school_dir in sorted(SOURCES_DIR.iterdir()):
        if not school_dir.is_dir():
            continue
        school = school_dir.name
        print(f"\n📚 {school}")

        for src_file in sorted(school_dir.iterdir()):
            suffix = src_file.suffix.lower()
            if suffix not in (".pdf", ".txt", ".doc", ".docx"):
                print(f"  ⏭️  跳过（不支持格式）：{src_file.name}")
                continue

            stem = src_file.stem
            output_path = OUTPUT_DIR / school / f"{stem}.txt"

            if output_path.exists():
                print(f"  ⏭️  已存在，跳过：{src_file.name}")
                total_ok += 1
                continue

            print(f"  📄 {src_file.name}")

            if suffix == ".txt":
                ok = extract_txt(src_file, output_path)
            elif suffix == ".doc":
                ok = extract_doc(src_file, output_path)
            elif suffix == ".docx":
                ok = extract_docx(src_file, output_path)
            else:
                ok = extract_pdf(src_file, output_path)

            if ok:
                total_ok += 1
            else:
                total_fail += 1

    print(f"\n{'='*40}")
    print(f"完成：{total_ok} 成功，{total_fail} 失败")
    print(f"输出目录：{OUTPUT_DIR}")

if __name__ == "__main__":
    main()
