import fs from "fs";
import path from "path";

export interface CaseRecord {
  id: string;           // e.g. "qianli-001"
  slug: string;         // same as id (URL path segment)
  source: string;       // book name from chunks.json
  sourceLabel: string;  // human-readable e.g. "韦千里《千里命稿》"
  rizi: string;         // "甲木" | "乙木" | ... | "癸水"
  geju: string;         // "食神格" | "正官格" | "" if unknown
  yongshen: string;     // "丙火" | "" if unknown
  bazi_text: string;    // "甲子 乙丑 甲午 庚申" | ""
  gender: "male" | "female" | "unknown";
  era: string;          // "民国" | "近代" | "古代" | "当代" | ""
  analysis: string;     // master's analysis verbatim
  prediction: string;   // extracted prediction
  outcome: string;      // outcome if stated, "" otherwise
}

export interface CaseIndexEntry {
  id: string;
  slug: string;
  source: string;
  rizi: string;
  geju: string;
  hasOutcome: boolean;
}

const CASES_DIR = path.join(process.cwd(), "content", "cases");

function readCaseFile(id: string): CaseRecord | null {
  try {
    const raw = fs.readFileSync(path.join(CASES_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as CaseRecord;
  } catch {
    return null;
  }
}

export function getCaseBySlug(slug: string): CaseRecord | null {
  return readCaseFile(slug);
}

export function loadCaseIndex(): CaseIndexEntry[] {
  try {
    const raw = fs.readFileSync(path.join(CASES_DIR, "index.json"), "utf-8");
    return JSON.parse(raw) as CaseIndexEntry[];
  } catch {
    return [];
  }
}

export function getAllCases(): CaseRecord[] {
  const index = loadCaseIndex();
  return index
    .map((e) => readCaseFile(e.id))
    .filter((c): c is CaseRecord => c !== null);
}

export function getCasesByRizi(rizi: string): CaseRecord[] {
  const index = loadCaseIndex();
  const matched = index.filter((e) => e.rizi === rizi);
  return matched
    .map((e) => readCaseFile(e.id))
    .filter((c): c is CaseRecord => c !== null);
}
