#!/bin/bash
# Run after all OCR/extraction is complete to rebuild the corpus and deploy.
# Usage: bash scripts/update-corpus.sh
set -e
cd "$(dirname "$0")/.."

echo "=== Step 1: Rebuild chunks.json ==="
python3 scripts/chunk-knowledge.py

echo ""
echo "=== Step 2: Rebuild embeddings ==="
npx tsx --env-file=.env.local scripts/embed-chunks.ts

echo ""
echo "=== Step 3: Deploy to production ==="
npx vercel --prod --yes

echo ""
echo "=== Done ==="
