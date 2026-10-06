"use client";

import "./charts.css";
import type { ReactNode } from "react";

type Point = { label: string; value: number };

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

/** Vertical bars with a light grid. The last bar is the highlighted one (usually "today"). */
export function Bars({ data, height = 190 }: { data: Point[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="ch-bars" style={{ height }}>
      <div className="ch-grid" aria-hidden="true"><i /><i /><i /><i /></div>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const last = i === data.length - 1;
        return (
          <div key={d.label + i} className={"ch-col" + (last ? " is-last" : "")}>
            <div className="ch-track">
              {d.value > 0 && <span className="ch-val">{fmt(d.value)}</span>}
              <div className={"ch-bar" + (d.value === 0 ? " zero" : "")} style={{ height: d.value === 0 ? "3px" : `${Math.max(pct, 4)}%` }} />
            </div>
            <span className="ch-lab">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Thin ring chart. Children are centred inside the ring. */
export function Donut({
  size = 150, segments, children,
}: { size?: number; segments: { value: number; color: string }[]; children?: ReactNode }) {
  const stroke = Math.max(8, Math.round(size * 0.085));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const gap = segments.length > 1 ? 6 : 0;
  let offset = 0;

  return (
    <div className="ch-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        {total > 0 && segments.map((s, i) => {
          const len = Math.max((s.value / total) * c - gap, 0.5);
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color}
              strokeWidth={stroke} strokeLinecap="butt"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
          offset += (s.value / total) * c;
          return el;
        })}
      </svg>
      <div className="ch-center">{children}</div>
    </div>
  );
}

type RingProps = {
  value?: number;
  progress?: number;
  pct?: number;
  percent?: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
  className?: string;
};

/** Circular progress. The value can be a 0-1 ratio or a 0-100 percentage. Children are centred inside the ring. */
export function Ring({
  value, progress, pct, percent,
  size = 96, stroke = 8, color = "#7c6df0", track = "rgba(255,255,255,0.1)",
  children, className,
}: RingProps) {
  const raw = value ?? progress ?? pct ?? percent ?? 0;
  const ratio = Math.max(0, Math.min(1, raw > 1 ? raw / 100 : raw));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={className} style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.2, 0.7, 0.2, 1)" }}
        />
      </svg>
      {children !== undefined && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
      )}
    </div>
  );
}