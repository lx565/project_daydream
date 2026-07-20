"use client";

// Deterministic xorshift — same output every render, no hydration mismatch
const rng = (() => {
  let s = 0x9e3779b9;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 4294967295;
  };
})();

// Small dots: lots of them, very low opacity
const DOTS = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  x: rng() * 100,
  y: rng() * 100,
  r: 0.5 + rng() * 1.1,
  op: 0.07 + rng() * 0.17,
  twinkle: rng() > 0.55,
  dur: 3 + rng() * 4,
  delay: rng() * 8,
}));

// ✦ sparkle glyphs: fewer, slightly more prominent
const SPARKLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: rng() * 100,
  y: rng() * 100,
  size: 7 + rng() * 10,
  op: 0.09 + rng() * 0.14,
  dur: 4 + rng() * 5,
  delay: rng() * 10,
}));

export default function StarField() {
  return (
    <>
      <style>{`
        @keyframes sf-twinkle {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.04; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "absolute", inset: 0 }}
        >
          {/* Tiny dots */}
          {DOTS.map((d) => (
            <circle
              key={d.id}
              cx={`${d.x}%`}
              cy={`${d.y}%`}
              r={d.r}
              fill="#7B4F1A"
              opacity={d.op}
              style={d.twinkle ? {
                animation: `sf-twinkle ${d.dur}s ${d.delay}s ease-in-out infinite`,
              } : undefined}
            />
          ))}

          {/* ✦ sparkles */}
          {SPARKLES.map((s) => (
            <text
              key={s.id}
              x={`${s.x}%`}
              y={`${s.y}%`}
              fontSize={s.size}
              fill="#C8A050"
              opacity={s.op}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                animation: `sf-twinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
              }}
            >✦</text>
          ))}
        </svg>
      </div>
    </>
  );
}
