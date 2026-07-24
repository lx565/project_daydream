// Static (non-interactive) HTML rendering of the 紫微 12-palace chart, for
// email/print export — mirrors components/ZiweiChart.tsx's default (no
// selection, no 流年 highlight) view. Email clients can't render the live
// React component, so this reproduces the same grid via an HTML <table>
// (the most reliable cross-email-client layout primitive) with inline styles.
import type { ZiweiResult } from "./ziwei";

// Same 0-indexed [row, col] mapping as ZiweiChart.tsx's BRANCH_POSITION.
const BRANCH_POSITION: Record<string, [number, number]> = {
  巳: [0, 0], 午: [0, 1], 未: [0, 2], 申: [0, 3],
  辰: [1, 0],                         酉: [1, 3],
  卯: [2, 0],                         戌: [2, 3],
  寅: [3, 0], 丑: [3, 1], 子: [3, 2], 亥: [3, 3],
};

const BRIGHTNESS_COLOR: Record<string, string> = {
  旺: "#16a34a", 廟: "#d97706", 得: "#8B1A1A", 利: "#8B1A1A", 平: "#8B1A1A",
  不: "#9ca3af", 陷: "#9ca3af",
};

const MUTAGEN_STYLE: Record<string, string> = {
  化祿: "background:#eafbf1;color:#1A5C3A;border-color:#a8dcc0;",
  化權: "background:#fef3c7;color:#b45309;border-color:#fcd34d;",
  化科: "background:#eff6ff;color:#2563eb;border-color:#bfdbfe;",
  化忌: "background:#fee2e2;color:#dc2626;border-color:#fca5a5;",
};

function mutagenPill(mutagen?: string): string {
  if (!mutagen) return "";
  const style = MUTAGEN_STYLE[mutagen] ?? "background:#f5f0e6;color:#5c4a2a;border-color:#e8ddd0;";
  return `<span style="display:inline-block;font-size:8px;line-height:1;padding:1px 3px;margin-left:2px;border-radius:2px;border:1px solid;${style}">${mutagen.replace("化", "")}</span>`;
}

interface StarLike { name: string; brightness: string; type: "major" | "minor" | "adjective"; mutagen?: string }

function starLine(s: StarLike, big: boolean): string {
  const color = BRIGHTNESS_COLOR[s.brightness] ?? "#8B1A1A";
  const weight = s.brightness === "旺" || s.brightness === "廟" ? "900" : "600";
  const size = big ? "11px" : "9px";
  return `<span style="font-size:${size};font-weight:${weight};color:${color};">${s.name}</span>` +
    (s.brightness ? `<span style="font-size:7px;font-weight:700;color:${color};margin-left:1px;">${s.brightness}</span>` : "") +
    mutagenPill(s.mutagen);
}

function palaceCellHtml(palace: ZiweiResult["palaces"][number]): string {
  const major = palace.stars.filter((s) => s.type === "major");
  const minor = palace.stars.filter((s) => s.type === "minor");
  const adj = palace.stars.filter((s) => s.type === "adjective");
  const bg = palace.isSoulPalace ? "#fdf1f1" : "#FDFCF8";
  const border = palace.isSoulPalace ? "#8B1A1A" : "#e8ddd0";

  const majorHtml = major.map((s) => `<div>${starLine(s, true)}</div>`).join("");
  const minorHtml = minor.length
    ? `<div style="margin-top:2px;">${minor.map((s) => starLine(s, false)).join(" ")}</div>` : "";
  const adjHtml = adj.length
    ? `<div style="margin-top:2px;font-size:7px;color:#8a7a5c;">${adj.map((s) => s.name).join(" ")}</div>` : "";

  const nameSize = palace.isSoulPalace ? "13px" : "11px";
  const nameWeight = palace.isSoulPalace ? "900" : "600";
  const nameColor = palace.isSoulPalace ? "#8B1A1A" : "#5c4a2a";
  const badges = [
    palace.isSoulPalace ? `<span style="display:inline-block;font-size:7px;padding:1px 3px;background:#8B1A1A;color:#fff;border-radius:2px;font-weight:700;margin-left:2px;">命</span>` : "",
    palace.isBodyPalace ? `<span style="display:inline-block;font-size:7px;padding:1px 3px;background:#d97706;color:#fff;border-radius:2px;font-weight:700;margin-left:2px;">身</span>` : "",
  ].join("");

  return `<td valign="top" style="width:25%;height:110px;border:1px solid ${border};background:${bg};padding:4px;">` +
    `<div style="min-height:70px;">${majorHtml}${minorHtml}${adjHtml}</div>` +
    `<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px;">` +
    `<span style="font-size:${nameSize};font-weight:${nameWeight};color:${nameColor};">${palace.name}${badges}</span>` +
    `<span style="font-size:10px;font-weight:700;color:#8a7a5c;">${palace.earthlyBranch}</span>` +
    `</div></td>`;
}

function centerCellHtml(ziwei: ZiweiResult, name: string | undefined, gender: "male" | "female"): string {
  return `<td colspan="2" rowspan="2" valign="middle" align="center" style="width:50%;height:220px;border:1px solid #e8ddd0;background:#FDFCF8;padding:8px;">` +
    `<div style="font-size:13px;font-weight:700;color:#8B1A1A;letter-spacing:1px;">命裡</div>` +
    `<div style="width:80%;height:1px;background:#8B1A1A;opacity:0.2;margin:6px auto;"></div>` +
    `<div style="font-size:11px;color:#3d2f1f;">${name ?? "匿名"} · ${gender === "male" ? "男命" : "女命"}</div>` +
    `<div style="font-size:10px;color:#5c4a2a;margin-top:2px;">${ziwei.fiveElementsClass}</div>` +
    `<div style="width:80%;height:1px;background:#8B1A1A;opacity:0.2;margin:6px auto;"></div>` +
    `<div style="font-size:10px;color:#5c4a2a;">命主 <span style="color:#8B1A1A;font-weight:700;">${ziwei.mainStar}</span></div>` +
    `<div style="font-size:10px;color:#5c4a2a;">身主 <span style="color:#d97706;font-weight:700;">${ziwei.bodyStar}</span></div>` +
    `</td>`;
}

export function renderZiweiChartHtml(ziwei: ZiweiResult, name: string | undefined, gender: "male" | "female"): string {
  const byPos: Record<string, ZiweiResult["palaces"][number]> = {};
  for (const p of ziwei.palaces) byPos[p.earthlyBranch] = p;

  const rows: string[] = [];
  for (let row = 0; row < 4; row++) {
    const cells: string[] = [];
    for (let col = 0; col < 4; col++) {
      if (row >= 1 && row <= 2 && col >= 1 && col <= 2) {
        if (row === 1 && col === 1) cells.push(centerCellHtml(ziwei, name, gender));
        continue; // covered by the rowspan/colspan center cell
      }
      const branch = Object.entries(BRANCH_POSITION).find(([, pos]) => pos[0] === row && pos[1] === col)?.[0];
      const palace = branch ? byPos[branch] : undefined;
      cells.push(palace ? palaceCellHtml(palace) : `<td style="width:25%;height:110px;border:1px solid #e8ddd0;"></td>`);
    }
    rows.push(`<tr>${cells.join("")}</tr>`);
  }

  return `<table cellspacing="0" cellpadding="0" style="width:100%;max-width:500px;margin:0 auto 16px;border-collapse:collapse;table-layout:fixed;">${rows.join("")}</table>`;
}
