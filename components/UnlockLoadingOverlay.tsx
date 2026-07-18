"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { icon: "⟳", text: "正在解鎖完整命書…",      spin: true,  final: false },
  { icon: "✦", text: "掃描百部命理典籍資料庫",  spin: false, final: false },
  { icon: "✦", text: "深度推算大運流年",         spin: false, final: false },
  { icon: "✦", text: "以進階模型交叉審閱",       spin: false, final: false },
  { icon: "✦", text: "校驗各派論斷一致性",       spin: false, final: false },
  { icon: "✓", text: "命書已準備完成",           spin: false, final: true  },
];

const LAST = STEPS.length - 1;

interface Props {
  unlocked: boolean;
}

export default function UnlockLoadingOverlay({ unlocked }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);

  // Advance one step every 700 ms until the last step
  useEffect(() => {
    if (activeStep >= LAST) return;
    const id = setTimeout(() => setActiveStep((s) => s + 1), 700);
    return () => clearTimeout(id);
  }, [activeStep]);

  // Once last step AND unlocked: wait 800 ms then fade out
  useEffect(() => {
    if (activeStep < LAST || !unlocked) return;
    const id = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 400);
    }, 800);
    return () => clearTimeout(id);
  }, [activeStep, unlocked]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-parchment"
      style={{ opacity: fading ? 0 : 1, transition: "opacity 400ms ease-out" }}
    >
      <p className="text-xs tracking-widest text-ink-4 mb-8">解鎖進行中</p>
      <div className="flex flex-col gap-4">
        {STEPS.map((step, i) => {
          const active = i <= activeStep;
          return (
            <div
              key={i}
              className="flex items-center gap-3 transition-opacity duration-300"
              style={{ opacity: active ? 1 : 0.2 }}
            >
              <span
                className={`w-4 text-center text-sm leading-none flex-shrink-0 ${
                  active
                    ? step.final ? "text-jade" : "text-vermillion"
                    : "text-ink-4"
                } ${step.spin && active ? "animate-spin" : ""}`}
              >
                {step.icon}
              </span>
              <span
                className={`text-sm ${
                  active
                    ? step.final ? "text-jade font-semibold" : "text-ink"
                    : "text-ink-4"
                }`}
              >
                {step.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
