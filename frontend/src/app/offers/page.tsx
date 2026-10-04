"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Bars, Donut } from "@/components/Charts";
import Icon from "@/components/Icon";
import Select from "@/components/Select";
import "./offers.css";
import { api, Offer } from "@/lib/api";
import { delay, money, plain } from "@/lib/format";

type Tab = "loan" | "savings" | "exchange";

const IMAGES: [string, string][] = [
  ["carte", "/images/offer-card.jpg"],
  ["credit", "/images/offer-credit.jpg"],
  ["epargne", "/images/offer-savings.jpg"],
  ["paiement", "/images/offer-payments.jpg"],
  ["devise", "/images/offer-exchange.jpg"],
  ["cashback", "/images/offer-cashback.jpg"],
];
const imageFor = (title: string) =>
  IMAGES.find(([k]) => title.toLowerCase().includes(k))?.[1] ?? "/images/offer-card.jpg";

function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (n: number) => void; format: (n: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="text-sm">{format(value)}</span>
      </div>
      <input type="range" className="mt-3" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
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
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">
        <Slider label="Loan amount" value={amount} min={5000} max={300000} step={1000} onChange={setAmount} format={(n) => money(n)} />
        <Slider label="Duration" value={months} min={6} max={84} step={6} onChange={setMonths} format={(n) => `${n} months`} />
        <Slider label="Interest rate" value={rate} min={2} max={12} step={0.1} onChange={setRate} format={(n) => `${n.toFixed(1)} %`} />
      </div>
      <div className="space-y-6 lg:col-span-3">
        <div className="flex flex-wrap items-center gap-8">
          <Donut size={130} segments={[{ value: amount, color: "#7c6df0" }, { value: Math.max(interest, 0.01), color: "#cfcbf9" }]}>
            <span className="label">Monthly</span>
            <span className="serif mt-0.5 text-lg">{plain(pmt)}</span>
          </Donut>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full" style={{ background: "#7c6df0" }} />
              <dt className="w-28 text-[var(--muted)]">Borrowed</dt>
              <dd>{money(amount)}</dd>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full" style={{ background: "#cfcbf9" }} />
              <dt className="w-28 text-[var(--muted)]">Interest</dt>
              <dd>{money(interest)}</dd>
            </div>
            <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3">
              <span className="h-2 w-2" />
              <dt className="w-28 text-[var(--muted)]">Total to repay</dt>
              <dd className="font-medium">{money(total)}</dd>
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
  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">
        <Slider label="Starting amount" value={initial} min={0} max={200000} step={1000} onChange={setInitial} format={(n) => money(n)} />
        <Slider label="Monthly deposit" value={monthly} min={0} max={20000} step={100} onChange={setMonthly} format={(n) => money(n)} />
        <Slider label="Yearly rate" value={rate} min={0.5} max={8} step={0.1} onChange={setRate} format={(n) => `${n.toFixed(1)} %`} />
        <Slider label="Duration" value={years} min={1} max={20} step={1} onChange={setYears} format={(n) => `${n} years`} />
      </div>
      <div className="space-y-6 lg:col-span-3">
        <div className="card grid divide-x divide-[var(--line)] sm:grid-cols-3">
          {[
            ["Final capital", money(bal)],
            ["You put in", money(contributed)],
            ["Interest earned", money(bal - contributed)],
          ].map(([k, v]) => (
            <div key={k} className="p-4">
              <p className="label">{k}</p>
              <p className="serif mt-2 text-lg">{v}</p>
            </div>
          ))}
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

const CUR: Record<string, string> = { MAD: "Moroccan dirham", EUR: "Euro", USD: "US dollar", GBP: "British pound", CHF: "Swiss franc", AED: "UAE dirham" };
const curOptions = Object.keys(RATES).map((c) => ({ value: c, label: c, hint: CUR[c] }));

function Exchange() {
  const [amount, setAmount] = useState(1000);
  const [from, setFrom] = useState("MAD");
  const [to, setTo] = useState("EUR");
  const convert = (code: string) => (amount / RATES[from]) * RATES[code];
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-2">
        <div>
          <label className="label">Amount</label>
          <input className="input mt-2" type="number" min="0" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label">From</label>
            <Select value={from} onChange={setFrom} options={curOptions} searchable={false} />
          </div>
          <button onClick={() => { setFrom(to); setTo(from); }} className="btn btn-ghost !px-3" aria-label="Swap">
            <Icon name="swap" size={16} />
          </button>
          <div className="flex-1">
            <label className="label">To</label>
            <Select value={to} onChange={setTo} options={curOptions} searchable={false} />
          </div>
        </div>
        <div className="glow-card p-5">
          <p className="label">You get</p>
          <p className="serif mt-2 text-4xl">
            {fmt(convert(to))}
            <span className="ml-2 text-base text-[var(--muted)]">{to}</span>
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">Indicative demo rates, no real conversion is made.</p>
      </div>
      <div className="lg:col-span-3">
        <p className="label mb-3">{plain(amount)} {from} is worth</p>
        <ul className="card divide-y divide-[var(--line)]">
          {Object.keys(RATES).filter((c) => c !== from).map((c, i) => (
            <li key={c} className="rise flex items-center justify-between px-5 py-3.5 text-sm" style={delay(i)}>
              <span>{c}</span>
              <span>{fmt(convert(c))}</span>
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
      <header className="rise">
        <p className="label">Arthix Banque</p>
        <h1 className="serif mt-2 text-4xl">Offers & tools</h1>
      </header>

      <div className="mt-10">
      <div className="of-grid">
        {offers.map((o, i) => {
          const t = o.title.toLowerCase();
          const tool: Tab | null = t.includes("credit") ? "loan" : t.includes("epargne") ? "savings" : t.includes("devise") ? "exchange" : null;
          const href = t.includes("paiement") || t.includes("cashback") ? "/payments" : t.includes("carte") ? "/deposit" : null;
          const inner = (
            <>
              <div className="of-media">
                <div style={{ backgroundImage: `url(${imageFor(o.title)})` }} />
                <span className="of-badge">{tool ? "Simulator" : "Service"}</span>
                <span className="of-num">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="of-body">
                <h3>{o.title}</h3>
                <p>{o.description}</p>
                <div className="of-cta">
                  <span>{tool ? "Try the simulator" : "Get started"}</span>
                  <span className="of-arrow"><Icon name="arrow" size={15} /></span>
                </div>
              </div>
            </>
          );
          return tool ? (
            <button key={o.title} onClick={() => go(tool)} className="of-card rise" style={delay(i + 1)}>{inner}</button>
          ) : (
            <Link key={o.title} href={href ?? "/payments"} className="of-card rise" style={delay(i + 1)}>{inner}</Link>
          );
        })}
      </div>
      </div>


      <section id="tools" className="rise card mt-12 scroll-mt-6 p-6 sm:p-8" style={delay(8)}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="serif text-2xl">Financial tools</h2>
          <div className="flex gap-2">
            {([["loan", "Loan"], ["savings", "Savings"], ["exchange", "Exchange"]] as [Tab, string][]).map(([id, label]) => (
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