const BR='子寅卯辰巳午未申酉戌亥已戍', ST='甲乙丙丁戊己庚辛壬癸';
const B=`[${ST}${BR}]`, SEP='[ \\t|\\n　、]?';
const COMP='宮時月年日土中位運限字刑合衝害破遙拱會暗庫';
export const RULES=[
  /(?<=→)醜|醜(?=→)/g,
  new RegExp(`(?<=${B}${SEP})醜`,'g'),
  new RegExp(`醜(?=${SEP}${B})`,'g'),
  new RegExp(`(?<=[已巳]西)醜`,'g'),
  new RegExp(`醜(?=[${COMP}])`,'g'),
  new RegExp(`醜(?=為[金水土陰陽艮官食])`,'g'),
  new RegExp(`(?<=[在於居入坐])醜(?![陋惡聞態怪事行話女男貌化類劣拙])`,'g'),
  new RegExp(`醜(?=[為是與便恃])`,'g'),
  new RegExp(`醜(?=上|地|支|安命|墓|絕|藏|屬|廟|旺|順|乃水|北方|溼|士|田宅|二宮|末|貴[無，。]|福)`,'g'),
  new RegExp(`(?<![不出])(?<=見|逢|安命|通根|夾|比|守|入|命在|月支|地支|地支為|支為)醜`,'g'),
  new RegExp(`(?<=太歲|流年|大限|月建|[在於居入坐臨落逢至])醜(?=[，。、；,.\\s)）》]|$)`,'g'),
  new RegExp(`(?<![美俊善好亮])(?<=(?:^|[\\s|、，。,.()（）：:;；\\n^◆]))醜(?=(?:$|[\\s|、，。,.()（）：:;；\\n]))`,'g'),
];
export function conv(s){let o=s;for(const r of RULES)o=o.replace(r,'丑');return o;}
