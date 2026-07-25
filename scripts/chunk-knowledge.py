#!/usr/bin/env python3
"""
任务2：把 knowledge/extracted/ 里的文本切分成 ~500字 的块
输出：knowledge/chunks.json

每个块的结构：
{
  "id": "三合派_陆斌兆_0042",
  "school": "三合派",
  "book": "陆斌兆-星曜性质讲义",
  "chunk_idx": 42,
  "text": "...",
  "keywords": ["紫微", "天机", ...]
}

用法：python3 scripts/chunk-knowledge.py
"""

import json
import re
from pathlib import Path
from opencc import OpenCC  # pip3 install opencc-python-reimplemented

# Normalize every book to Traditional (Taiwan, phrase-aware) so simplified-source
# books (≈88% of the corpus) match the app's Traditional queries — iztro's
# ZiweiResult is zh-TW, and every school/star/palace constant on the TS side
# (lib/rag.ts, sourcesData.ts, route prompts) is Traditional. Was previously the
# other direction (normalize to Simplified) until the 2026-07-25 audit found this
# silently zeroed out strict-school retrieval for 飛星派/古籍經典/倪師學派 and
# broke the EXCLUDED_SCHOOLS filter for 易經風水/相學 — see
# scripts/convert-chunks-to-traditional.py for the one-time corpus fix.
_cc = OpenCC("s2twp")

def to_traditional(text: str) -> str:
    return _cc.convert(text)

EXTRACTED_DIR = Path(__file__).parent.parent / "knowledge" / "extracted"
OUTPUT_FILE   = Path(__file__).parent.parent / "knowledge" / "chunks.json"

CHUNK_SIZE    = 500   # 目标字符数
CHUNK_OVERLAP = 80    # 相邻块重叠字符数，保留上下文

# 紫微斗數關鍵詞表（用於 RAG 檢索時匹配，須與 lib/rag.ts 的 PREINDEX_TERMS 同步）
ZIWEI_KEYWORDS = [
    # 14 主星
    "紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰",
    "貪狼", "巨門", "天相", "天梁", "七殺", "破軍",
    # 輔星
    "文昌", "文曲", "左輔", "右弼", "天魁", "天鉞",
    "祿存", "擎羊", "陀羅", "火星", "鈴星", "地空", "地劫",
    "化祿", "化權", "化科", "化忌",
    # 12 宮
    "命宮", "兄弟宮", "夫妻宮", "子女宮", "財帛宮", "疾厄宮",
    "遷移宮", "交友宮", "官祿宮", "田宅宮", "福德宮", "父母宮",
    # 四化
    "四化", "飛化", "自化",
    # 派別
    "三合派", "四化派", "飛星派", "中州派", "天同派",
    # 常用術語
    "大限", "小限", "流年", "流月", "命盤", "格局", "廟旺",
    "落陷", "入廟", "對宮", "三方四正", "桃花", "空宮",
    # NOTE: 天干地支 (甲乙丙…子丑寅…) intentionally NOT indexed as keywords —
    # no reading/chat query ever passes a raw 干支 as a search term, so they were
    # inert noise: 25% of chunks had ONLY 干支 keywords, diluting the lexical index
    # with terms that can never match. 八字 chunks still match via 日主/十神/用神/元素.
]

def extract_keywords(text: str) -> list[str]:
    found = []
    for kw in ZIWEI_KEYWORDS:
        if kw in text:
            found.append(kw)
    return found

MIN_CHINESE_RATIO = 0.15  # chunk must be ≥15% Chinese chars to be usable
MIN_CHUNK_LEN     = 60    # skip chunks shorter than this after stripping
MIN_COMMON_RATIO  = 0.05  # at least 5% of CJK chars must be high-frequency characters

# Top ~150 most frequent Chinese characters — present in all real prose.
# OCR garbage produces rare Unicode CJK chars that rarely appear here.
# Traditional forms — the corpus is normalized to Traditional (see to_traditional above).
_COMMON_CN = set(
    '的一是在不了有和人這中大為上個國我以要他時來用們生到作地於出就'
    '分對成會可主發年動同工也能下過子說產種面而方後多定行學法所民得'
    '經十三之進著等部度家電力裡如水化高自二理起小物現實加量都兩體制'
    '機當使點從業本去把性好應開它合還因由其些然前外天政四日那義事平'
    '形相全表間樣與關各重新線內數正心力月周明白長先然問但實幾己見'
    # 紫微斗數 common prose chars
    '命宮財官夫疾遷福兄父田交星祿權科忌化飛格局運勢析斷論理數斗'
    '解盤推星派三四五六七八九十百千萬年月日時'
)


