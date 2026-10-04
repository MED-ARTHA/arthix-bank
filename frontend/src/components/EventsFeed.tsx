"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Zap } from "lucide-react";
import { request } from "@/lib/api";

export type MarketEvent = {
  id: number; headline: string; detail: string; tone: "up" | "down";
  symbols: string[]; impactPct: number; at: string;
};

function useEvents(): MarketEvent[] {
  const [list, setList] = useState<MarketEvent[]>([]);
  useEffect(() => {
    const load = () => request<MarketEvent[]>("/api/invest/events").then(setList).catch(() => {});
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);
  return list;
}

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}

export function EventsTicker({ onOpen }: { onOpen?: () => void }) {
  const last = useEvents()[0];
  if (!last) return null;
  const Icon = last.tone === "up" ? TrendingUp : TrendingDown;
  return (
    <button key={last.id} className="ev-ticker" onClick={onOpen}>
      <span className="ev-live"><Zap size={12} /> Live</span>
      <Icon size={15} className={last.tone} />
      <span className="ev-ticker-text">{last.headline}</span>
      <span className={"ev-impact " + last.tone}>{last.impactPct > 0 ? "+" : ""}{last.impactPct} %</span>
    </button>
  );
}

export default function EventsFeed() {
  const events = useEvents();
  if (events.length === 0) return <p className="py-16 text-center text-sm text-[var(--muted)]">No events yet.</p>;
  return (
    <ol className="ev-list">
      {events.map((e) => {
        const Icon = e.tone === "up" ? TrendingUp : TrendingDown;
        return (
          <li key={e.id} className="ev-item">
            <span className={"ev-dot " + e.tone}><Icon size={16} /></span>
            <div className="ev-body">
              <div className="ev-head">
                <h4>{e.headline}</h4>
                <span className={"ev-impact " + e.tone}>{e.impactPct > 0 ? "+" : ""}{e.impactPct} %</span>
              </div>
              <p>{e.detail}</p>
              <div className="ev-meta">
                {e.symbols.map((s) => <span key={s} className="inv-pill">{s}</span>)}
                <small>{ago(e.at)}</small>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}