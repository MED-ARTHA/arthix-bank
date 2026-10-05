"use client";

import "./dashboard.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Bars, Donut } from "@/components/Charts";
import DashboardRail from "@/components/DashboardRail";
import OverviewHero from "@/components/OverviewHero";
import Receipt from "@/components/Receipt";
import TransactionList from "@/components/TransactionList";
import { api, Goal, Transaction } from "@/lib/api";
import { byCategory, isSpend, last7Days } from "@/lib/analytics";
import { delay, money } from "@/lib/format";

const SHADES = ["#7c6df0", "#4fd1c5", "#6cb4ff", "#f2b45a"];
const GHOST = [38, 56, 30, 70, 48, 62, 40];

export default function DashboardPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState<Transaction | null>(null);

  useEffect(() => {
    api.transactions().then(setTxs).catch(() => {});
    api.goals().then(setGoals).catch(() => {});
  }, []);

  const spent = txs.filter(isSpend).reduce((s, t) => s + t.amount, 0);
  const received = txs
    .filter((t) => t.type === "DEPOSIT" || t.type === "TRANSFER_IN")
    .reduce((s, t) => s + t.amount, 0);
  const saved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const cats = byCategory(txs).map((c, i) => ({ ...c, color: SHADES[i % SHADES.length] }));
  const days = last7Days(txs);

  const stats: [string, string][] = [
    ["Spent", money(spent)],
    ["Received", money(received)],
    ["In savings goals", money(saved)],
  ];

  return (
    <AppShell>
      <div className="dash">
        <div className="dash-main">
          <OverviewHero />

          <section className="card dash-stats rise" style={delay(1)}>
            {stats.map(([label, value]) => (
              <div key={label}>
                <p className="label">{label}</p>
                <p className="serif">{value}</p>
              </div>
            ))}
          </section>

          <div className="dash-charts">
            <section className="card dash-panel rise" style={delay(2)}>
              <header><h2>Spending, last 7 days</h2><span className="label">MAD</span></header>
              {spent > 0 ? (
                <Bars data={days} />
              ) : (
                <div className="dash-empty">
                  <div className="dash-ghost" aria-hidden="true">
                    {GHOST.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
                  </div>
                  <p>Your week will show up here once you pay a bill or send money.</p>
                  <Link href="/payments">Make a payment</Link>
                </div>
              )}
            </section>

            <section className="card dash-panel rise" style={delay(3)}>
              <header><h2>Where your money goes</h2></header>
              {cats.length === 0 ? (
                <div className="dash-empty">
                  <p>No spending yet, so there is nothing to split.</p>
                </div>
              ) : (
                <div className="dash-split">
                  <Donut segments={cats} size={132}>
                    <span className="label">Total</span>
                    <span className="mt-0.5 text-sm">{money(spent)}</span>
                  </Donut>
                  <ul>
                    {cats.map((c) => (
                      <li key={c.key}>
                        <span><i style={{ background: c.color }} />{c.label}</span>
                        <b>{spent > 0 ? Math.round((c.value / spent) * 100) : 0}%</b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <section className="rise" style={delay(4)}>
            <header className="dash-row">
              <h2>Recent activity</h2>
              <Link href="/transactions">View all</Link>
            </header>
            <TransactionList items={txs.slice(0, 6)} onSelect={setOpen} />
          </section>
        </div>

        <DashboardRail />
      </div>

      {open && <Receipt tx={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}