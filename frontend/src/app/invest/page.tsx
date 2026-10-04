"use client";

import "./invest.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Donut } from "@/components/Charts";
import { inv, type Instrument, type Holding, type Model, type Order, type Portfolio } from "@/lib/investApi";
import { delay, money } from "@/lib/format";
import EventsFeed, { EventsTicker } from "@/components/EventsFeed";

type Tab = "portfolio" | "market" | "smart" | "news" | "history";
const FEE = 0.002;
const COLORS: Record<string, string> = {
  Equities: "#7c6df0", Bonds: "#5cc9a7", Commodities: "#e0b04a", "Real estate": "#6fb3f2", Digital: "#ef7480",
};
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)} %`;
const cls = (n: number) => (n >= 0 ? "up" : "down");
const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function Spark({ data, w = 96, h = 32 }: { data: number[]; w?: number; h?: number }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`);
  const up = data[data.length - 1] >= data[0];
  const c = up ? "#5cc9a7" : "#ef7480";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={c} fillOpacity="0.1" stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Risk({ n }: { n: number }) {
  return <span className="inv-risk" title={`Risk ${n}/5`}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</span>;
}

/* ------------------------- trade modal ------------------------- */
function Trade({ inst, held, cash, startSide, onClose, onDone }: {
  inst: Instrument; held?: Holding; cash: number; startSide: "BUY" | "SELL";
  onClose: () => void; onDone: (msg: string) => void;
}) {
  const [side, setSide] = useState<"BUY" | "SELL">(held ? startSide : "BUY");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const a = Number(amount) || 0;
  const max = side === "BUY" ? cash : held?.value ?? 0;
  const fee = a * FEE;
  const units = side === "BUY" ? (a - fee) / inst.price : a / inst.price;
  const all = side === "SELL" && !!held && a >= held.value - 0.01;

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      if (side === "BUY") await inv.buy(inst.symbol, a);
      else await inv.sell(inst.symbol, all ? null : a, all);
      onDone(`${side === "BUY" ? "Bought" : "Sold"} ${inst.name}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div className="inv-modal" onMouseDown={onClose}>
      <div className="inv-sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="label">{inst.symbol} · {inst.category}</p>
            <h3 className="serif mt-1 text-2xl">{inst.name}</h3>
            <p className="mt-1 text-sm">{money(inst.price)} <span className={cls(inst.changePct)}>{pct(inst.changePct)}</span></p>
          </div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="inv-seg mt-5">
          <button className={side === "BUY" ? "on" : ""} onClick={() => setSide("BUY")}>Buy</button>
          <button className={side === "SELL" ? "on" : ""} onClick={() => held && setSide("SELL")} disabled={!held}>Sell</button>
        </div>

        <label className="label mt-5 block">Amount (MAD)</label>
        <input className="input mt-2" type="number" min="0" step="0.01" placeholder="0.00" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          {[100, 500, 1000, 5000].map((v) => (
            <button key={v} className="inv-pill" onClick={() => setAmount(String(Math.min(v, Math.floor(max))))}>{v}</button>
          ))}
          <button className="inv-pill" onClick={() => setAmount(String(Math.floor(max * 100) / 100))}>Max</button>
        </div>

        <div className="inv-sum">
          <div><span>{side === "BUY" ? "Available" : "Position value"}</span><b>{money(max)}</b></div>
          <div><span>Fee (0,2 %)</span><b>{money(fee)}</b></div>
          <div><span>{side === "BUY" ? "You get" : "You sell"}</span><b>{units > 0 ? units.toFixed(4) : "0"} units</b></div>
          {side === "SELL" && <div><span>You receive</span><b>{money(Math.max(a - fee, 0))}</b></div>}
        </div>

        {err && <p className="mt-3 text-sm text-[var(--err)]">{err}</p>}
        <button disabled={busy || a < (side === "BUY" ? 50 : 0.01) || a > max + 0.001} onClick={submit} className="btn btn-primary mt-5 w-full">
          {busy ? "Processing..." : `${side === "BUY" ? "Buy" : "Sell"} ${a > 0 ? money(a) : ""}`}
        </button>
        <p className="mt-3 text-center text-[11px] text-[var(--muted)]">Minimum 50 MAD to buy. Simulated market, no real funds.</p>
      </div>
    </div>
  );
}

/* ------------------------- smart portfolio ------------------------- */
const QUIZ: { q: string; opts: [string, number][] }[] = [
  { q: "How long can you leave this money invested?", opts: [["Under 2 years", 1], ["2 to 5 years", 2], ["More than 5 years", 3]] },
  { q: "Your portfolio drops 15 % in a month. You...", opts: [["Sell to stop the loss", 1], ["Wait and see", 2], ["Buy more", 3]] },
  { q: "What matters most?", opts: [["Protecting my capital", 1], ["Balance of both", 2], ["Maximum growth", 3]] },
  { q: "Your experience with investing", opts: [["Beginner", 1], ["Some experience", 2], ["Experienced", 3]] },
];

function Smart({ models, cash, onDone }: { models: Model[]; cash: number; onDone: (m: string) => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(QUIZ.map(() => null));
  const [pick, setPick] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const done = answers.every((x) => x !== null);
  const score = answers.reduce<number>((s, x) => s + (x ?? 0), 0);
  const recommended = !done ? null : score <= 6 ? "prudent" : score <= 9 ? "balanced" : "dynamic";
  const current = models.find((m) => m.id === (pick ?? recommended));
  const a = Number(amount) || 0;

  async function apply() {
    if (!current) return;
    setErr("");
    setBusy(true);
    try {
      await inv.apply(current.id, a);
      onDone(`${current.name} portfolio created`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <section className="card p-6 lg:col-span-2">
        <div className="mb-5 flex items-center gap-2"><Sparkles size={16} className="text-[#a89ff5]" /><p className="text-sm">Find your investor profile</p></div>
        {QUIZ.map((q, qi) => (
          <div key={qi} className="inv-q">
            <p className="text-sm">{q.q}</p>
            <div className="inv-opts">
              {q.opts.map(([label, v]) => (
                <button key={label} className={"inv-pill" + (answers[qi] === v ? " on" : "")}
                  onClick={() => { setAnswers(answers.map((x, i) => (i === qi ? v : x))); setPick(null); }}>{label}</button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="card p-6 lg:col-span-3">
        {!current ? (
          <div className="py-16 text-center text-sm text-[var(--muted)]">Answer the 4 questions to get a portfolio built for you.</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {models.map((m) => (
                <button key={m.id} className={"inv-pill" + (current.id === m.id ? " on" : "")} onClick={() => setPick(m.id)}>
                  {m.name}{m.id === recommended ? " · recommended" : ""}
                </button>
              ))}
            </div>
            <h3 className="serif mt-5 text-3xl">{current.name}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{current.tagline}</p>
            <div className="mt-4 flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2"><span className="label">Risk</span><Risk n={current.risk} /></span>
              <span><span className="label mr-2">Illustrative return</span>~{current.expectedReturn} % / year</span>
            </div>

            <div className="inv-bar mt-6">
              {current.parts.map((p, i) => <i key={p.symbol} style={{ width: `${p.pct}%`, background: ["#7c6df0", "#5cc9a7", "#e0b04a", "#6fb3f2", "#ef7480", "#b9b3f7"][i % 6] }} />)}
            </div>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {current.parts.map((p, i) => (
                <li key={p.symbol} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: ["#7c6df0", "#5cc9a7", "#e0b04a", "#6fb3f2", "#ef7480", "#b9b3f7"][i % 6] }} />
                  <span className="truncate">{p.name}</span><span className="ml-auto text-[var(--muted)]">{p.pct} %</span>
                </li>
              ))}
            </ul>

            <label className="label mt-6 block">Amount to invest (MAD)</label>
            <input className="input mt-2" type="number" min={current.minAmount} placeholder={`Min ${current.minAmount}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="mt-2 text-xs text-[var(--muted)]">Available: {money(cash)}. Split automatically across {current.parts.length} instruments, 0,2 % fee on each.</p>
            {err && <p className="mt-3 text-sm text-[var(--err)]">{err}</p>}
            <button disabled={busy || a < current.minAmount || a > cash} onClick={apply} className="btn btn-primary mt-4 w-full">
              {busy ? "Investing..." : `Invest ${a > 0 ? money(a) : ""} in ${current.name}`}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

/* ------------------------- page ------------------------- */
export default function InvestPage() {
  const [tab, setTab] = useState<Tab>("portfolio");
  const [market, setMarket] = useState<Instrument[]>([]);
  const [pf, setPf] = useState<Portfolio | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [cat, setCat] = useState("All");
  const [trade, setTrade] = useState<{ inst: Instrument; side: "BUY" | "SELL" } | null>(null);
  const [toast, setToast] = useState("");

  const loadMarket = useCallback(() => { inv.market().then(setMarket).catch(() => {}); }, []);
  const loadPf = useCallback(() => { inv.portfolio().then(setPf).catch(() => {}); }, []);
  const loadOrders = useCallback(() => { inv.orders().then(setOrders).catch(() => {}); }, []);

  useEffect(() => {
    loadMarket(); loadPf(); loadOrders();
    inv.models().then(setModels).catch(() => {});
    const m = setInterval(loadMarket, 5000);
    const p = setInterval(loadPf, 15000);
    return () => { clearInterval(m); clearInterval(p); };
  }, [loadMarket, loadPf, loadOrders]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  function done(msg: string) {
    setTrade(null);
    setToast(msg);
    loadPf(); loadOrders(); loadMarket();
  }

  const cats = useMemo(() => ["All", ...Array.from(new Set(market.map((i) => i.category)))], [market]);
  const shown = market.filter((i) => cat === "All" || i.category === cat);
  const heldOf = (s: string) => pf?.holdings.find((h) => h.symbol === s);
  const instOf = (s: string) => market.find((i) => i.symbol === s);

  return (
    <AppShell>
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Arthix Invest</p>
          <h1 className="serif mt-2 text-4xl">Invest</h1>
        </div>
        <div className="inv-tabs">
          {([["portfolio", "Portfolio"], ["market", "Market"], ["smart", "Smart portfolio"], ["news", "Events"], ["history", "History"]] as [Tab, string][]).map(([id, l]) => (
            <button key={id} className={"inv-tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>
          ))}
        </div>
      </div>

      <EventsTicker onOpen={() => setTab("news")} />

      <div className="mt-8">
        {tab === "portfolio" && (
          <>
            <section className="glow-card rise p-7" style={delay(1)}>
              <div className="inv-hero">
                <div>
                  <p className="label">Total wealth</p>
                  <p className="inv-total mt-2">{pf ? money(pf.total) : "-"}</p>
                  <div className="inv-kpis">
                    <div><small>Cash</small><b>{pf ? money(pf.cash) : "-"}</b></div>
                    <div><small>Invested</small><b>{pf ? money(pf.invested) : "-"}</b></div>
                    <div><small>Gain / loss</small><b className={pf ? cls(pf.pnl) : ""}>{pf ? `${money(pf.pnl)} (${pct(pf.pnlPct)})` : "-"}</b></div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {pf && pf.allocation.length > 0 ? (
                    <>
                      <Donut size={140} segments={pf.allocation.map((a) => ({ value: a.value, color: COLORS[a.category] ?? "#b9b3f7" }))}>
                        <span className="label">Invested</span>
                      </Donut>
                      <div className="inv-legend">
                        {pf.allocation.map((a) => (
                          <div key={a.category}><i style={{ background: COLORS[a.category] ?? "#b9b3f7" }} />{a.category}<span>{((a.value / pf.invested) * 100).toFixed(0)} %</span></div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">Your allocation will appear here after your first investment.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="card rise mt-4" style={delay(2)}>
              {!pf || pf.holdings.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="serif text-2xl">Start investing</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">Pick instruments in the market, or let the Smart portfolio build one for your profile.</p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button className="btn btn-primary" onClick={() => setTab("smart")}>Smart portfolio</button>
                    <button className="btn btn-ghost" onClick={() => setTab("market")}>Browse market</button>
                  </div>
                </div>
              ) : (
                pf.holdings.map((h) => (
                  <div key={h.symbol} className="inv-row">
                    <div className="inv-name"><b>{h.name}</b><small>{h.symbol} · {h.units.toFixed(4)} units · avg {money(h.avgPrice)}</small></div>
                    <div className="hide-s"><Spark data={h.history} /></div>
                    <div><b className="text-sm font-medium">{money(h.value)}</b></div>
                    <div className={"hide-s text-sm " + cls(h.pnl)}>{money(h.pnl)}<br /><small>{pct(h.pnlPct)}</small></div>
                    <div className="inv-btns">
                      <button className="inv-mini fill" onClick={() => { const i = instOf(h.symbol); if (i) setTrade({ inst: i, side: "BUY" }); }}>Buy</button>
                      <button className="inv-mini" onClick={() => { const i = instOf(h.symbol); if (i) setTrade({ inst: i, side: "SELL" }); }}>Sell</button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {tab === "market" && (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              {cats.map((c) => <button key={c} className={"inv-pill" + (cat === c ? " on" : "")} onClick={() => setCat(c)}>{c}</button>)}
            </div>
            <div className="inv-grid">
              {shown.map((i, n) => (
                <button key={i.symbol} className="inv-card rise" style={delay(n % 6)} onClick={() => setTrade({ inst: i, side: "BUY" })}>
                  <div className="flex items-start justify-between">
                    <div><p className="label">{i.symbol} · {i.category}</p><h3 className="serif mt-1 text-xl">{i.name}</h3></div>
                    <Risk n={i.risk} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{i.description}</p>
                  <div className="mt-4 flex items-end justify-between">
                    <div><p className="text-lg">{money(i.price)}</p><p className={"text-xs " + cls(i.changePct)}>{pct(i.changePct)}</p></div>
                    <Spark data={i.history} w={120} h={40} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "smart" && <Smart models={models} cash={pf?.cash ?? 0} onDone={(m) => { done(m); setTab("portfolio"); }} />}

        {tab === "news" && <EventsFeed />}

        {tab === "history" && (
          <section className="card">
            {orders.length === 0 ? (
              <p className="px-6 py-16 text-center text-sm text-[var(--muted)]">No orders yet.</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="inv-row" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr" }}>
                  <div className="inv-name"><b>{o.side === "BUY" ? "Bought" : "Sold"} {o.name}</b><small>{when(o.createdAt)}</small></div>
                  <div className="hide-s text-sm">{o.units.toFixed(4)} @ {money(o.price)}</div>
                  <div className="text-sm">{money(o.amount)}<br /><small className="text-[var(--muted)]">fee {money(o.fee)}</small></div>
                  <div className={"hide-s text-sm " + (o.pnl == null ? "" : cls(o.pnl))}>{o.pnl == null ? "" : `${money(o.pnl)} realised`}</div>
                </div>
              ))
            )}
          </section>
        )}
      </div>

      <p className="mt-8 text-center text-[11px] text-[var(--muted)]">
        Arthix Invest is a simulation. Prices are generated, returns are illustrative, and nothing here is financial advice.
      </p>

      {trade && <Trade inst={trade.inst} held={heldOf(trade.inst.symbol)} cash={pf?.cash ?? 0} startSide={trade.side} onClose={() => setTrade(null)} onDone={done} />}
      {toast && <div className="inv-toast">{toast}</div>}
    </AppShell>
  );
}