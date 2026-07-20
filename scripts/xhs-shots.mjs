import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const BASE = "http://localhost:3002";
const OUT = join(homedir(), "Desktop", "小红书素材-紫微AI");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
// iPhone-ish portrait, retina for crisp 小红书 images
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "zh-CN",
});
const page = await ctx.newPage();

// hide Next.js dev tools badge for clean screenshots
const HIDE_CSS = "nextjs-portal,[data-nextjs-dev-tools-button],#__next-build-watcher{display:none!important}";

async function shot(name, { full = false, wait = 1500 } = {}) {
  await page.addStyleTag({ content: HIDE_CSS }).catch(() => {});
  await page.waitForTimeout(wait);
  await page.screenshot({ path: join(OUT, name), fullPage: full });
  console.log("saved", name);
}

// 1. Home — viewport (封面候选: logo + 表单)
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await shot("01-首页-封面.png", { wait: 2000 });
// 2. Home — full page (含 84部典籍/1.7万知识块/黄历)
await shot("02-首页-完整.png", { full: true });

// 3. Result — 命盘 + AI 解读 (用内置示例命盘)
await page.goto(BASE + "/result?date=1990-03-21&hour=11&gender=male&tz=8&name=示例", {
  waitUntil: "networkidle",
});
// 等 AI 解读生成/流式输出
await page.waitForTimeout(12000);
await shot("03-命盘-首屏.png", { wait: 500 });
await shot("04-命盘-完整.png", { full: true });

await browser.close();
console.log("DONE ->", OUT);
