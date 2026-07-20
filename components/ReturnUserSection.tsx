"use client";

import { useEffect, useState } from "react";
import DailyCard from "./DailyCard";
import { getSavedChart, clearSavedChart, type SavedChart } from "./ChartSaver";

export default function ReturnUserSection() {
  const [chart, setChart] = useState<SavedChart | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const saved = getSavedChart();
    if (saved) setChart(saved);
  }, []);

  if (!chart || dismissed) return null;

  return (
    <div className="w-full max-w-md space-y-3 mb-6">
      {/* Welcome back header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-ink-4 tracking-widest">
          歡迎回來{chart.name ? `，${chart.name}` : ""}
        </p>
        <button
          onClick={() => { clearSavedChart(); setDismissed(true); }}
          className="text-[10px] text-ink-4 hover:text-ink-3 underline"
        >
          不是我
        </button>
      </div>
      <DailyCard chart={chart} />
    </div>
  );
}
