"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Bars, Donut } from "@/components/Charts";
import CountUp from "@/components/CountUp";
import Icon from "@/components/Icon";
import Photo from "@/components/Photo";
import Receipt from "@/components/Receipt";
import TransactionList from "@/components/TransactionList";
import { api, Goal, Me, Transaction } from "@/lib/api";
import { byCategory, isSpend, last7Days } from "@/lib/analytics";
import { delay, money } from "@/lib/format";

const SHADES = ["#7c6df0", "#a89ff5", "#cfcbf9", "#554bb8"];

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);
  const [greet, setGreet] = useState("Welcome back");
  const [today, setToday] = useState("");

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.transactions().then(setTxs).catch(() => {});
    api.goals().then(setGoals).catch(() => {});
    const h = new Date().getHours();
    setGreet(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    setToday(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  const spent = txs.filter(isSpend).reduce((s, t) => s + t.amount, 0);
  const received = txs
    .filter((t) => t.type === "DEPOSIT" || t.type === "TRANSFER_IN")
    .reduce((s, t) => s + t.amount, 0);
  const saved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const cats = byCategory(txs).map((c, i) => ({ ...c, color: SHADES[i % SHADES.length] }));
  const days = last7Days(txs);

  function copy() {
    if (!me?.accountNumber) return;
    navigator.clipboard.writeText(me.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <AppShell>
      <div className="space-y-10">
        <header className="rise">
          <p className="label">{today || " "}</p>
          <h1 className="serif mt-2 text-4xl">
            {greet}
            {me ? `, ${me.fullName.split(" ")[0]}` : ""}
          </h1>
        </header>

        <section className="glow-card rise p-8" style={delay(1)}>
          <p className="label">Available balance</p>
          {me ? (
            <p className="serif mt-3 text-6xl tracking-tight">
              <CountUp value={me.balance} />
              <span className="ml-3 text-xl text-[var(--muted)]">MAD</span>
            </p>
          ) : (
            <div className="shimmer mt-3 h-14 w-72 rounded" />
          )}
          <div className="mt-8 flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-5">
            <div>
              <p className="label">Account number</p>
              <button onClick={copy} className="mt-1 flex items-center gap-2 text-sm tracking-wide hover:text-[#a89ff5]">
                {me?.accountNumber ?? "-"}
                <Icon name={copied ? "check" : "copy"} size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/deposit" className="btn btn-primary flex items-center gap-2">
                <Icon name="plus" size={16} /> Add money
              </Link>
              <Link href="/transfers" className="btn btn-ghost flex items-center gap-2">
                <Icon name="send" size={16} /> Send
              </Link>
              <Link href="/payments" className="btn btn-ghost flex items-center gap-2">
                <Icon name="receipt" size={16} /> Pay
              </Link>
            </div>
          </div>
        </section>

        <section
          className="rise card grid divide-y divide-[var(--line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          style={delay(2)}
        >
          {[
            ["Spent", money(spent)],
            ["Received", money(received)],
            ["In savings goals", money(saved)],
          ].map(([k, v]) => (
            <div key={k} className="p-6">
              <p className="label">{k}</p>
              <p className="serif mt-2 text-2xl">{v}</p>
            </div>
          ))}
        </section>

        <Link href="/goals" className="rise block" style={delay(3)}>
          <Photo src="/images/banner-savings.jpg" className="h-40 rounded-xl border border-[var(--line)]">
            <div className="flex h-full flex-col justify-end p-6">
              <p className="label">Savings goals</p>
              <p className="serif mt-1 text-2xl">Put money aside for what matters.</p>
            </div>
          </Photo>
        </Link>

        <div className="grid gap-4 lg:grid-cols-5">
          <section className="rise card p-6 lg:col-span-3" style={delay(4)}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm">Spending, last 7 days</h2>
              <span className="label">MAD</span>
            </div>
            <Bars data={days} />
          </section>

          <section className="rise card p-6 lg:col-span-2" style={delay(5)}>
            <h2 className="mb-6 text-sm">Where your money goes</h2>
            {cats.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--muted)]">No spending yet.</p>
            ) : (
              <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
                <Donut segments={cats} size={140}>
                  <span className="label">Total</span>
                  <span className="mt-0.5 text-sm">{money(spent)}</span>
                </Donut>
                <ul className="w-full space-y-3 text-sm">
                  {cats.map((c) => (
                    <li key={c.key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-[var(--muted)]">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                        {c.label}
                      </span>
                      <span>{Math.round((c.value / spent) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm">Recent activity</h2>
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