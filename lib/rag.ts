import path from "path";
import fs from "fs";
import { embedQuery, EMBED_DIM } from "./embed";

interface Chunk {
  id: string;
  school: string;
  book: string;
  chunk_idx: number;
  text: string;
  keywords: string[];
}

// All star/palace names we pre-index for text-level search
const PREINDEX_TERMS = [
  "紫微","天機","太陽","武曲","天同","廉貞","天府","太陰","貪狼","巨門",
  "天相","天梁","七殺","破軍","文昌","文曲","左輔","右弼","天魁","天鉞",
  "祿存","天馬","擎羊","陀羅","火星","鈴星","地空","地劫",
  "化祿","化權","化科","化忌",
  "命宮","財帛宮","官祿宮","夫妻宮","遷移宮","福德宮",
  "疾厄宮","子女宮","田宅宮","父母宮","兄弟宮","交友宮",
  "大限","流年","流月","流日","格局","三方四正","廟旺","落陷",
  "飛星","自化","生年四化","飛化","入宮","對宮",
  // 八字命理
  "日主","十神","正官","七殺","正財","偏財","食神","傷官",
  "比肩","劫財","正印","偏印","用神","喜用","大運","調候",
];

interface RAGIndex {
  kw: Map<string, number[]>;    // keyword → chunk indices
  text: Map<string, number[]>;  // pre-indexed term → chunk indices
}

// Schools excluded for copyright reasons — skipped at scoring time so that
// chunk indices stay aligned with the embeddings file (which is full file order).
// 易經風水 = 鐵板神數 lookup tables + 斷易天機 I Ching; 相學 = face reading.
// Neither is relevant to ziwei/bazi analysis; leaving them in NEUTRAL causes
// them to compete at 1.0x weight and contaminate results with unrelated content.
const EXCLUDED_SCHOOLS = new Set(["天紀系列", "易經風水", "相學"]);

// Book-level exclusion: some books are too OCR-corrupted to be usable even though
// their school is good. 方外人-開館人紫微斗數(四) is heavily mangled (本宮→封宮,
// 七殺→七毅, 會照→魯照…) yet passes the junk filter (wrong-but-valid CJK chars) and
// even ranks #1 semantically — poisoning results. Its sibling 方外人-河洛紫微斗數 is
// clean (traditional Chinese) and stays.
const EXCLUDED_BOOKS = new Set(["方外人-開館人紫微斗數(四)"]);

// Low-quality chunk filter: the source books include OCR-mangled scans, table-of-
// contents / page-number furniture, and number tables (鐵板神數). These are mostly
// non-Chinese or garbled and only add noise if fed to the model ("garbage in").
// We detect and skip them at scoring time (indices stay aligned with embeddings,
// no re-embedding needed). ~5% of the base.
function isLowQualityChunk(text: string): boolean {
  const t = (text ?? "").trim();
  if (t.length < 24) return true;
  const cjk = (t.match(/[一-鿿]/g) ?? []).length;
  const nonSpace = t.replace(/\s/g, "").length || 1;
  if (cjk / nonSpace < 0.5) return true; // mostly non-Chinese: TOC, tables, OCR dumps
  // Heavy non-standard punctuation/symbol density => OCR garble
  const weird = (t.match(/[^一-鿿　-〿，。、；：？！""''（）《》【】0-9a-zA-Z\s.\-]/g) ?? []).length;
  if (weird / t.length > 0.22) return true;
  return false;
}

let _junk: Set<number> | null = null;
function junkSet(): Set<number> {
  if (_junk) return _junk;
  const chunks = loadChunks();
  const set = new Set<number>();
  chunks.forEach((c, i) => { if (isLowQualityChunk(c.text)) set.add(i); });
  _junk = set;
  return set;
}

// Module-level singletons — loaded once per process
let _chunks: Chunk[] | null = null;
let _index: RAGIndex | null = null;
let _embeddings: Int8Array | null | undefined = undefined; // undefined=untried, null=unavailable

function loadChunks(): Chunk[] {
  if (_chunks) return _chunks;
  const filePath = path.join(process.cwd(), "knowledge", "chunks.json");
  if (!fs.existsSync(filePath)) return (_chunks = []);
  // Full file order, NO filtering here — keeps indices aligned with embeddings.
  _chunks = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Chunk[];
  return _chunks;
}

