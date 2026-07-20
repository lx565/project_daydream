/**
 * Regression tests for calculateBazi.
 * Run: npx tsx scripts/test-bazi.ts
 *
 * Add a new case whenever a user reports a wrong result.
 * Source: cross-check all expected values via lunar-javascript directly
 * before adding — never rely on memory or manual calculation.
 */
import { calculateBazi } from "../lib/bazi";

interface Case {
  label: string;
  input: [number, number, number, number, "male" | "female"];
  expected: { year: string; month: string; day: string; hour: string };
}

const CASES: Case[] = [
  {
    label: "2003-01-07 午时 (user-reported bug)",
    input: [2003, 1, 7, 11, "male"],
    expected: { year: "壬午", month: "癸丑", day: "庚辰", hour: "壬午" },
  },
  {
    label: "1949-10-01 子时 (PRC founding, well-known)",
    input: [1949, 10, 1, 0, "male"],
    expected: { year: "己丑", month: "癸酉", day: "甲子", hour: "甲子" },
  },
  {
    label: "1990-03-21 午时 (app demo chart)",
    input: [1990, 3, 21, 11, "male"],
    expected: { year: "庚午", month: "己卯", day: "乙酉", hour: "壬午" },
  },
  {
    label: "2000-01-01 子时 (Y2K, 立春 boundary check)",
    input: [2000, 1, 1, 0, "male"],
    expected: { year: "己卯", month: "丙子", day: "戊午", hour: "壬子" },
  },
  {
    // 立春 2003 is later in the day on Feb 4 — midnight is still 壬午年 癸丑月
    label: "2003-02-04 子时 (立春 day — still 壬午 at midnight)",
    input: [2003, 2, 4, 0, "male"],
    expected: { year: "壬午", month: "癸丑", day: "戊申", hour: "壬子" },
  },
  {
    // 小寒 2003 occurs during Jan 6 daytime — midnight Jan 5 is still 子月
    label: "2003-01-05 子时 (before 小寒 — still 壬子月)",
    input: [2003, 1, 5, 0, "male"],
    expected: { year: "壬午", month: "壬子", day: "戊寅", hour: "壬子" },
  },
  {
    // midnight Jan 6 is also before 小寒 exact time — still 壬子月
    label: "2003-01-06 子时 (小寒 day, midnight still 壬子月)",
    input: [2003, 1, 6, 0, "male"],
    expected: { year: "壬午", month: "壬子", day: "己卯", hour: "甲子" },
  },
  {
    // user-reported: old month table gave 甲申 instead of 癸未
    label: "2005-07-10 辰时 (user-reported wrong month)",
    input: [2005, 7, 10, 7, "male"],
    expected: { year: "乙酉", month: "癸未", day: "乙未", hour: "庚辰" },
  },
];

let pass = 0;
let fail = 0;

for (const tc of CASES) {
  const [y, m, d, h, g] = tc.input;
  const r = calculateBazi(y, m, d, h, g);
  const got = {
    year:  r.year.stem  + r.year.branch,
    month: r.month.stem + r.month.branch,
    day:   r.day.stem   + r.day.branch,
    hour:  r.hour.stem  + r.hour.branch,
  };
  const ok = JSON.stringify(got) === JSON.stringify(tc.expected);
  if (ok) {
    console.log("✓", tc.label);
    pass++;
  } else {
    console.log("✗", tc.label);
    for (const k of ["year", "month", "day", "hour"] as const) {
      if (got[k] !== tc.expected[k]) {
        console.log(`  ${k}: got ${got[k]}, expected ${tc.expected[k]}`);
      }
    }
    fail++;
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
