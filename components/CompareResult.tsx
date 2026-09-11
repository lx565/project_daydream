"use client";

import { useEffect, useState } from "react";
import HepanResultView, { type HepanCharts } from "./HepanResultView";
import { calculateBazi } from "@/lib/bazi";
import type { RelationshipType } from "@/lib/coupleTypes";
import type { PersonSnapshot } from "@/lib/compareInvite";

interface Props {
  personA: PersonSnapshot;
  personB: PersonSnapshot;
  relType: RelationshipType;
}

function personKey(p: PersonSnapshot): string {
  return `${p.date.replace(/-/g, "")}${p.hour}${p.gender}`;
}

async function computeCharts(personA: PersonSnapshot, personB: PersonSnapshot, relType: RelationshipType): Promise<HepanCharts> {
  const { calculateZiwei } = await import("@/lib/ziwei");
  const [ya, ma, da] = personA.date.split("-").map(Number);
  const [yb, mb, db] = personB.date.split("-").map(Number);

  const [baziA, ziweiA, baziB, ziweiB] = await Promise.all([
    Promise.resolve(calculateBazi(ya, ma, da, personA.hour, personA.gender)),
    calculateZiwei(ya, ma, da, personA.hour, personA.gender),
    Promise.resolve(calculateBazi(yb, mb, db, personB.hour, personB.gender)),
    calculateZiwei(yb, mb, db, personB.hour, personB.gender),
  ]);

  return {
    baziA, ziweiA, baziB, ziweiB,
    nameA: personA.name || undefined,
    nameB: personB.name || undefined,
    genderA: personA.gender, genderB: personB.gender,
    dateA: personA.date, hourA: personA.hour, dateB: personB.date, hourB: personB.hour,
    sessionId: `${personKey(personA)}_${personKey(personB)}_${relType}`,
    relType,
  };
}

export default function CompareResult({ personA, personB, relType }: Props) {
  const [charts, setCharts] = useState<HepanCharts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    computeCharts(personA, personB, relType)
      .then((c) => { if (!cancelled) setCharts(c); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-2">
        <p className="text-sm text-vermillion">排盤失敗，請重新整理頁面重試。</p>
      </div>
    );
  }

  if (!charts) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-2">
        <p className="text-sm text-ink-3">正在排盤…</p>
      </div>
    );
  }

  return <HepanResultView charts={charts} onReset={() => {}} />;
}
