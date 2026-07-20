#!/usr/bin/env python3
"""
Re-tag all 倪海厦 content from '天纪系列' / '其他名家' → '倪师学派'.
Edits knowledge/chunks.json in place. No re-embedding needed.
"""
import json
from pathlib import Path

PATH = Path("knowledge/chunks.json")

with open(PATH, encoding="utf-8") as f:
    chunks = json.load(f)

count = 0
for chunk in chunks:
    if chunk["school"] == "天纪系列":
        chunk["school"] = "倪师学派"
        count += 1
    elif chunk["school"] == "其他名家" and "天纪" in chunk.get("book", ""):
        chunk["school"] = "倪师学派"
        count += 1

print(f"Re-tagged {count} chunks → 倪师学派")

with open(PATH, "w", encoding="utf-8") as f:
    json.dump(chunks, f, ensure_ascii=False, separators=(",", ":"))

print("Done. Verify with:")
print("  python3 -c \"import json; c=json.load(open('knowledge/chunks.json')); print('倪师学派:', sum(1 for x in c if x['school']=='倪师学派'), '天纪系列:', sum(1 for x in c if x['school']=='天纪系列'))\"")
