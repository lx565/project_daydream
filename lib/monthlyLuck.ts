// Deterministic 幸運色/方位 lookup, keyed off a ganzhi string's heavenly-stem
// element (e.g. "丙申" → stem 丙 → 火). Classical five-element color/direction
// correspondence — 土's direction (西南方) is one reasonable convention among
// several used across different schools, not unambiguous fact. Framed the
// same "僅供參考" way the rest of this app frames all divinatory content.

export interface MonthlyLuck {
  color: string;
  direction: string;
}

const ELEMENT_BY_STEM: Record<string, string> = {
  "甲": "木", "乙": "木",
  "丙": "火", "丁": "火",
  "戊": "土", "己": "土",
  "庚": "金", "辛": "金",
  "壬": "水", "癸": "水",
};

const LUCK_BY_ELEMENT: Record<string, MonthlyLuck> = {
  "木": { color: "綠色", direction: "東方" },
  "火": { color: "紅色", direction: "南方" },
  "土": { color: "黃色", direction: "西南方" },
  "金": { color: "金色", direction: "西方" },
  "水": { color: "藍色", direction: "北方" },
};

/** Looks up 幸運色/方位 from a ganzhi string's first character (the stem).
 *  Falls back to 土's luck if the stem is somehow unrecognized (defensive —
 *  should never happen for a real iztro-produced ganzhi). */
export function monthlyLuck(ganzhi: string): MonthlyLuck {
  const stem = ganzhi.charAt(0);
  const element = ELEMENT_BY_STEM[stem] ?? "土";
  return LUCK_BY_ELEMENT[element];
}
