"use client";

import "./overview.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Receipt, Send, TrendingUp, Wifi } from "lucide-react";
import { api, Me } from "@/lib/api";
import { money } from "@/lib/format";

const ACTIONS = [
  { href: "/transfers", label: "Transfer", icon: Send },
  { href: "/deposit", label: "Add money", icon: Plus },
  { href: "/payments", label: "Pay", icon: Receipt },
  { href: "/invest", label: "Invest", icon: TrendingUp },
];

function greeting() {
  const h = new Date().getHours();
  return h < 6 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Dashboard hero: greeting, balance, quick actions and a 3D card scene that follows the pointer. */
export default function OverviewHero() {
  const [me, setMe] = useState<Me | null>(null);
  const root = useRef<HTMLElement>(null);

  useEffect(() => { api.me().then(setMe).catch(() => {}); }, []);

  function move(e: React.PointerEvent) {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
    el.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
  }
  function leave() {
    root.current?.style.setProperty("--px", "0");
    root.current?.style.setProperty("--py", "0");
  }

  const first = me?.fullName?.trim().split(/\s+/)[0] ?? "";

  return (
    <section ref={root} className="ov rise" onPointerMove={move} onPointerLeave={leave}>
      <div className="ov-bg" aria-hidden="true" />

      <div className="ov-copy">
        <p className="ov-hello">{greeting()}{first ? `, ${first}` : ""}</p>
        <p className="ov-label">Available balance</p>
        <p className="ov-balance">{me ? money(me.balance) : "-"}</p>
        <p className="ov-acc">{me?.accountNumber ?? ""}</p>

        <div className="ov-actions">
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="ov-act">
              <span><Icon size={16} strokeWidth={1.6} /></span>
              {label}
              <ArrowRight size={14} className="ov-arrow" />
            </Link>
          ))}
        </div>
      </div>

      <div className="ov-scene" aria-hidden="true">
        <div className="ov-stack">
          <div className="ov-card ov-c3" />
          <div className="ov-card ov-c2" />
          <div className="ov-card ov-c1">
            <div className="ov-top"><span>ARTHIX</span><Wifi size={16} style={{ transform: "rotate(90deg)" }} /></div>
            <div className="ov-chip" />
            <div className="ov-foot">
              <span>{me?.fullName ?? "Arthix member"}</span>
              <span>{me?.accountNumber?.slice(-4) ? `•••• ${me.accountNumber.slice(-4)}` : ""}</span>
            </div>
          </div>
          <span className="ov-orb ov-o1" />
          <span className="ov-orb ov-o2" />
        </div>
      </div>
    </section>
  );
}