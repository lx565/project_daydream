"use client";

import { useEffect, useState } from "react";

const SUBTITLES = ["排列星盤宮位…", "推算大限流年…", "對照典籍格局…", "整合八字命理…"];
const RING_R = 52;
const CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 326.73

interface Props {
  firstChunkArrived: boolean;
}

export default function ChartLoadingOverlay({ firstChunkArrived }: Props) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [subtitleIdx, setSubtitleIdx] = useState(0);
  const [minElapsed, setMinElapsed] = useState(false);

  // 2 000 ms minimum
  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), 2000);
    return () => clearTimeout(id);
  }, []);

  // Rotate subtitle every 1 000 ms
  useEffect(() => {
    const id = setInterval(() => setSubtitleIdx((i) => (i + 1) % SUBTITLES.length), 1000);
    return () => clearInterval(id);
  }, []);

  // Dismiss when both conditions are met
  useEffect(() => {
    if (minElapsed && firstChunkArrived) {
      setFading(true);
      const id = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(id);
    }
  }, [minElapsed, firstChunkArrived]);

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
          {/* animated fill ring */}
          <circle
            cx="60" cy="60" r={RING_R}
            fill="none" stroke="#8B1A1A" strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            style={{
              strokeDashoffset: CIRCUMFERENCE,
              animation: "chart-ring-fill 2.5s ease-in-out forwards",
            }}
          />
        </svg>
        <span style={{ fontFamily: "serif", fontSize: 48, color: "#8B1A1A", lineHeight: 1, position: "relative" }}>
          命
        </span>
      </div>

      <p className="text-sm tracking-widest text-ink-3 mb-2">正在推算命盤各部分</p>
      <p className="text-xs tracking-wider text-ink-4 h-4">{SUBTITLES[subtitleIdx]}</p>

      <style>{`
        @keyframes chart-ring-fill {
          from { stroke-dashoffset: ${CIRCUMFERENCE}; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
