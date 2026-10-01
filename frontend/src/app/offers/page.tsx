"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Bars, Donut } from "@/components/Charts";
import Icon, { type IconName } from "@/components/Icon";
import { api, Offer } from "@/lib/api";
import { delay, money, plain } from "@/lib/format";

type Tab = "loan" | "savings" | "exchange";

const STYLES: { icon: IconName; color: string }[] = [
  { icon: "card", color: "#8b7cf6" },
  { icon: "target", color: "#38bdf8" },
  { icon: "shield", color: "#2dd4bf" },
  { icon: "receipt", color: "#fbbf24" },
  { icon: "swap", color: "#fb7185" },
  { icon: "gift", color: "#4fd1a5" },
];

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="text-sm font-medium">{format(value)}</span>
      </div>
      <input
        type="range"
        className="mt-3"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Loan() {
  const [amount, setAmount] = useState(80000);
  const [months, setMonths] = useState(48);
  const [rate, setRate] = useState(5.2);

  const r = rate / 1200;
  const pmt = r === 0 ? amount / months : (amount * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const total = pmt * months;
  const interest = total - amount;

  const remaining: { label: string; value: number }[] = [];
  let bal = amount;
  for (let m = 1; m <= months; m++) {
    bal -= pmt - bal * r;
    if (m % 12 === 0 || m === months) {
      remaining.push({ label: m % 12 === 0 ? `Y${m / 12}` : `M${m}`, value: Math.max(bal, 0) });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">
        <Slider label="Loan amount" value={amount} min={5000} max={300000} step={1000} onChange={setAmount} format={(n) => money(n)} />
        <Slider label="Duration" value={months} min={6} max={84} step={6} onChange={setMonths} format={(n) => `${n} months`} />
        <Slider label="Interest rate" value={rate} min={2} max={12} step={0.1} onChange={setRate} format={(n) => `${n.toFixed(1)} %`} />
      </div>
      <div className="space-y-5 lg:col-span-3">
        <div className="flex flex-wrap items-center gap-6">
          <Donut
            size={140}
            segments={[
              { value: amount, color: "#8b7cf6" },
              { value: Math.max(interest, 0.01), color: "#fbbf24" },
            ]}
          >
            <span className="label">Monthly</span>
            <span className="mt-0.5 text-base font-semibold">{plain(pmt)}</span>
          </Donut>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8b7cf6]" />
              <dt className="w-28 text-[var(--muted)]">Borrowed</dt>
              <dd className="font-medium">{money(amount)}</dd>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
              <dt className="w-28 text-[var(--muted)]">Interest</dt>
              <dd className="font-medium">{money(interest)}</dd>
            </div>
            <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3">
              <span className="h-2.5 w-2.5" />
              <dt className="w-28 text-[var(--muted)]">Total to repay</dt>
              <dd className="font-semibold">{money(total)}</dd>
            </div>
          </dl>
        </div>
        <div>
          <p className="label mb-3">Remaining balance over time</p>
          <Bars data={remaining} />
        </div>
      </div>
    </div>
  );
}

function Savings() {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(1000);
  const [rate, setRate] = useState(3.5);
  const [years, setYears] = useState(5);

  const r = rate / 1200;
  const series: { label: string; value: number }[] = [];
  let bal = initial;
  for (let m = 1; m <= years * 12; m++) {
    bal = bal * (1 + r) + monthly;
    if (m % 12 === 0) series.push({ label: `Y${m / 12}`, value: bal });
  }
  const contributed = initial + monthly * years * 12;
  const gained = bal - contributed;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">
        <Slider label="Starting amount" value={initial} min={0} max={200000} step={1000} onChange={setInitial} format={(n) => money(n)} />
        <Slider label="Monthly deposit" value={monthly} min={0} max={20000} step={100} onChange={setMonthly} format={(n) => money(n)} />
        <Slider label="Yearly rate" value={rate} min={0.5} max={8} step={0.1} onChange={setRate} format={(n) => `${n.toFixed(1)} %`} />
        <Slider label="Duration" value={years} min={1} max={20} step={1} onChange={setYears} format={(n) => `${n} years`} />
      </div>
      <div className="space-y-5 lg:col-span-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="label">Final capital</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ok)]">{money(bal)}</p>
          </div>
          <div className="card p-4">
            <p className="label">You put in</p>
            <p className="mt-2 text-lg font-semibold">{money(contributed)}</p>
          </div>
          <div className="card p-4">
            <p className="label">Interest earned</p>
            <p className="mt-2 text-lg font-semibold text-[var(--amber)]">{money(gained)}</p>
          </div>
        </div>
        <div>
          <p className="label mb-3">Capital growth by year</p>
          <Bars data={series} />
        </div>
      </div>
    </div>
  );
}

