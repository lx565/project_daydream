#!/bin/bash
# Phase 2: Full OCR run on all image-only PDFs + rebuild knowledge base
# Bug fixed: EasyOCR now uses ["ch_sim", "en"] only (ch_tra cannot combine with ch_sim)
# Run from project root: bash scripts/ocr-phase2.sh

cd "$(dirname "$0")/.."

echo "=== Phase 2 OCR + Knowledge Rebuild ==="
echo "Started: $(date)"
echo "Books to OCR: $(python3 -c "
from pathlib import Path
S = Path('knowledge/sources')
E = Path('knowledge/extracted')
n = sum(1 for sc in S.iterdir() if sc.is_dir() for pdf in sc.glob('*.pdf') if not (E/sc.name/(pdf.stem+'.txt')).exists())
print(n)
") PDFs"
echo ""

echo "Running OCR on all unextracted PDFs..."
python3 scripts/ocr-scanned-pdfs.py 2>&1

echo ""
echo "=== OCR complete: $(date) ==="
echo ""
echo "Rebuilding knowledge chunks (chunks.json)..."
python3 scripts/chunk-knowledge.py 2>&1

echo ""
echo "=== Full pipeline complete: $(date) ==="
echo ""
echo "Summary:"
python3 -c "
import json
from pathlib import Path
chunks = json.loads(Path('knowledge/chunks.json').read_text())
from collections import Counter
schools = Counter(c.get('school','?') for c in chunks)
print(f'Total chunks: {len(chunks)}')
for school, count in sorted(schools.items(), key=lambda x: -x[1]):
    print(f'  {school}: {count} chunks')
"
