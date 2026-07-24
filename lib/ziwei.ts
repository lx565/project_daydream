import { assistBrightness } from './starBrightness';

export interface StarInfo {
  name: string;
  brightness: string; // 旺/廟/得/利/平/不/陷/''
  type: 'major' | 'minor' | 'adjective';
  mutagen: string; // 化祿/化權/化科/化忌 if present, else ''
}

export interface Palace {
  index: number;          // 0–11
  name: string;           // 命宮/兄弟宮/夫妻宮/子女宮/財帛宮/疾厄宮/遷移宮/交友宮/官祿宮/田宅宮/福德宮/父母宮
  earthlyBranch: string;  // 子醜寅卯辰巳午未申酉戌亥
  heavenlyStem: string;   // 甲乙丙丁戊己庚辛壬癸
  isBodyPalace: boolean;
  isSoulPalace: boolean;
  stars: StarInfo[];
  decadalAge: string;     // e.g. "3~12"
  decadalStem: string;    // heavenly stem of the decadal luck period
}

export interface BirthInfo {
  solarDate: string;        // YYYY-MM-DD (solar)
  timeIndex: number;        // iztro 時辰索引 0–12
  gender: '男' | '女';
}

export interface SanFangItem {
  opposite: string;         // 對宮 palace name
  wealth: string;           // 財帛位 palace name (三合)
  career: string;           // 官祿位 palace name (三合)
  stars: string[];          // major+minor stars across 對宮+財+官 (the 三方四正 minus 本宮)
}

export interface ZiweiResult {
  palaces: Palace[];         // all 12, in index order
  soulPalace: string;        // earthly branch of 命宮
  bodyPalace: string;        // earthly branch of 身宮
  fiveElementsClass: string; // 五行局 e.g. "木三局"
  mainStar: string;          // 命主
  bodyStar: string;          // 身主
  yearStem: string;          // 生年天干 (e.g. 己)
  laiYinPalace: string;      // 來因宮 — palace whose 宮幹 == 生年天干 (四化飛星 源頭宮)
  summary: string;
  birth: BirthInfo;          // so any route can recompute the astrolabe (流年/三方四正)
  sanFangSiZheng: Record<string, SanFangItem>; // keyed by palace name, for key palaces
}


function hourToShichen(hour: number): number {
  if (hour === 23 || hour === 0) return 0;
  return Math.ceil(hour / 2);
}

function fallbackResult(): ZiweiResult {
  return {
    palaces: [],
    soulPalace: '',
    bodyPalace: '',
    fiveElementsClass: '',
    mainStar: '',
    bodyStar: '',
    yearStem: '',
    laiYinPalace: '',
    summary: '',
    birth: { solarDate: '', timeIndex: 0, gender: '男' },
    sanFangSiZheng: {},
  };
}

