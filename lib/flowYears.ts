// Per-year 流年 (annual luck) computation via iztro's horoscope().
// Replaces the old hardcoded 四化 lookup table — gives real per-year 流年命宮,
// 流年四化, 流耀, and the 三方四正 of the 流年命宮.

import type { BirthInfo } from './ziwei';

export interface FlowYear {
  age: number;
  year: number;
  ganzhi: string;            // 流年干支 e.g. "丙戌"
  flowSoulPalace: string;    // 流年命宮 落在本命哪個宮 (palace name)
  natalStars: string[];      // major+minor stars sitting in that natal palace
  yearlyMutagen: string[];   // e.g. ["貪狼化祿","太陰化權","右弼化科","天機化忌"]
  flowStars: string[];       // 流耀 in the 流年命宮
  sanFang: { opposite: string; wealth: string; career: string; stars: string[] };
}

const MUTAGEN_LABELS = ['化祿', '化權', '化科', '化忌'];

/* eslint-disable @typescript-eslint/no-explicit-any */
const starNamesOf = (pal: any): string[] =>
  [...(pal?.majorStars ?? []), ...(pal?.minorStars ?? [])]
    .map((s: any) => s?.name as string)
    .filter(Boolean);

/**
 * Compute 流年 data for ages [fromAge, toAge] inclusive.
 * Re-instantiates the astrolabe from the stored birth info and queries iztro's
 * horoscope() for a mid-year date of each calendar year.
 */
export async function getFlowYears(
  birth: BirthInfo,
  fromAge: number,
  toAge: number
): Promise<FlowYear[]> {
  if (!birth?.solarDate || fromAge > toAge) return [];
  try {
    const { astro } = await import('iztro');
    const birthYear = parseInt(birth.solarDate.slice(0, 4), 10);
    const astrolabe: any = astro.bySolar(birth.solarDate, birth.timeIndex, birth.gender, true, "zh-TW");

    const out: FlowYear[] = [];
    for (let age = fromAge; age <= toAge; age++) {
      const year = birthYear + age;
      try {
        const h = astrolabe.horoscope(`${year}-06-01`);
        const y = h.yearly;
        const idx: number = y.index;
        const natalPalace = astrolabe.palaces?.[idx];

        const yearlyMutagen: string[] = (y.mutagen ?? [])
          .map((s: string, i: number) => (s ? `${s}${MUTAGEN_LABELS[i] ?? ''}` : ''))
          .filter(Boolean);

        const flowStars: string[] = (y.stars?.[idx] ?? [])
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
          age,
          year,
          ganzhi: `${y.heavenlyStem ?? ''}${y.earthlyBranch ?? ''}`,
          flowSoulPalace: natalPalace?.name ?? '',
          natalStars: starNamesOf(natalPalace),
          yearlyMutagen,
          flowStars,
          sanFang,
        });
      } catch { /* skip a single bad year, keep going */ }
    }
    return out;
  } catch (err) {
    console.error('[getFlowYears] iztro error:', err);
    return [];
  }
}

/** The deterministic 流年 facts a per-year reading must not contradict. Single source
 *  used both as generation grounding (flowyear route) and as validation facts (C). */
export function flowYearFactsFrom(flow: FlowYear): string {
  const pn = (n: string) => (n && !n.endsWith('宮') ? `${n}宮` : n);
  const sf = `對宮${pn(flow.sanFang.opposite)}、財帛位${pn(flow.sanFang.wealth)}、官祿位${pn(flow.sanFang.career)}` +
    (flow.sanFang.stars.length ? `（會照星曜：${flow.sanFang.stars.join('、')}）` : '');
  return `流年：${flow.year}年 ${flow.ganzhi}（${flow.age}歲）
流年命宮：落本命${pn(flow.flowSoulPalace)}（該宮星曜：${flow.natalStars.join('、') || '空宮'}）
流年四化：${flow.yearlyMutagen.join('、') || '—'}
流耀：${flow.flowStars.join('、') || '—'}
流年命宮三方四正：${sf}`;
}
