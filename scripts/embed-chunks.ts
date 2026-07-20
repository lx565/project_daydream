/**
 * One-time ingest: embed every chunk in knowledge/chunks.json and write a
 * quantized int8 vector store aligned with chunks.json file order.
 *
 * Run:  GOOGLE_API_KEY=... npx tsx scripts/embed-chunks.ts
 *       (the key is loaded from .env.local automatically below)
 *
 * Output:
 *   knowledge/embeddings.i8        - Int8Array buffer, count*dim bytes
 *   knowledge/embeddings.meta.json - { model, dim, count }
 *
 * Resumable: if embeddings.i8 + a .progress file exist, it continues from the
 * last completed batch so an interrupted run doesn't restart from zero.
 */
import fs from "fs";
import path from "path";
import { embedDocuments, quantize, EMBED_MODEL, EMBED_DIM } from "../lib/embed";

// Load GOOGLE_API_KEY from .env.local (tsx doesn't auto-load it)
function loadEnv() {
  if (process.env.GOOGLE_API_KEY) return;
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const BATCH = 100;
const KNOWLEDGE = path.join(process.cwd(), "knowledge");
const OUT_BIN = path.join(KNOWLEDGE, "embeddings.i8");
const OUT_META = path.join(KNOWLEDGE, "embeddings.meta.json");
const PROGRESS = path.join(KNOWLEDGE, "embeddings.progress");

interface Chunk { id: string; text: string }

async function main() {
  const chunks = JSON.parse(fs.readFileSync(path.join(KNOWLEDGE, "chunks.json"), "utf-8")) as Chunk[];
  const count = chunks.length;
  console.log(`Embedding ${count} chunks with ${EMBED_MODEL} (dim=${EMBED_DIM}, batch=${BATCH})`);

  const buf = Buffer.alloc(count * EMBED_DIM); // int8 store
  let startBatch = 0;

  // Resume support
  if (fs.existsSync(OUT_BIN) && fs.existsSync(PROGRESS)) {
    const done = parseInt(fs.readFileSync(PROGRESS, "utf-8").trim(), 10);
    if (Number.isFinite(done) && done > 0) {
      const existing = fs.readFileSync(OUT_BIN);
      existing.copy(buf, 0, 0, Math.min(existing.length, buf.length));
      startBatch = done;
      console.log(`Resuming from batch ${startBatch} (${startBatch * BATCH} chunks already done)`);
    }
  }

  const totalBatches = Math.ceil(count / BATCH);
  const t0 = Date.now();

  for (let b = startBatch; b < totalBatches; b++) {
    const from = b * BATCH;
    const slice = chunks.slice(from, from + BATCH);
    let vecs: Float32Array[] = [];
    let attempt = 0;
    while (true) {
      try {
        vecs = await embedDocuments(slice.map((c) => c.text.slice(0, 2000)));
        break;
      } catch (err) {
        attempt++;
        const wait = Math.min(30000, 2000 * attempt);
        console.warn(`  batch ${b} failed (attempt ${attempt}): ${(err as Error).message}. retrying in ${wait}ms`);
        if (attempt >= 6) throw err;
        await new Promise((r) => setTimeout(r, wait));
      }
    }

    for (let i = 0; i < vecs.length; i++) {
      const q = quantize(vecs[i]);
      buf.set(q, (from + i) * EMBED_DIM);
    }

    // Persist incrementally so the run is resumable
    fs.writeFileSync(OUT_BIN, buf);
    fs.writeFileSync(PROGRESS, String(b + 1));

    if (b % 10 === 0 || b === totalBatches - 1) {
      const pct = (((b + 1) / totalBatches) * 100).toFixed(1);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  batch ${b + 1}/${totalBatches} (${pct}%)  ${from + slice.length}/${count} chunks  ${elapsed}s`);
    }
  }

  fs.writeFileSync(OUT_META, JSON.stringify({ model: EMBED_MODEL, dim: EMBED_DIM, count }, null, 2));
  if (fs.existsSync(PROGRESS)) fs.unlinkSync(PROGRESS);
  console.log(`Done. Wrote ${OUT_BIN} (${(buf.length / 1e6).toFixed(1)}MB) and ${OUT_META}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