export async function calculateZiwei(
  year: number,
  month: number,
  day: number,
  hour: number,
  gender: 'male' | 'female'
): Promise<ZiweiResult> {
  try {
    const { astro } = await import('iztro');
    const timeIndex = hourToShichen(hour);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const genderStr = gender === 'male' ? '男' : '女';

    // 5th param = language. iztro defaults to zh-CN (Simplified) if omitted —
    // this whole app is Traditional Chinese, so every palace/star/mutagen name
    // was silently rendering Simplified (財帛→财帛, 命宮→命宫, 交友→仆役, etc.)
    // until this was set explicitly. zh-TW is a first-class supported locale.
    const astrolabe = astro.bySolar(dateStr, timeIndex, genderStr, true, "zh-TW");

    const soulBranch: string = astrolabe.earthlyBranchOfSoulPalace ?? '';
    const bodyBranch: string = astrolabe.earthlyBranchOfBodyPalace ?? '';
    const raw = astrolabe as unknown as Record<string, unknown>;
    const fiveElementsClass: string = raw.fiveElementsClass as string ?? '';
    const mainStar: string = raw.soul as string ?? '';
    const bodyStar: string = raw.body as string ?? '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawPalaces: any[] = astrolabe.palaces ?? [];

    const palaces: Palace[] = rawPalaces.map((p: Record<string, unknown>) => {
      const majorStars: StarInfo[] = ((p.majorStars as Record<string, unknown>[]) ?? []).map(
        (s: Record<string, unknown>) => ({
          name: (s.name as string) ?? '',
          brightness: (s.brightness as string) ?? '',
          type: 'major' as const,
          mutagen: (s.mutagen as string) ?? '',
        })
      );

      const minorStars: StarInfo[] = ((p.minorStars as Record<string, unknown>[]) ?? []).map(
        (s: Record<string, unknown>) => {
          const name = (s.name as string) ?? '';
          // iztro leaves some assistant stars blank; fill from the sourced classical
          // table (祿存=廟, etc.) — never fabricated (see lib/starBrightness.ts).
          const brightness = ((s.brightness as string) || '')
            || assistBrightness(name, (p.earthlyBranch as string) ?? '');
          return { name, brightness, type: 'minor' as const, mutagen: (s.mutagen as string) ?? '' };
        }
      );

      const adjectiveStars: StarInfo[] = ((p.adjectiveStars as Record<string, unknown>[]) ?? []).map(
        (s: Record<string, unknown>) => ({
          name: (s.name as string) ?? '',
          brightness: (s.brightness as string) ?? '',
          type: 'adjective' as const,
          mutagen: (s.mutagen as string) ?? '',
        })
      );

      const decadal = p.decadal as Record<string, unknown> | undefined;
      // iztro's range is [number, number]; cast + serialize here so routes receive a proper string
      const decadalRange = decadal?.range as [number, number] | undefined;

      const palaceName: string = (p.name as string) ?? '';
      const palaceEarthlyBranch: string = (p.earthlyBranch as string) ?? '';

      return {
        index: (p.index as number) ?? 0,
        name: palaceName,
        earthlyBranch: palaceEarthlyBranch,
        heavenlyStem: (p.heavenlyStem as string) ?? '',
        isSoulPalace: palaceName === '命宮',
        isBodyPalace: palaceEarthlyBranch === bodyBranch,
        stars: [...majorStars, ...minorStars, ...adjectiveStars],
        decadalAge: Array.isArray(decadalRange) ? `${decadalRange[0]}~${decadalRange[1]}` : '',
        decadalStem: (decadal?.heavenlyStem as string) ?? '',
      };
    });

    // Sort by index ascending
    palaces.sort((a, b) => a.index - b.index);

    // 三方四正 (trine + opposition) for the key palaces, via iztro's surroundedPalaces.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const starNamesOf = (pal: any): string[] =>
      [...(pal?.majorStars ?? []), ...(pal?.minorStars ?? [])]
        .map((s: Record<string, unknown>) => s.name as string)
        .filter(Boolean);

    // Compute for all 12 palaces, keyed by iztro's palace name (note: iztro uses
    // short names like 財帛/官祿/遷移; only 命宮 carries the 宮 suffix).
    const sanFangSiZheng: Record<string, SanFangItem> = {};
    for (const p of palaces) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sp = (astrolabe as any).surroundedPalaces(p.index);
        sanFangSiZheng[p.name] = {
          opposite: sp?.opposite?.name ?? '',
          wealth: sp?.wealth?.name ?? '',
          career: sp?.career?.name ?? '',
          stars: [...new Set([
            ...starNamesOf(sp?.opposite),
            ...starNamesOf(sp?.wealth),
            ...starNamesOf(sp?.career),
          ])],
        };
      } catch { /* palace may be absent in edge charts; skip */ }
    }

    // 來因宮 — the palace whose 宮幹 equals the 生年天干 (四化飛星 源頭宮).
    const yearStem: string = (raw.rawDates as { chineseDate?: { yearly?: string[] } } | undefined)
      ?.chineseDate?.yearly?.[0] ?? '';
    const laiYinPalace: string = yearStem
      ? (palaces.find((p) => p.heavenlyStem === yearStem)?.name ?? '')
      : '';

    const summary = `命宮${soulBranch}宮，命主${mainStar}，身主${bodyStar}，${fiveElementsClass}。`;

    return {
      palaces,
      soulPalace: soulBranch,
      bodyPalace: bodyBranch,
      fiveElementsClass,
      mainStar,
      bodyStar,
      yearStem,
      laiYinPalace,
      summary,
      birth: { solarDate: dateStr, timeIndex, gender: genderStr as '男' | '女' },
      sanFangSiZheng,
    };
  } catch (err) {
    console.error('[calculateZiwei] iztro error:', err);
    return fallbackResult();
  }
}
