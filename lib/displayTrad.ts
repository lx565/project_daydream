// Display-only Simplified -> Traditional for short case metadata (era, geju, sourceLabel).
// Never apply to values used for matching/lookup; 丑 and 里 are deliberately absent.
const MAP: Record<string, string> = Object.fromEntries(
  "实實详詳杀殺当當杂雜气氣禄祿阳陽从從财財伤傷贵貴辅輔驾駕国國简簡铸鑄绶綬势勢儿兒带帶为為权權寿壽纯純陈陳弃棄长長萤螢协協见見东東论論选選韦韋穑穡润潤强強轻輕两兩鉴鑑验驗专專库庫龙龍际際会會飞飛马馬归歸时時阴陰厨廚啸嘯"
    .match(/../gu)!.map((p) => [p[0], p[1]])
);

export function tradDisplay(s: string): string {
  return s.replace(/[一-鿿]/g, (c) => MAP[c] ?? c);
}
