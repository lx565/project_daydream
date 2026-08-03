// HTML email template for 命裡 reading reports.
// Called by /api/email/report with the collected reading texts.

import type { ZiweiResult } from "./ziwei";
import { renderZiweiChartHtml } from "./chartHtml";

export interface ReadingEmailData {
  name?: string;
  gender: "male" | "female";
  birthSummary: string;   // e.g. "1990年3月15日 · 男 · 午時"
  chartSummary: string;   // e.g. "命宮子宮，命主紫微，身主天府，火六局"
  ziwei?: ZiweiResult;    // full chart — renders the 12-palace grid as part one, matching the app
  readings: {
    synthesis?: string;
    overview?: string;
    consensus?: string;
    bazi?: string;
    palaces?: string;
    decades?: string;
    flowYears?: string;
    baziDeep?: string;
    baziSchools?: string;
    baziDecades?: string;
    dualschool?: string;
    cautions?: string;
  };
}

// Converts one matched GFM pipe-table block (header row + |---|---| separator
// + data rows) into an inline-styled HTML table — email clients strip
// stylesheets, so every cell needs its own style attribute.
function mdTableToHtml(block: string): string {
  const lines = block.trim().split("\n").map((l) => l.trim());
  const cells = (line: string) => line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const header = cells(lines[0]);
  const rows = lines.slice(2).map(cells); // lines[1] is the |---|---| separator, skip it
  const th = header
    .map((h) => `<th style="padding:6px 10px;background:#f5f0e6;border:1px solid #e8ddd0;text-align:left;font-size:13px;color:#5c4a2a;">${h}</th>`)
    .join("");
  const trs = rows
    .map((r) => `<tr>${r.map((c) => `<td style="padding:6px 10px;border:1px solid #e8ddd0;font-size:13px;color:#2C1A10;">${c}</td>`).join("")}</tr>`)
    .join("");
  return `<table style="border-collapse:collapse;width:100%;margin:12px 0;">` +
    `<thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

// Pulls GFM pipe-tables out of the markdown before the rest of mdToHtml's
// regex passes run (which would otherwise mangle a table's internal newlines
// via the paragraph-break / bullet-list rules), replacing each with a
// placeholder token to be substituted back in once the rest of the text is
// converted.
function extractTables(md: string): { text: string; tables: string[] } {
  const tables: string[] = [];
  const tableBlockRe = /^\|.+\|[ \t]*\n\|[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)+\|?[ \t]*\n(?:\|.+\|[ \t]*\n?)+/gm;
  const text = md.replace(tableBlockRe, (match) => {
    const token = `@@TABLE_${tables.length}@@`;
    tables.push(mdTableToHtml(match));
    return token;
  });
  return { text, tables };
}

function mdToHtml(md: string): string {
  const { text, tables } = extractTables(md);
  let html = text
    .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;color:#8B1A1A;margin:24px 0 8px;padding-bottom:4px;border-bottom:1px solid #e8ddd0;">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;color:#5c4a2a;margin:16px 0 6px;">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•]\s+(.+)$/gm, '<li style="margin:4px 0;padding-left:4px;">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:8px 0;">$&</ul>')
    .replace(/\n\n/g, '</p><p style="margin:10px 0;line-height:1.7;">')
    .replace(/^(?!<[h2h3ulp])/gm, '')
    .trim();
  tables.forEach((tableHtml, i) => { html = html.replace(`@@TABLE_${i}@@`, tableHtml); });
  return html;
}

export function buildReadingEmail(data: ReadingEmailData): { html: string; text: string } {
  const greet = data.name ? `親愛的 ${data.name}，` : '您好，';

  // Sections ordered exactly by tab: 總覧 → 宮位 → 大運 → 八字 → 眾說 → 注意
  const sections: { title: string; content: string | undefined }[] = [
    // 總覧 tab
    { title: '混合解讀',           content: data.readings.synthesis },
    { title: '紫微綜合',           content: data.readings.consensus },
    { title: '八字綜合',           content: data.readings.bazi },
    // 宮位 tab
    { title: '十二宮位',           content: data.readings.palaces },
    // 大運 tab
    { title: '大運流年',           content: data.readings.decades },
    { title: '流年運勢總覽',       content: data.readings.flowYears },
    // 八字 tab
    { title: '八字命理 · 深度詳批', content: data.readings.baziDeep },
    { title: '八字各派視角',       content: data.readings.baziSchools },
    { title: '八字大運走勢',       content: data.readings.baziDecades },
    // 眾說 tab
    { title: '紫微三派詳解',       content: data.readings.overview },
    { title: '三合·四化·飛星 · 三派深解', content: data.readings.dualschool },
    // 注意 tab
    { title: '特別注意',           content: data.readings.cautions },
  ].filter(s => s.content && s.content.trim().length > 50);

  const sectionsHtml = sections.map((s, i) => `
    <div style="margin-bottom:32px;${i > 0 ? "page-break-before:always;padding-top:24px;" : ""}">
      <h2 style="font-size:18px;font-weight:700;color:#8B1A1A;margin:0 0 12px;padding-bottom:6px;border-bottom:2px solid #c8a96e;">
        ${s.title}
      </h2>
      <div style="color:#2c1a0e;font-size:14px;line-height:1.8;">
        <p style="margin:10px 0;line-height:1.7;">${mdToHtml(s.content!)}</p>
      </div>
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0ea;font-family:'Noto Serif TC',Georgia,serif;">
  <div style="max-width:640px;margin:0 auto;background:#fffdf8;">

    <!-- Header -->
    <div style="background:#8B1A1A;padding:32px 40px;text-align:center;">
      <div style="font-size:28px;color:#f5d98b;letter-spacing:4px;font-weight:700;">命 裡</div>
      <div style="font-size:12px;color:#e8c88a;margin-top:6px;letter-spacing:2px;">MINGLI · 紫微斗數 AI 命盤解讀</div>
    </div>

    <!-- Birth summary -->
    <div style="background:#2c1a0e;padding:20px 40px;">
      <div style="color:#c8a96e;font-size:12px;letter-spacing:2px;margin-bottom:6px;">命盤資訊</div>
      <div style="color:#f5d98b;font-size:15px;font-weight:600;">${data.birthSummary}</div>
      ${data.chartSummary ? `<div style="color:#e8c88a;font-size:13px;margin-top:4px;opacity:0.85;">${data.chartSummary}</div>` : ''}
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">
      <p style="color:#5c4a2a;font-size:15px;line-height:1.8;margin:0 0 28px;">${greet}以下是您的完整命盤解讀報告，由 命裡 AI 依據紫微斗數與八字命理為您生成。</p>

      ${data.ziwei ? renderZiweiChartHtml(data.ziwei, data.name, data.gender) : ''}

      ${sectionsHtml}

      <div style="background:#f9f5ef;border:1px solid #e8ddd0;border-radius:8px;padding:16px 20px;margin-top:32px;">
        <p style="color:#7a6040;font-size:12px;line-height:1.7;margin:0;">
          本報告由 AI 輔助生成，僅供參考，不構成任何決策依據。如需重新查看或生成新命盤，請訪問
          <a href="https://www.mingli.study" style="color:#8B1A1A;">mingli.study</a>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #e8ddd0;padding:20px 40px;text-align:center;">
      <div style="color:#a09080;font-size:11px;line-height:1.6;">
        © 命裡 · mingli.study<br>
        您收到此郵件是因為您在生成命盤後選擇了接收報告。
      </div>
    </div>

  </div>
</body>
</html>`;

  // Plain text fallback
  const text = [
    `命裡 · 命盤解讀報告`,
    `${data.birthSummary}`,
    data.chartSummary,
    '',
    ...sections.map(s => [`=== ${s.title} ===`, s.content, ''].join('\n')),
    '---',
    'mingli.study',
  ].filter(Boolean).join('\n');

  return { html, text };
}
