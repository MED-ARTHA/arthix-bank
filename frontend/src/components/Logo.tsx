"use client";

/* eslint-disable @next/next/no-img-element */
export default function Logo({ height = 64, className = "" }: { height?: number; className?: string }) {
  return (
    <img
      src="/logo-trim.png"
      alt="Arthix"
      className={className}
      style={{ height, width: "auto", display: "block" }}
      onError={(e) => {
        const el = e.currentTarget;
        if (!el.src.endsWith("/logo-mark.png")) el.src = "/logo-mark.png";
      }}
    />
  );
}