/** Load the quantized int8 vector store; null if missing/mismatched (→ lexical fallback). */
function loadEmbeddings(): Int8Array | null {
  if (_embeddings !== undefined) return _embeddings;
  try {
    const dir = path.join(process.cwd(), "knowledge");
    const metaPath = path.join(dir, "embeddings.meta.json");
    const binPath = path.join(dir, "embeddings.i8");
    if (!fs.existsSync(metaPath) || !fs.existsSync(binPath)) return (_embeddings = null);
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as { dim: number; count: number };
    const chunks = loadChunks();
    if (meta.dim !== EMBED_DIM || meta.count !== chunks.length) {
      console.warn(`[rag] embeddings meta mismatch (dim ${meta.dim}/${EMBED_DIM}, count ${meta.count}/${chunks.length}) — lexical only`);
      return (_embeddings = null);
    }
    const buf = fs.readFileSync(binPath);
    _embeddings = new Int8Array(buf.buffer, buf.byteOffset, buf.length);
    return _embeddings;
  } catch (e) {
    console.warn("[rag] failed to load embeddings:", (e as Error).message);
    return (_embeddings = null);
  }
}

function buildIndex(chunks: Chunk[]): RAGIndex {
  const kw = new Map<string, number[]>();
  const text = new Map<string, number[]>();

  chunks.forEach((chunk, idx) => {
    for (const k of chunk.keywords) {
      if (!kw.has(k)) kw.set(k, []);
      kw.get(k)!.push(idx);
    }
  });

  for (const term of PREINDEX_TERMS) {
    const hits: number[] = [];
    chunks.forEach((chunk, idx) => {
      if (chunk.text.includes(term)) hits.push(idx);
    });
    if (hits.length > 0) text.set(term, hits);
  }

  return { kw, text };
}

function loadIndex(): RAGIndex {
  if (_index) return _index;
  _index = buildIndex(loadChunks());
  return _index;
}

export type School = "三合派" | "四化派" | "飛星派" | "古籍經典" | "八字命理" | "其他名家" | "倪師學派";

export interface RagQuery {
  stars?: string[];
  palaces?: string[];
  topic?: string;
  /** Free-text (e.g. a chat question) added to the semantic query. */
  text?: string;
  school?: School | null;
  /** Only consider chunks from `school` (used for per-school cards). */
  strict?: boolean;
  topK?: number;
  maxPerBook?: number;
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  感情: ["夫妻宮", "桃花", "天同", "太陰", "廉貞", "貪狼", "合婚", "感情"],
  事業: ["官祿宮", "武曲", "七殺", "紫微", "天府", "事業", "財帛", "創業"],
  財運: ["財帛宮", "武曲", "天府", "祿存", "化祿", "財運", "投資"],
  健康: ["疾厄宮", "廉貞", "天機", "巨門", "健康", "疾病"],
  家庭: ["田宅宮", "父母宮", "子女宮", "兄弟宮", "天梁", "家庭"],
  貴人: ["天魁", "天鉞", "左輔", "右弼", "貴人"],
  格局: ["格局", "廟旺", "落陷", "三方四正", "對宮"],
  大限: ["大限", "小限", "流年", "流月", "運勢"],
};

// Books in these schools are reference/general; not penalized by the school
// filter. 其他名家 is huge (45% of the base) so it is dampened separately.
const NEUTRAL_SCHOOLS = new Set(["古籍經典", "八字命理", "其他名家", "相學", "易經風水", "倪師學派"]);
const OVERREPRESENTED_SCHOOLS = new Set(["其他名家"]);
const OVERREP_DAMPEN = 0.70;

// Hybrid weights: semantic primary, lexical as a precision bonus.
const W_SEMANTIC = 1.0;
const W_LEXICAL = 0.5;

export interface Reference {
  book: string;
  school: string;
}

