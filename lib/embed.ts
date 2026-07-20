// Shared embedding helper used by both the offline ingest script and the
// runtime RAG query path, so document and query vectors are produced the
// SAME way (same model, same dimension, same normalization + quantization).
//
// Uses the REST embedContent endpoint directly: this key only exposes
// gemini-embedding-001 (embedContent / asyncBatchEmbedContent), not the SDK's
// synchronous batchEmbedContents. We request outputDimensionality=768 (MRL)
// and re-normalize, which keeps the vector store small (~13MB int8).

export const EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIM = 768;
export const QUANT_SCALE = 127;

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;

function apiKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY not set");
  return key;
}

/** L2-normalize so cosine similarity == dot product. */
export function normalize(vec: number[]): Float32Array {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

/** Quantize a unit vector to int8 (components in [-1,1] → [-127,127]). */
export function quantize(unit: Float32Array): Int8Array {
  const out = new Int8Array(unit.length);
  for (let i = 0; i < unit.length; i++) {
    out[i] = Math.max(-127, Math.min(127, Math.round(unit[i] * QUANT_SCALE)));
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function embedOne(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<Float32Array> {
  const url = `${ENDPOINT(EMBED_MODEL)}?key=${apiKey()}`;
  const body = JSON.stringify({
    model: `models/${EMBED_MODEL}`,
    content: { parts: [{ text }] },
    taskType,
    outputDimensionality: EMBED_DIM,
  });

  for (let attempt = 1; ; attempt++) {
    let retryable = false;
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (res.ok) {
        const j = (await res.json()) as { embedding: { values: number[] } };
        return normalize(j.embedding.values);
      }
      retryable = res.status === 429 || res.status >= 500;
      const detail = (await res.text()).slice(0, 160);
      if (!retryable || attempt >= 7) throw new Error(`embed ${res.status}: ${detail}`);
    } catch (e) {
      if (!retryable || attempt >= 7) throw e;
    }
    await sleep(Math.min(20000, 1500 * attempt));
  }
}

/** Embed a single query string → normalized Float32 vector. */
export function embedQuery(text: string): Promise<Float32Array> {
  return embedOne(text.slice(0, 2000), "RETRIEVAL_QUERY");
}

/** Concurrency-limited document embedding (used by ingest). */
export async function embedDocuments(texts: string[], concurrency = 12): Promise<Float32Array[]> {
  const out: Float32Array[] = new Array(texts.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= texts.length) break;
      out[i] = await embedOne(texts[i].slice(0, 2000), "RETRIEVAL_DOCUMENT");
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, texts.length) }, worker));
  return out;
}
