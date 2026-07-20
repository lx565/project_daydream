// Check which formations famous historical/cultural figures have
import { calculateZiwei } from '../lib/ziwei.ts';
import { detectMingge } from '../lib/detectMingge.ts';

const people = [
  // Already in production
  { name: '李小龙',    year:1940, month:11, day:27, hour:7,  gender:'male'   }, // Bruce Lee, 卯时
  // New candidates
  { name: '张国荣',    year:1956, month:9,  day:12, hour:23, gender:'male'   }, // Leslie Cheung, 子时
  { name: '邓丽君',    year:1953, month:1,  day:29, hour:11, gender:'female' }, // Teresa Teng, 午时
  { name: '梅艳芳',    year:1963, month:10, day:10, hour:11, gender:'female' }, // Anita Mui, 午时
  { name: '金庸',      year:1924, month:3,  day:10, hour:5,  gender:'male'   }, // Jin Yong, 卯时
  { name: '成龙',      year:1954, month:4,  day:7,  hour:7,  gender:'male'   }, // Jackie Chan, 卯时
  { name: '王菲',      year:1969, month:8,  day:8,  hour:7,  gender:'female' }, // Faye Wong, 卯时
  { name: '马云',      year:1964, month:9,  day:10, hour:9,  gender:'male'   }, // Jack Ma, 巳时
  { name: '周杰伦',    year:1979, month:1,  day:18, hour:7,  gender:'male'   }, // Jay Chou, 卯时
  { name: '马斯克',    year:1971, month:6,  day:28, hour:7,  gender:'male'   }, // Elon Musk, 卯时
  { name: '拿破仑',    year:1769, month:8,  day:15, hour:11, gender:'male'   }, // Napoleon, 午时
  { name: '林徽因',    year:1904, month:6,  day:10, hour:7,  gender:'female' }, // Lin Huiyin, 辰时
  { name: '居里夫人',  year:1867, month:11, day:7,  hour:11, gender:'female' }, // Marie Curie, 午时
  { name: '贝多芬',    year:1770, month:12, day:16, hour:3,  gender:'male'   }, // Beethoven, 丑时
  { name: '乔布斯',    year:1955, month:2,  day:24, hour:7,  gender:'male'   }, // Steve Jobs, 卯时
  { name: '李连杰',    year:1963, month:4,  day:26, hour:7,  gender:'male'   }, // Jet Li, 卯时
];

for (const p of people) {
  const z = await calculateZiwei(p.year, p.month, p.day, p.hour, p.gender);
  const formations = detectMingge(z.palaces);
  const soul = z.palaces.find(pl => pl.isSoulPalace);
  const ms = soul?.stars.filter(s=>s.type==='major').map(s=>s.name).join('·') || '空宫';
  const label = formations.length ? '✓ ' + formations.map(f=>f.name).join('、') : '—';
  console.log(p.name.padEnd(12) + '| 命宫('+soul?.earthlyBranch+'):'+ms.padEnd(16)+'| '+label);
}
