import fs from 'fs';
import path from 'path';

const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge');

function readFile(relativePath: string): string | null {
  try {
    return fs.readFileSync(path.join(KNOWLEDGE_DIR, relativePath), 'utf-8');
  } catch {
    return null;
  }
}

// Strip HTML comments and check if content is non-empty
function cleanContent(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '').trim();
}

function hasContent(text: string): boolean {
  return cleanContent(text).length > 10;
}

// Extract text under "### {heading}" until next ### or ## or end
function extractSection(content: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`###\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=(?:###|##)|$)`);
  const match = content.match(regex);
  if (!match) return null;
  const cleaned = cleanContent(match[1]);
  return cleaned.length > 10 ? cleaned : null;
}

// Extract the intro paragraph (between the bold metadata line and the first ## heading)
function extractIntro(content: string): string | null {
  const match = content.match(/^[\s\S]*?\n\n([\s\S]*?)(?=\n##)/m);
  if (!match) return null;
  const cleaned = cleanContent(match[1]);
  return cleaned.length > 10 ? cleaned : null;
}

export interface ZiweiKnowledgeParams {
  soulPalaceStars: string[];   // major stars in 命宮
  wealthStars: string[];       // major stars in 財帛宮
  careerStars: string[];       // major stars in 官祿宮
  spouseStars: string[];       // major stars in 夫妻宮
  detectedPatterns?: string[]; // 格局 names to look up
}

export function buildZiweiKnowledge(params: ZiweiKnowledgeParams): string {
  const sections: string[] = [];

  // 命宮 stars — highest priority
  for (const star of params.soulPalaceStars) {
    const content = readFile(`stars/major/${star}.md`);
    if (!content) continue;
    const section = extractSection(content, '命宮') ?? extractIntro(content);
    if (section) sections.push(`**${star}入命宮**\n${section}`);
  }

  // Key palaces
  const targets: Array<{ palace: string; stars: string[] }> = [
    { palace: '財帛宮', stars: params.wealthStars },
    { palace: '官祿宮', stars: params.careerStars },
    { palace: '夫妻宮', stars: params.spouseStars },
  ];

  for (const { palace, stars } of targets) {
    for (const star of stars) {
      const content = readFile(`stars/major/${star}.md`);
      if (!content) continue;
      const section = extractSection(content, palace);
      if (section) sections.push(`**${star}入${palace}**\n${section}`);
    }
  }

  // Patterns
  for (const pattern of params.detectedPatterns ?? []) {
    const content = readFile(`patterns/${pattern}.md`);
    if (content && hasContent(content)) {
      const intro = extractIntro(content);
      if (intro) sections.push(`**格局：${pattern}**\n${intro}`);
    }
  }

  if (sections.length === 0) return '';

  return `【命理參考知識庫】\n以下內容來自您的參考書庫，請結合命盤綜合解讀：\n\n${sections.join('\n\n---\n\n')}`;
}
