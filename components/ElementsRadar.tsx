"use client";

interface Elements { wood: number; fire: number; earth: number; metal: number; water: number; }

const AXES = [
  { key: "wood",  label: "木", color: "#1A5C3A", angle: -90 },
  { key: "fire",  label: "火", color: "#8B2020", angle: -90 + 72 },
  { key: "earth", label: "土", color: "#7B5C00", angle: -90 + 144 },
  { key: "metal", label: "金", color: "#5A5A6A", angle: -90 + 216 },
  { key: "water", label: "水", color: "#1A3A5C", angle: -90 + 288 },
] as const;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function ElementsRadar({ elements, size = 120 }: { elements: Elements; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.34, labelR = size * 0.47;
  const maxVal = Math.max(...Object.values(elements), 1);
  const total = Object.values(elements).reduce((a, b) => a + b, 0) || 1;

  const gridPolygons = [0.25, 0.5, 0.75, 1].map((level) =>
    AXES.map((ax) => { const p = polar(cx, cy, maxR * level, ax.angle); return `${p.x},${p.y}`; }).join(" ")
  );

  const dataPoints = AXES.map((ax) => polar(cx, cy, (elements[ax.key] ?? 0) / maxVal * maxR, ax.angle));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="rgba(44,26,16,0.08)" strokeWidth="0.5" />
      ))}
      {AXES.map((ax) => {
        const end = polar(cx, cy, maxR, ax.angle);
        return <line key={ax.key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(44,26,16,0.08)" strokeWidth="0.5" />;
      })}
      <polygon points={dataPolygon} fill="rgba(139,26,26,0.10)" stroke="#8B1A1A" strokeWidth="1.5" strokeLinejoin="round" />
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2" fill="#8B1A1A" />)}
      {AXES.map((ax) => {
        const lp = polar(cx, cy, labelR, ax.angle);
        const pct = Math.round(((elements[ax.key] ?? 0) / total) * 100);
        return (
          <g key={ax.key}>
            <text x={lp.x} y={lp.y - 4} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill={ax.color}>{ax.label}</text>
            <text x={lp.x} y={lp.y + 6} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="rgba(44,26,16,0.4)">{pct}%</text>
          </g>
        );
      })}
    </svg>
  );
}
