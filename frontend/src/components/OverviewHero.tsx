"use client";

import "./overview.css";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Plus, Receipt, Send, TrendingUp, Wifi } from "lucide-react";
import CountUp from "@/components/CountUp";
import { api, Me } from "@/lib/api";

const ACTIONS = [
  { href: "/transfers", label: "Transfer", icon: Send },
  { href: "/deposit", label: "Add money", icon: Plus },
  { href: "/payments", label: "Pay", icon: Receipt },
  { href: "/invest", label: "Invest", icon: TrendingUp },
];

const BULLETS = "\u2022\u2022\u2022\u2022";

function greeting(hour: number) {
  if (hour < 6) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Single entry point of the dashboard: greeting, balance, account number and quick actions.
 * The 3D card scene sits directly on the page and follows the pointer (disabled for touch and reduced motion).
 */
export default function OverviewHero() {
  const root = useRef<HTMLElement>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    setNow(new Date());
    load();
    window.addEventListener("balance-changed", load);
    return () => window.removeEventListener("balance-changed", load);
  }, [load]);

  function track(e: React.PointerEvent<HTMLElement>) {
    const el = root.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  }

  function reset() {
    root.current?.style.setProperty("--px", "0");
    root.current?.style.setProperty("--py", "0");
  }

  function copy() {
    if (!me?.accountNumber) return;
    navigator.clipboard.writeText(me.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const first = me?.fullName?.trim().split(/\s+/)[0];
  const last4 = me?.accountNumber?.slice(-4);

  return (
    <section ref={root} className="ov rise" onPointerMove={track} onPointerLeave={reset}>
      <div className="ov-bg" aria-hidden="true" />

      <div className="ov-copy">
        <p className="ov-date">
          {now ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : " "}
        </p>
        <h1 className="ov-hello">
          {now ? greeting(now.getHours()) : "Welcome"}
          {first ? `, ${first}` : ""}
        </h1>

        <p className="ov-label">Available balance</p>
        {me ? (
          <p className="ov-balance">
            <CountUp value={me.balance} />
            <span>MAD</span>
          </p>
        ) : (
          <div className="shimmer ov-skeleton" />
        )}

        <button type="button" className="ov-acc" onClick={copy} disabled={!me?.accountNumber} aria-label="Copy account number">
          {me?.accountNumber ?? " "}
          {me?.accountNumber && (copied ? <Check size={14} /> : <Copy size={14} />)}
        </button>

        <nav className="ov-actions" aria-label="Quick actions">
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="ov-act">
              <span>
                <Icon size={16} strokeWidth={1.6} />
              </span>
              {label}
              <ArrowRight size={14} className="ov-arrow" />
            </Link>
          ))}
        </nav>
      </div>

      <div className="ov-scene" aria-hidden="true">
        <div className="ov-stack">
          <div className="ov-card ov-c3" />
          <div className="ov-card ov-c2" />
          <div className="ov-card ov-c1">
            <div className="ov-top">
              <span>ARTHIX</span>
              <Wifi size={16} style={{ transform: "rotate(90deg)" }} />
            </div>
            <div className="ov-chip" />
            <div className="ov-foot">
              <span>{me?.fullName ?? "Arthix member"}</span>
              <span>{last4 ? `${BULLETS} ${last4}` : ""}</span>
            </div>
          </div>
          <span className="ov-orb ov-o1" />
          <span className="ov-orb ov-o2" />
        </div>
      </div>
    </section>
  );
}