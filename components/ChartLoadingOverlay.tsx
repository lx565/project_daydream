"use client";

import { useEffect, useState } from "react";

const SUBTITLES = ["排列星盤宮位…", "推算大限流年…", "對照典籍格局…", "整合八字命理…"];
const RING_R = 52;
const CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 326.73
// Hard cap: never trap the user behind the overlay even if the first token stalls.
const MAX_WAIT_MS = 18000;

interface Props {
  firstChunkArrived: boolean;
}

export default function ChartLoadingOverlay({ firstChunkArrived }: Props) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [subtitleIdx, setSubtitleIdx] = useState(0);
  const [minElapsed, setMinElapsed] = useState(false);
  const [maxElapsed, setMaxElapsed] = useState(false);

  // 2 000 ms minimum (let the ring animation breathe)
  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), 2000);
    return () => clearTimeout(id);
  }, []);

  // Safety cap — dismiss regardless once MAX_WAIT_MS passes
  useEffect(() => {
    const id = setTimeout(() => setMaxElapsed(true), MAX_WAIT_MS);
    return () => clearTimeout(id);
  }, []);

  // Rotate subtitle every 1 500 ms
  useEffect(() => {
    const id = setInterval(() => setSubtitleIdx((i) => (i + 1) % SUBTITLES.length), 1500);
    return () => clearInterval(id);
  }, []);

  // Dismiss when the first real content has arrived (past the 2s floor),
  // or when the safety cap fires.
  useEffect(() => {
    if ((minElapsed && firstChunkArrived) || maxElapsed) {
      setFading(true);
      const id = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(id);
    }
  }, [minElapsed, firstChunkArrived, maxElapsed]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-parchment"
      style={{ opacity: fading ? 0 : 1, transition: "opacity 400ms ease-out" }}
    >
      {/* Ring + 命 character */}
      <div className="relative flex items-center justify-center mb-6" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
          {/* track ring */}
          <circle
            cx="60" cy="60" r={RING_R}
            fill="none" stroke="#8B1A1A" strokeWidth="2" opacity="0.12"
          />
          {/* animated arc — rotates continuously so it never looks stalled */}
          <circle
            cx="60" cy="60" r={RING_R}
            fill="none" stroke="#8B1A1A" strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * 0.28} ${CIRCUMFERENCE * 0.72}`}
            style={{
              transformOrigin: "60px 60px",
              animation: "chart-ring-spin 1.2s linear infinite",
            }}
          />
        </svg>
        <span style={{ fontFamily: "serif", fontSize: 48, color: "#8B1A1A", lineHeight: 1, position: "relative" }}>
          命
        </span>
      </div>

      <p className="text-sm tracking-widest text-ink-3 mb-2">正在生成命盤基礎數據</p>
      <p className="text-xs tracking-wider text-ink-4 h-4">{SUBTITLES[subtitleIdx]}</p>
      <p className="mt-4 text-[11px] tracking-wider text-ink-4/80">深度解讀需時數秒，請稍候片刻</p>

      <style>{`
        @keyframes chart-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
