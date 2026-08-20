// Per-month 流月 (monthly luck) computation via iztro's horoscope().
// Mirrors lib/flowYears.ts's pattern, but reads h.monthly instead of h.yearly
// and iterates calendar months (not birth-relative ages) — flow-month theory
// is keyed to a calendar date, not an age.

import type { BirthInfo } from './ziwei';

export interface FlowMonth {
  year: number;
  month: number;               // 1–12, calendar month
  ganzhi: string;               // 流月干支 e.g. "丙戌"
  flowSoulPalace: string;       // 流月命宮 落在本命哪個宮 (palace name)
  natalStars: string[];         // major+minor stars sitting in that natal palace
  monthlyMutagen: string[];     // e.g. ["貪狼化祿","太陰化權","右弼化科","天機化忌"]
  flowStars: string[];          // 流耀 in the 流月命宮
  sanFang: { opposite: string; wealth: string; career: string; stars: string[] };
}

const MUTAGEN_LABELS = ['化祿', '化權', '化科', '化忌'];

/* eslint-disable @typescript-eslint/no-explicit-any */
const starNamesOf = (pal: any): string[] =>
  [...(pal?.majorStars ?? []), ...(pal?.minorStars ?? [])]
    .map((s: any) => s?.name as string)
    .filter(Boolean);

/**
 * Compute 流月 data for the next `monthsAhead` calendar months starting from
 * the current month (index 0 = this month). Re-instantiates the astrolabe
 * from the stored birth info and queries iztro's horoscope() for the 15th of
 * each target month (a safe mid-month date for all 12 months).
 */
export async function getFlowMonths(
  birth: BirthInfo,
  monthsAhead: number
): Promise<FlowMonth[]> {
  if (!birth?.solarDate || monthsAhead < 1) return [];
  try {
    const { astro } = await import('iztro');
    const astrolabe: any = astro.bySolar(birth.solarDate, birth.timeIndex, birth.gender, true, "zh-TW");

    const now = new Date();
    const out: FlowMonth[] = [];
    for (let i = 0; i < monthsAhead; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 15);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      try {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-15`;
        const h = astrolabe.horoscope(dateStr);
        const m = h.monthly;
        const idx: number = m.index;
        const natalPalace = astrolabe.palaces?.[idx];

        const monthlyMutagen: string[] = (m.mutagen ?? [])
          .map((s: string, mi: number) => (s ? `${s}${MUTAGEN_LABELS[mi] ?? ''}` : ''))
          .filter(Boolean);

        const flowStars: string[] = (m.stars?.[idx] ?? [])
          .map((s: any) => s?.name as string)
          .filter(Boolean);

        let sanFang = { opposite: '', wealth: '', career: '', stars: [] as string[] };
        try {
          const sp = astrolabe.surroundedPalaces(idx);
          sanFang = {
            opposite: sp?.opposite?.name ?? '',
            wealth: sp?.wealth?.name ?? '',
            career: sp?.career?.name ?? '',
            stars: [...new Set([
              ...starNamesOf(sp?.opposite),
              ...starNamesOf(sp?.wealth),
              ...starNamesOf(sp?.career),
            ])],
          };
        } catch { /* skip surround on edge charts */ }

        out.push({
          year,
          month,
          ganzhi: `${m.heavenlyStem ?? ''}${m.earthlyBranch ?? ''}`,
          flowSoulPalace: natalPalace?.name ?? '',
          natalStars: starNamesOf(natalPalace),
          monthlyMutagen,
          flowStars,
          sanFang,
        });
      } catch { /* skip a single bad month, keep going */ }
    }
    return out;
  } catch (err) {
    console.error('[getFlowMonths] iztro error:', err);
    return [];
  }
}

/** The deterministic 流月 facts a per-month reading must not contradict. */
export function flowMonthFactsFrom(flow: FlowMonth): string {
  const pn = (n: string) => (n && !n.endsWith('宮') ? `${n}宮` : n);
  const sf = `對宮${pn(flow.sanFang.opposite)}、財帛位${pn(flow.sanFang.wealth)}、官祿位${pn(flow.sanFang.career)}` +
    (flow.sanFang.stars.length ? `（會照星曜：${flow.sanFang.stars.join('、')}）` : '');
  return `流月：${flow.year}年${flow.month}月 ${flow.ganzhi}
流月命宮：落本命${pn(flow.flowSoulPalace)}（該宮星曜：${flow.natalStars.join('、') || '空宮'}）
流月四化：${flow.monthlyMutagen.join('、') || '—'}
流耀：${flow.flowStars.join('、') || '—'}
流月命宮三方四正：${sf}`;
}
