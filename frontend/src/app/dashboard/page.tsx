"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Bars, Donut, Sparkline } from "@/components/Charts";
import CountUp from "@/components/CountUp";
import Icon, { type IconName } from "@/components/Icon";
import Receipt from "@/components/Receipt";
import TransactionList from "@/components/TransactionList";
import { api, Goal, Me, Transaction } from "@/lib/api";
import { balanceSeries, byCategory, isSpend, last7Days } from "@/lib/analytics";
import { delay, money } from "@/lib/format";

const actions: { href: string; label: string; icon: IconName; color: string }[] = [
  { href: "/deposit", label: "Add money", icon: "plus", color: "#4fd1a5" },
  { href: "/transfers", label: "Send money", icon: "send", color: "#8b7cf6" },
  { href: "/payments", label: "Pay a bill", icon: "receipt", color: "#fbbf24" },
  { href: "/goals", label: "Save", icon: "target", color: "#2dd4bf" },
];

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.transactions().then(setTxs).catch(() => {});
    api.goals().then(setGoals).catch(() => {});
  }, []);

  const spent = txs.filter(isSpend).reduce((s, t) => s + t.amount, 0);
  const received = txs
    .filter((t) => t.type === "DEPOSIT" || t.type === "TRANSFER_IN")
    .reduce((s, t) => s + t.amount, 0);
  const saved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const cats = byCategory(txs);
  const days = last7Days(txs);
  const series = balanceSeries(txs);

  function copy() {
    if (!me?.accountNumber) return;
    navigator.clipboard.writeText(me.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="rise">
          <p className="label">Welcome back</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{me?.fullName ?? " "}</h1>
        </div>

        <section className="glow-card rise p-7" style={delay(1)}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label">Available balance</p>
              <p className="mt-3 text-5xl font-semibold tracking-tight">
                {me ? <CountUp value={me.balance} /> : "0,00"}
                <span className="ml-2 text-lg font-normal text-[var(--muted)]">MAD</span>
              </p>
            </div>
            <div className="w-full max-w-[240px] sm:w-56">
              <p className="label mb-1">Balance trend</p>
              <Sparkline values={series} />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
            <div>
              <p className="label">Account number</p>
              <p className="mt-1 font-medium tracking-wide">{me?.accountNumber ?? "-"}</p>
            </div>
            <button onClick={copy} className="btn btn-ghost flex items-center gap-2 !py-1.5 text-xs">
              <Icon name={copied ? "check" : "copy"} size={14} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map((a, i) => (
            <Link
              key={a.href}
              href={a.href}
              className="rise card card-hover flex flex-col items-start gap-3 p-4"
              style={{ ...delay(i + 2), ["--c" as string]: a.color + "88" }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: a.color + "22", color: a.color }}
              >
                <Icon name={a.icon} size={19} />
              </span>
              <span className="text-sm font-medium">{a.label}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rise card p-5" style={delay(6)}>
            <p className="label">Spent</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--amber)]">{money(spent)}</p>
          </div>
          <div className="rise card p-5" style={delay(7)}>
            <p className="label">Received</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--ok)]">{money(received)}</p>
          </div>
          <div className="rise card p-5" style={delay(8)}>
            <p className="label">In savings goals</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--teal)]">{money(saved)}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <section className="rise card p-6 lg:col-span-3" style={delay(9)}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-medium">Spending, last 7 days</h2>
              <span className="label">MAD</span>
            </div>
            <Bars data={days} />
          </section>

          <section className="rise card p-6 lg:col-span-2" style={delay(10)}>
            <h2 className="mb-5 text-sm font-medium">Where your money goes</h2>
            {cats.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--muted)]">No spending yet.</p>
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
                <Donut segments={cats} size={150}>
                  <span className="label">Total</span>
                  <span className="mt-0.5 text-sm font-semibold">{money(spent)}</span>
                </Donut>
                <ul className="w-full space-y-2.5 text-sm">
                  {cats.map((c) => (
                    <li key={c.key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-[var(--muted)]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                        {c.label}
                      </span>
                      <span className="font-medium">{Math.round((c.value / spent) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent activity</h2>
            <Link href="/transactions" className="text-xs text-[var(--muted)] hover:text-white">
              View all
            </Link>
          </div>
          <TransactionList items={txs.slice(0, 5)} onSelect={setOpen} />
        </section>
      </div>
      {open && <Receipt tx={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}