const RATES: Record<string, number> = { MAD: 1, EUR: 0.092, USD: 0.1, GBP: 0.079, CHF: 0.088, AED: 0.367 };

function Exchange() {
  const [amount, setAmount] = useState(1000);
  const [from, setFrom] = useState("MAD");
  const [to, setTo] = useState("EUR");

  const convert = (code: string) => (amount / RATES[from]) * RATES[code];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-2">
        <div>
          <label className="label">Amount</label>
          <input
            className="input mt-2"
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label">From</label>
            <select className="input mt-2" value={from} onChange={(e) => setFrom(e.target.value)}>
              {Object.keys(RATES).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            className="btn btn-ghost !px-3"
            aria-label="Swap"
          >
            <Icon name="swap" size={16} />
          </button>
          <div className="flex-1">
            <label className="label">To</label>
            <select className="input mt-2" value={to} onChange={(e) => setTo(e.target.value)}>
              {Object.keys(RATES).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="glow-card p-5">
          <p className="label">You get</p>
          <p className="mt-2 text-3xl font-semibold">
            {convert(to).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
            <span className="ml-2 text-base font-normal text-[var(--muted)]">{to}</span>
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">Indicative demo rates, no real conversion is made.</p>
      </div>
      <div className="lg:col-span-3">
        <p className="label mb-3">
          {plain(amount)} {from} is worth
        </p>
        <ul className="card divide-y divide-[var(--line)]">
          {Object.keys(RATES)
            .filter((c) => c !== from)
            .map((c, i) => (
              <li key={c} className="rise flex items-center justify-between px-5 py-3.5 text-sm" style={delay(i)}>
                <span className="font-medium">{c}</span>
                <span>{convert(c).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tab, setTab] = useState<Tab>("loan");

  useEffect(() => {
    api.offers().then(setOffers).catch(() => {});
  }, []);

  function go(t: Tab) {
    setTab(t);
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Arthix Banque</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Offers & tools</h1>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((o, i) => {
          const st = STYLES[i % STYLES.length];
          const t = o.title.toLowerCase();
          const tool: Tab | null = t.includes("credit") ? "loan" : t.includes("epargne") ? "savings" : t.includes("devise") ? "exchange" : null;
          const href = t.includes("paiement") || t.includes("cashback") ? "/payments" : t.includes("carte") ? "/deposit" : null;
          return (
            <div
              key={o.title}
              className="rise card card-hover flex flex-col p-6"
              style={{ ...delay(i + 1), ["--c" as string]: st.color + "88" }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: st.color + "22", color: st.color }}
              >
                <Icon name={st.icon} size={20} />
              </span>
              <h3 className="mt-4 font-medium">{o.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">{o.description}</p>
              {tool && (
                <button onClick={() => go(tool)} className="mt-4 flex items-center gap-2 text-sm transition hover:gap-3" style={{ color: st.color }}>
                  Try the simulator <Icon name="arrow" size={15} />
                </button>
              )}
              {href && (
                <Link href={href} className="mt-4 flex items-center gap-2 text-sm transition hover:gap-3" style={{ color: st.color }}>
                  Get started <Icon name="arrow" size={15} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <section id="tools" className="rise card mt-10 scroll-mt-6 p-6 sm:p-8" style={delay(8)}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Financial tools</h2>
          <div className="flex gap-2">
            {(
              [
                ["loan", "Loan simulator"],
                ["savings", "Savings projector"],
                ["exchange", "Currency exchange"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`chip ${tab === id ? "chip-active" : ""}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {tab === "loan" && <Loan />}
        {tab === "savings" && <Savings />}
        {tab === "exchange" && <Exchange />}
      </section>
    </AppShell>
  );
}