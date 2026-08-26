"use client";

import { useEffect } from "react";

interface EntryTrackerProps {
  date: string;
  hour: number;
  gender: "male" | "female";
  name?: string;
  /** Tagged into the sheet's readingKind column so hepan/monthly entries can
   *  be filtered apart from solo ("ziwei") ones — e.g. "hepan" or "monthly". */
  method: string;
  /** Namespaces the localStorage dedup list so hepan/monthly/solo don't share
   *  one list (mirrors ChartSaver.tsx's own per-product dedup, just generalized). */
  dedupeKey: string;
}

// Fires the same /api/track/birth Google Sheets webhook ChartSaver.tsx already
// uses for solo readings — reusing its exact existing schema (date/hour/gender/
// name/method/source) rather than inventing a new pipeline, so no changes are
// needed on the Apps Script side. `method` is what makes an entry filterable as
// hepan/monthly instead of solo in the sheet's readingKind column.
export default function EntryTracker({ date, hour, gender, name, method, dedupeKey }: EntryTrackerProps) {
  useEffect(() => {
    try {
      const key = `${date}-${hour}-${gender}`;
      const LOGGED_KEY = `${dedupeKey}_logged`;
      const logged: string[] = JSON.parse(localStorage.getItem(LOGGED_KEY) || "[]");
      if (logged.includes(key)) return;
      const source = new URLSearchParams(window.location.search).get("from") || "";
      fetch("/api/track/birth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, hour, gender, name, method, source }),
        keepalive: true,
      }).catch(() => {});
      localStorage.setItem(LOGGED_KEY, JSON.stringify([...logged, key].slice(-500)));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
