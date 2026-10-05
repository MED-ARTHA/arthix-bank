"use client";

import "./dashboard-rail.css";
import Link from "next/link";
import { ArrowUpRight, Bus, GraduationCap, Landmark, Shield, Smartphone, Zap, type LucideIcon } from "lucide-react";
import { BANKS } from "@/lib/moroccan";

/** Indicative values for the demo. Replace with a real feed when the backend exposes one. */
const RATES = [
  { code: "EUR", name: "Euro", rate: 10.8 },
  { code: "USD", name: "US dollar", rate: 9.2 },
  { code: "GBP", name: "Pound sterling", rate: 12.4 },
  { code: "AED", name: "UAE dirham", rate: 2.5 },
  { code: "SAR", name: "Saudi riyal", rate: 2.45 },
];

const PAY: { label: string; icon: LucideIcon }[] = [
  { label: "Telecom", icon: Smartphone },
  { label: "Electricity & water", icon: Zap },
  { label: "Taxes", icon: Landmark },
  { label: "Schools", icon: GraduationCap },
  { label: "Insurance", icon: Shield },
  { label: "Transport", icon: Bus },
];

export default function DashboardRail() {
  return (
    <aside className="rail">
      <section className="card rail-card rise">
        <header>
          <h3>Exchange rates</h3>
          <span>Indicative</span>
        </header>
        <ul className="rail-rates">
          {RATES.map((r) => (
            <li key={r.code}>
              <b>{r.code}</b>
              <span>{r.name}</span>
              <em>{r.rate.toFixed(2)} MAD</em>
            </li>
          ))}
        </ul>
        <Link href="/offers" className="rail-link">Open the currency simulator <ArrowUpRight size={14} /></Link>
      </section>

      <section className="card rail-card rise">
        <header>
          <h3>Pay & top up</h3>
          <Link href="/payments">All payments</Link>
        </header>
        <div className="rail-pay">
          {PAY.map(({ label, icon: Icon }) => (
            <Link key={label} href="/payments">
              <Icon size={17} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="card rail-card rise">
        <header>
          <h3>Moroccan banks</h3>
          <Link href="/discover">Discover</Link>
        </header>
        <ul className="rail-banks">
          {BANKS.filter((b) => b.kind !== "Central bank").slice(0, 6).map((b) => (
            <li key={b.id}>
              <Link href="/discover">
                <i style={{ background: `linear-gradient(135deg, ${b.from}, ${b.to})` }} />
                {b.name}
                <small>{b.kind}</small>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}