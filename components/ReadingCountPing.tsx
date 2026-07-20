"use client";

import { useEffect } from "react";

// Fires a single increment per browser session when a result page is viewed,
// so refreshes / tab revisits within one session don't inflate the counter.
const SESSION_KEY = "ziwei_reading_counted";

export default function ReadingCountPing() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage unavailable — count anyway, best effort.
    }
    fetch("/api/stats/readings", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
