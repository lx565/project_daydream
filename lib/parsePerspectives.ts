export type PerspectiveSchool = "三合派" | "四化派" | "飛星派" | "古籍經典" | "倪師學派";

export interface SchoolSection {
  school: PerspectiveSchool;
  text: string;
}

export interface ParsedPerspectives {
  schools: SchoolSection[];
  consensus: string;
  hasMarkers: boolean;
}

const SCHOOLS: PerspectiveSchool[] = ["三合派", "四化派", "飛星派", "古籍經典", "倪師學派"];
const schoolMarker = (s: string) => `### 【${s}】`;
const CONSENSUS_MARKER = "## 綜合共識";

export function parsePerspectives(fullText: string): ParsedPerspectives {
  type Marker = { pos: number; school?: PerspectiveSchool; consensus?: true };
  const markers: Marker[] = [];

  for (const school of SCHOOLS) {
    const m = schoolMarker(school);
    const pos = fullText.indexOf(m);
    if (pos >= 0) markers.push({ pos, school });
  }

  const consPos = fullText.indexOf(CONSENSUS_MARKER);
  if (consPos >= 0) markers.push({ pos: consPos, consensus: true });

  if (markers.length === 0) return { schools: [], consensus: "", hasMarkers: false };

  markers.sort((a, b) => a.pos - b.pos);

  const schools: SchoolSection[] = [];
  let consensus = "";

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const end = i + 1 < markers.length ? markers[i + 1].pos : fullText.length;

    if (m.consensus) {
      consensus = fullText.slice(m.pos + CONSENSUS_MARKER.length, end).trim();
    } else if (m.school) {
      const text = fullText.slice(m.pos + schoolMarker(m.school).length, end).trim();
      schools.push({ school: m.school, text });
    }
  }

  return { schools, consensus, hasMarkers: true };
}