export function extractReferences(chunks: Chunk[]): Reference[] {
  const seen = new Set<string>();
  return chunks
    .map((c) => ({ book: c.book, school: c.school }))
    .filter(({ book, school }) => {
      const key = `${book}::${school}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function formatChunksForPrompt(chunks: Chunk[]): string {
  if (chunks.length === 0) return "";
  return `以下是從命理典籍中檢索到的參考資料（來自古籍掃描，可能夾雜無關、殘缺或排版片段——請自行甄別，只採納與本命局真正相關的內容，其餘忽略）：\n\n${
    chunks.map((c) => `【${c.school}·${c.book}】\n${c.text}`).join("\n\n---\n\n")
  }`;
}

export interface KnowledgeResult {
  context: string;
  refs: Reference[];
  relevance: number;
  chunkCount: number;
}

// ── Shared retrieval context: embed once, score all chunks once ──────────────

interface RetrievalContext {
  chunks: Chunk[];
  queryTerms: Set<string>;
  cosine: Float32Array;   // per-chunk semantic score (0 if no embeddings)
  lexical: Float32Array;  // per-chunk normalized lexical score
  hasSemantic: boolean;
}

function buildQueryTerms(query: Pick<RagQuery, "stars" | "palaces" | "topic">): Set<string> {
  const terms = new Set<string>();
  (query.stars ?? []).forEach((s) => s && terms.add(s));
  (query.palaces ?? []).forEach((p) => p && terms.add(p));
  if (query.topic && TOPIC_KEYWORDS[query.topic]) {
    TOPIC_KEYWORDS[query.topic].forEach((k) => terms.add(k));
  }
  return terms;
}

function buildQueryText(query: Pick<RagQuery, "stars" | "palaces" | "topic" | "text">): string {
  const stars = (query.stars ?? []).filter(Boolean).join("、");
  const palaces = (query.palaces ?? []).filter(Boolean).join("、");
  const parts = ["紫微斗數命盤"];
  if (palaces) parts.push(`宮位：${palaces}`);
  if (stars) parts.push(`星曜：${stars}`);
  if (query.topic) parts.push(`主題：${query.topic}`);
  if (query.text) parts.push(`問題：${query.text}`);
  return parts.join("　");
}

/** Lexical score per chunk (sparse, via inverted index), normalized to ~0..1. */
function computeLexical(chunks: Chunk[], index: RAGIndex, queryTerms: Set<string>): Float32Array {
  const raw = new Float32Array(chunks.length);
  if (queryTerms.size === 0) return raw;

  const candidates = new Set<number>();
  for (const term of queryTerms) {
    (index.kw.get(term) ?? []).forEach((i) => candidates.add(i));
    (index.text.get(term) ?? []).forEach((i) => candidates.add(i));
  }
  for (const idx of candidates) {
    const chunk = chunks[idx];
    let s = 0;
    for (const kw of chunk.keywords) if (queryTerms.has(kw)) s += 1;
    for (const term of queryTerms) if (chunk.text.includes(term)) s += 0.5;
    raw[idx] = s;
  }
  // Normalize by a soft cap so it combines with cosine (0..1)
  const CAP = 4;
  for (let i = 0; i < raw.length; i++) raw[i] = Math.min(1, raw[i] / CAP);
  return raw;
}

/** Cosine score per chunk via int8 dot product (0 if embeddings unavailable). */
function computeCosine(chunks: Chunk[], queryVec: Float32Array | null): { cosine: Float32Array; has: boolean } {
  const cosine = new Float32Array(chunks.length);
  const emb = queryVec ? loadEmbeddings() : null;
  if (!queryVec || !emb) return { cosine, has: false };
  const dim = EMBED_DIM;
  for (let c = 0; c < chunks.length; c++) {
    let dot = 0;
    const base = c * dim;
    for (let d = 0; d < dim; d++) dot += queryVec[d] * emb[base + d];
    cosine[c] = dot / 127; // int8 docs were scaled by 127
  }
  return { cosine, has: true };
}

async function prepareRetrieval(query: RagQuery): Promise<RetrievalContext> {
  const chunks = loadChunks();
  const index = loadIndex();
  const queryTerms = buildQueryTerms(query);

  let queryVec: Float32Array | null = null;
  if (loadEmbeddings() && queryTerms.size > 0) {
    try {
      queryVec = await embedQuery(buildQueryText(query));
    } catch (e) {
      console.warn("[rag] query embed failed, lexical only:", (e as Error).message);
    }
  }

  const lexical = computeLexical(chunks, index, queryTerms);
  const { cosine, has } = computeCosine(chunks, queryVec);
  return { chunks, queryTerms, cosine, lexical, hasSemantic: has };
}

/** Select top chunks from a prepared context, with school filter + book diversity. */
function selectKnowledge(ctx: RetrievalContext, opts: Pick<RagQuery, "school" | "strict" | "topK" | "maxPerBook">): KnowledgeResult {
  const { chunks, cosine, lexical } = ctx;
  const topK = opts.topK ?? 8;
  const maxPerBook = opts.maxPerBook ?? 2;

  const junk = junkSet();
  const scored: { idx: number; score: number }[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (EXCLUDED_SCHOOLS.has(chunk.school)) continue;
    if (EXCLUDED_BOOKS.has(chunk.book)) continue; // OCR-corrupted, ranks high but garbled
    if (junk.has(i)) continue; // skip OCR noise / TOC / non-Chinese garbage

    if (opts.strict && opts.school && chunk.school !== opts.school) continue;

    let score = W_SEMANTIC * cosine[i] + W_LEXICAL * lexical[i];
    if (score <= 0) continue;

    // Soft school targeting (non-strict): downweight wrong, non-neutral schools
    if (!opts.strict && opts.school && chunk.school !== opts.school && !NEUTRAL_SCHOOLS.has(chunk.school)) {
      score *= 0.15;
    }
    // Dampen the over-represented 其他名家 so it stops flooding results
    if (OVERREPRESENTED_SCHOOLS.has(chunk.school)) score *= OVERREP_DAMPEN;
    // Mild dampen for 倪師學派: corpus includes off-topic 易經/地脈道 with semantic overlap
    if (chunk.school === "倪師學派") score *= 0.85;

    scored.push({ idx: i, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const bookCount = new Map<string, number>();
  const picked: Chunk[] = [];
  let relevance = 0;
  for (const s of scored) {
    const chunk = chunks[s.idx];
    const n = bookCount.get(chunk.book) ?? 0;
    if (n >= maxPerBook) continue;
    picked.push(chunk);
    bookCount.set(chunk.book, n + 1);
    relevance += s.score;
    if (picked.length >= topK) break;
  }

  return {
    context: formatChunksForPrompt(picked),
    refs: extractReferences(picked),
    relevance,
    chunkCount: picked.length,
  };
}

// ── Public API (async; semantic with lexical fallback) ───────────────────────

export async function getKnowledge(query: RagQuery): Promise<KnowledgeResult> {
  const ctx = await prepareRetrieval(query);
  if (ctx.queryTerms.size === 0) return { context: "", refs: [], relevance: 0, chunkCount: 0 };
  return selectKnowledge(ctx, query);
}

export async function getKnowledgeContext(query: RagQuery): Promise<string> {
  return (await getKnowledge(query)).context;
}

// ── Case-study retrieval (Tier 1) ────────────────────────────────────────────
// Books that contain real命造 case analyses (not just theory).
// Queried separately at reading time so that real chart examples surface
// alongside general knowledge — without competing with theory chunks.
const CASE_STUDY_BOOKS = new Set([
  "韋千里-千里命稿",
  "人鑑命理存驗五十例",
  "人鑒命理存驗",
  "四柱詳批命例精解",
  "八字例項詳解",
  "潘東光-八字批論選集",
  "李洪成-古今四柱6000例簡析-丙丁年生命造1000例",
]);

/**
 * Retrieve real命造 case excerpts from case-study books only.
 * Pass a free-text query built from the user's chart features:
 *   e.g. "甲木日主 傷官格 財星 案例 命造"
 */
export async function getCaseStudies(query: string, topK = 4): Promise<KnowledgeResult> {
  const ragQuery: RagQuery = { text: query, topK: topK * 4, maxPerBook: 2 };
  const ctx = await prepareRetrieval(ragQuery);
  if (ctx.queryTerms.size === 0) return { context: "", refs: [], relevance: 0, chunkCount: 0 };

  const { chunks, cosine, lexical } = ctx;
  const junk = junkSet();
  const scored: { idx: number; score: number }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (EXCLUDED_SCHOOLS.has(chunk.school)) continue;
    if (EXCLUDED_BOOKS.has(chunk.book)) continue;
    if (junk.has(i)) continue;
    if (!CASE_STUDY_BOOKS.has(chunk.book)) continue;

    const score = W_SEMANTIC * cosine[i] + W_LEXICAL * lexical[i];
    if (score <= 0) continue;
    scored.push({ idx: i, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const bookCount = new Map<string, number>();
  const picked: Chunk[] = [];
  let relevance = 0;
  for (const s of scored) {
    const chunk = chunks[s.idx];
    const n = bookCount.get(chunk.book) ?? 0;
    if (n >= 2) continue;
    picked.push(chunk);
    bookCount.set(chunk.book, n + 1);
    relevance += s.score;
    if (picked.length >= topK) break;
  }

  if (picked.length === 0) return { context: "", refs: [], relevance: 0, chunkCount: 0 };

  const context = `以下摘自命理古籍中的實際命造批註，僅作結構參考——不必逐條引用，只在與本命局有真正相似處時借鑑其斷法邏輯：\n\n${
    picked.map((c) => `【${c.book}】\n${c.text}`).join("\n\n---\n\n")
  }`;

  return {
    context,
    refs: extractReferences(picked),
    relevance,
    chunkCount: picked.length,
  };
}

// ── Shared multi-school retrieval (眾說/總覽 tabs) ────────────────────────────

/**
 * Shared prep for routes that need several school slices of the SAME chart
 * (overview, consensus, synthesis) — embeds once, scans once, returns a
 * selector.
 */
export async function getSharedRetrieval(query: Omit<RagQuery, "school" | "strict">) {
  const ctx = await prepareRetrieval(query);
  return {
    hasTerms: ctx.queryTerms.size > 0,
    select: (opts: Pick<RagQuery, "school" | "strict" | "topK" | "maxPerBook">) => selectKnowledge(ctx, opts),
  };
}
