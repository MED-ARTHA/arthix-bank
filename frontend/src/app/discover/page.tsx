"use client";

import "./discover.css";
import { useState } from "react";
import { Moon, Plane, Store, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import { BankCard, Banknote, CoinView } from "@/components/Money3D";
import { BANKS, COINS, CULTURE, NOTES, breakDown } from "@/lib/moroccan";

const TABS = [["notes", "Banknotes"], ["coins", "Coins"], ["banks", "Banks"], ["culture", "Culture"]] as const;
type Tab = (typeof TABS)[number][0];
const ICONS = { users: Users, plane: Plane, store: Store, moon: Moon };

export default function DiscoverPage() {
  const [tab, setTab] = useState<Tab>("notes");
  const [bankId, setBankId] = useState(BANKS[1].id);
  const [amount, setAmount] = useState("385");

  const bank = BANKS.find((b) => b.id === bankId) ?? BANKS[0];
  const parts = breakDown(Number(amount) || 0);

  return (
    <AppShell>
      <div className="dc">
        <header className="dc-head">
          <p className="label">Discover</p>
          <h1 className="serif">Money, the Moroccan way</h1>
          <p>The dirham in your hands, the banks you know, and the habits that make Moroccan money culture.</p>
        </header>

        <nav className="dc-tabs" aria-label="Sections">
          {TABS.map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>

        {tab === "notes" && (
          <section className="dc-grid">
            {NOTES.map((n) => (
              <figure key={n.value} className="dc-item">
                <Banknote note={n} />
                <figcaption><b>{n.value} DH</b><p>{n.fact}</p><small>Drag to rotate, click to flip, double-click to reset</small></figcaption>
              </figure>
            ))}
          </section>
        )}

        {tab === "coins" && (
          <section className="dc-grid dc-grid-coins">
            {COINS.map((c) => (
              <figure key={c.value} className="dc-item dc-item-coin">
                <CoinView coin={c} />
                <figcaption><b>{c.value} DH</b><p>{c.fact}</p><small>Drag to rotate</small></figcaption>
              </figure>
            ))}
          </section>
        )}

        {tab === "banks" && (
          <>
            <section className="dc-grid dc-grid-banks">
              {BANKS.map((b) => <BankCard key={b.id} bank={b} active={b.id === bankId} onPick={() => setBankId(b.id)} />)}
            </section>
            <aside className="dc-detail">
              <h3 className="serif">{bank.name}</h3>
              <span className="dc-pill">{bank.kind}</span>
              <p>{bank.blurb}</p>
            </aside>
          </>
        )}

        {tab === "culture" && (
          <section className="dc-culture">
            {CULTURE.map((c) => {
              const Icon = ICONS[c.icon];
              return (
                <article key={c.title} className="card">
                  <Icon size={20} strokeWidth={1.5} />
                  <h3 className="serif">{c.title}</h3>
                  <p>{c.text}</p>
                </article>
              );
            })}
          </section>
        )}

        <section className="dc-change card">
          <div>
            <h2 className="serif">Break it down</h2>
            <p>Type an amount and see which notes and coins make it up.</p>
          </div>
          <label className="dc-field">
            <input inputMode="numeric" value={amount} maxLength={7} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            <span>DH</span>
          </label>
          <ul className="dc-parts">
            {parts.map(([d, n]) => <li key={d}><b>{n} ×</b> {d} DH</li>)}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}