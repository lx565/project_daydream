import type { Reference } from "@/lib/rag";

export interface SourceSection {
  id: string;
  label: string;
  /** Route calls the retrieval layer (getKnowledge/getSharedRetrieval). */
  usesKnowledge: boolean;
  status: "idle" | "streaming" | "done" | "error";
  refs: Reference[];
  /** false = restored from an older cache entry with no `refs` field. */
  refsRecorded: boolean;
}

export type ChipState = "ok" | "none" | "legacy";

export interface SourcesSummary {
  bookCount: number;
  covered: number;
  total: number;
  schools: { school: string; count: number }[];
  chips: { id: string; label: string; state: ChipState }[];
  bySchool: { school: string; books: { book: string; sections: string[] }[] }[];
}

export function summarizeSources(sections: SourceSection[]): SourcesSummary {
  const done = sections.filter((s) => s.usesKnowledge && s.status === "done");
  const chips: SourcesSummary["chips"] = [];
  const bookMap = new Map<string, { book: string; school: string; sections: string[] }>();
  let covered = 0;
  let total = 0;

  for (const s of done) {
    if (!s.refsRecorded) {
      chips.push({ id: s.id, label: s.label, state: "legacy" });
      continue;
    }
    total++;
    if (s.refs.length > 0) covered++;
    chips.push({ id: s.id, label: s.label, state: s.refs.length > 0 ? "ok" : "none" });
    for (const r of s.refs) {
      const k = `${r.school}\u0000${r.book}`;
      const e = bookMap.get(k) ?? { book: r.book, school: r.school, sections: [] };
      if (!e.sections.includes(s.label)) e.sections.push(s.label);
      bookMap.set(k, e);
    }
  }

  const schoolMap = new Map<string, { book: string; sections: string[] }[]>();
  for (const e of bookMap.values()) {
    const list = schoolMap.get(e.school) ?? [];
    list.push({ book: e.book, sections: e.sections });
    schoolMap.set(e.school, list);
  }
  const bySchool = [...schoolMap.entries()]
    .map(([school, books]) => ({ school, books }))
    .sort((a, b) => b.books.length - a.books.length);

  return {
    bookCount: bookMap.size,
    covered,
    total,
    schools: bySchool.map((g) => ({ school: g.school, count: g.books.length })),
    chips,
    bySchool,
  };
}