def is_quality_chunk(chunk: str) -> bool:
    """Return True only if the chunk has enough coherent Chinese content to be useful."""
    if len(chunk) < MIN_CHUNK_LEN:
        return False
    chinese = [c for c in chunk if '一' <= c <= '鿿']
    if not chinese:
        return False
    # Basic Chinese ratio check
    if len(chinese) / len(chunk) < MIN_CHINESE_RATIO:
        return False
    # Coherence check: OCR garbage uses rare CJK chars; real text uses common ones.
    # Require ≥5% of CJK chars to be high-frequency characters.
    if len(chinese) > 30:
        common_count = sum(1 for c in chinese if c in _COMMON_CN)
        if common_count / len(chinese) < MIN_COMMON_RATIO:
            return False
    return True


def split_into_chunks(text: str) -> list[str]:
    """按段落优先切分，尽量在段落边界处断开"""
    # 去除页码标记行和OCR失败标记，保留正文
    text = re.sub(r'\[第\d+页\]\n?', '', text)
    text = re.sub(r'\[本页无法识别\]\n?', '', text)
    text = re.sub(r'\[EasyOCR 失败[^\]]*\]\n?', '', text)
    # 去除纯符号行（OCR噪声：每行只有符号/数字，无中文）
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned.append('')
            continue
        chinese_in_line = sum(1 for c in stripped if '一' <= c <= '鿿')
        # Keep line if it has any Chinese or is a short table separator
        if chinese_in_line > 0 or len(stripped) < 10:
            cleaned.append(line)
    text = '\n'.join(cleaned).strip()

    if not text:
        return []

    chunks = []
    start = 0
    length = len(text)

    while start < length:
        end = min(start + CHUNK_SIZE, length)

        # 如果还没到结尾，尝试在段落/句子边界处断开
        if end < length:
            # 优先：往后找换行
            newline_pos = text.rfind('\n', start, end)
            if newline_pos > start + CHUNK_SIZE // 2:
                end = newline_pos + 1
            else:
                # 其次：找句末标点
                for punct in ('。', '！', '？', '；', '\n'):
                    pos = text.rfind(punct, start, end)
                    if pos > start + CHUNK_SIZE // 2:
                        end = pos + 1
                        break

        chunk = text[start:end].strip()
        if chunk and is_quality_chunk(chunk):
            chunks.append(chunk)

        # 下一块从 (end - overlap) 开始，保留上下文
        start = max(end - CHUNK_OVERLAP, end) if end >= length else end - CHUNK_OVERLAP
        if start >= end:
            break

    return chunks

def make_id(school: str, book: str, idx: int) -> str:
    safe_school = re.sub(r'[^\w一-鿿]', '_', school)
    safe_book   = re.sub(r'[^\w一-鿿]', '_', book[:20])
    return f"{safe_school}_{safe_book}_{idx:04d}"

def main():
    if not EXTRACTED_DIR.exists():
        print(f"❌ 找不到 extracted 目录：{EXTRACTED_DIR}")
        return

    all_chunks = []
    total_files = 0
    total_chunks = 0

    for school_dir in sorted(EXTRACTED_DIR.iterdir()):
        if not school_dir.is_dir():
            continue
        school = school_dir.name
        school_count = 0

        for txt_file in sorted(school_dir.glob("*.txt")):
            book = txt_file.stem
            text = to_traditional(txt_file.read_text(encoding="utf-8"))
            chunks = split_into_chunks(text)

            for i, chunk_text in enumerate(chunks):
                all_chunks.append({
                    "id": make_id(school, book, i),
                    "school": school,
                    "book": book,
                    "chunk_idx": i,
                    "text": chunk_text,
                    "keywords": extract_keywords(chunk_text),
                })

            school_count += len(chunks)
            total_files += 1
            print(f"  [{school}] {book} → {len(chunks)} 块")

        total_chunks += school_count
        print(f"  📚 {school}：{school_count} 块\n")

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    size_kb = OUTPUT_FILE.stat().st_size // 1024
    print("=" * 40)
    print(f"完成：{total_files} 本书 → {total_chunks} 块 → {size_kb}KB")
    print(f"输出：{OUTPUT_FILE}")

if __name__ == "__main__":
    main()
