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
from zhconv import convert  # 繁体→简体 normalization (pure-python)

def to_simplified(text: str) -> str:
    """Normalize traditional Chinese to simplified so 繁体 books (≈12% of the
    corpus, incl. core 飞星派 titles) match the simplified query/keyword terms."""
    return convert(text, "zh-cn")

EXTRACTED_DIR = Path(__file__).parent.parent / "knowledge" / "extracted"
OUTPUT_FILE   = Path(__file__).parent.parent / "knowledge" / "chunks.json"

CHUNK_SIZE    = 500   # 目标字符数
CHUNK_OVERLAP = 80    # 相邻块重叠字符数，保留上下文

# 紫微斗数关键词表（用于 RAG 检索时匹配）
ZIWEI_KEYWORDS = [
    # 14 主星
    "紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴",
    "贪狼", "巨门", "天相", "天梁", "七杀", "破军",
    # 辅星
    "文昌", "文曲", "左辅", "右弼", "天魁", "天钺",
    "禄存", "擎羊", "陀罗", "火星", "铃星", "地空", "地劫",
    "化禄", "化权", "化科", "化忌",
    # 12 宫
    "命宫", "兄弟宫", "夫妻宫", "子女宫", "财帛宫", "疾厄宫",
    "迁移宫", "奴仆宫", "官禄宫", "田宅宫", "福德宫", "父母宫",
    # 四化
    "四化", "飞化", "自化",
    # 派别
    "三合派", "四化派", "飞星派", "中州派", "天同派",
    # 常用术语
    "大限", "小限", "流年", "流月", "命盘", "格局", "庙旺",
    "落陷", "入庙", "对宫", "三方四正", "桃花", "空宫",
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
_COMMON_CN = set(
    '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就'
    '分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得'
    '经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制'
    '机当使点从业本去把性好应开它合还因由其些然前外天政四日那义事平'
    '形相全表间样与关各重新线内数正心力月周明白长先然问但实几己见'
    # 紫微斗数 common prose chars
    '命宫财官夫疾迁福兄父田交星禄权科忌化飞格局运势析断论理数斗'
    '解盘推星派三四五六七八九十百千万年月日时'
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
            text = to_simplified(txt_file.read_text(encoding="utf-8"))
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
