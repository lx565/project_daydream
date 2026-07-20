"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

export interface SavedChart {
  chartKey: string;
  name?: string;
  date: string;
  hour: number;
  gender: "male" | "female";
  summary: string;
  soulPalace: string;
  bodyPalace: string;
  mainStar: string;
  bodyStar: string;
  fiveElementsClass: string;
  savedAt: number;
}

const STORAGE_KEY = "ziwei_saved_chart";

export function getSavedChart(): SavedChart | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedChart) : null;
  } catch { return null; }
}

export function clearSavedChart() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

interface ChartSaverProps {
  name?: string;
  date: string;
  hour: number;
  gender: "male" | "female";
  method?: string;
  summary: string;
  soulPalace: string;
  bodyPalace: string;
  mainStar: string;
  bodyStar: string;
  fiveElementsClass: string;
}

export default function ChartSaver(props: ChartSaverProps) {
  useEffect(() => {
    const chart: SavedChart = {
      chartKey: `${props.date}-${props.hour}-${props.gender}`,
      name: props.name,
      date: props.date,
      hour: props.hour,
      gender: props.gender,
      summary: props.summary,
      soulPalace: props.soulPalace,
      bodyPalace: props.bodyPalace,
      mainStar: props.mainStar,
      bodyStar: props.bodyStar,
      fiveElementsClass: props.fiveElementsClass,
      savedAt: Date.now(),
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chart)); } catch { /* ignore */ }
    track("chart_generated", { method: props.method ?? "ziwei", gender: props.gender });

    // Log the birthday for demographics analytics (Google Sheet). Fire-and-forget —
    // never blocks the reading. Dedup per browser so reloads/re-opens of the same
    // chart don't inflate daily counts (a reload isn't a new birthday "added").
    try {
      const key = `${props.date}-${props.hour}-${props.gender}`;
      const LOGGED_KEY = "ziwei_birth_logged";
      const logged: string[] = JSON.parse(localStorage.getItem(LOGGED_KEY) || "[]");
      if (!logged.includes(key)) {
        const source = new URLSearchParams(window.location.search).get("from") || "";
        fetch("/api/track/birth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: props.date, hour: props.hour, gender: props.gender,
            name: props.name, method: props.method ?? "ziwei", source,
          }),
          keepalive: true,
        }).catch(() => {});
        localStorage.setItem(LOGGED_KEY, JSON.stringify([...logged, key].slice(-500)));
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null; // invisible — just saves to localStorage
}
