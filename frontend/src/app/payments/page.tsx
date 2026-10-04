"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Receipt from "@/components/Receipt";
import Select from "@/components/Select";
import { api, Me, Provider, Transaction } from "@/lib/api";
import { delay, money } from "@/lib/format";

const ALL = "All";

export default function PaymentsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [cat, setCat] = useState(ALL);
  const [form, setForm] = useState({ provider: "", reference: "", amount: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.providers().then((p) => {
      setProviders(p);
      setForm((f) => ({ ...f, provider: p[0]?.id ?? "" }));
    }).catch(() => {});
  }, []);

  const categories = useMemo(() => [ALL, ...Array.from(new Set(providers.map((p) => p.category)))], [providers]);
  const options = useMemo(
    () => providers
      .filter((p) => cat === ALL || p.category === cat)
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
      .map((p) => ({ value: p.id, label: p.name, group: p.category })),
    [providers, cat]
  );

  function pickCategory(c: string) {
    setCat(c);
    const first = providers.find((p) => c === ALL || p.category === c);
    if (first && !(providers.find((p) => p.id === form.provider && (c === ALL || p.category === c)))) {
      setForm((f) => ({ ...f, provider: first.id }));
    }
  }

  const amount = Number(form.amount);
  const tooMuch = !!me && amount > me.balance;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const t = await api.pay({ provider: form.provider, reference: form.reference.trim(), amount });
      setReceipt(t);
      setMe((m) => (m ? { ...m, balance: t.balanceAfter } : m));
      setForm((f) => ({ ...f, reference: "", amount: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Payments</p>
        <h1 className="serif mt-2 text-4xl">Pay a bill or school fee</h1>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <form onSubmit={onSubmit} className="rise card space-y-6 p-6 md:col-span-3" style={delay(1)}>
          <div>
            <label className="label">Category</label>
            <div className="chips">
              {categories.map((c) => (
                <button type="button" key={c} onClick={() => pickCategory(c)} className={"chip" + (c === cat ? " on" : "")}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Beneficiary</label>
            <Select value={form.provider} onChange={(v) => setForm({ ...form, provider: v })} options={options} placeholder="Choose a beneficiary" />
          </div>
          <div>
            <label className="label">Reference</label>
            <input className="input mt-2" placeholder="Invoice or student number" required value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
          <div>
            <label className="label">Amount (MAD)</label>
            <input className="input mt-2" type="number" step="0.01" min="0.01" placeholder="0.00" required value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            {tooMuch && <p className="mt-2 text-xs text-[var(--err)]">Amount is higher than your balance.</p>}
          </div>
          {error && <p className="text-sm text-[var(--err)]">{error}</p>}
          <button disabled={loading || tooMuch || !form.provider} className="btn btn-primary w-full">
            {loading ? "Processing..." : "Confirm payment"}
          </button>
        </form>

        <aside className="rise card h-fit space-y-5 p-6 md:col-span-2" style={delay(2)}>
          <div>
            <p className="label">Paying from</p>
            <p className="mt-1 text-sm font-medium tracking-wide">{me?.accountNumber ?? "-"}</p>
          </div>
          <div>
            <p className="label">Available</p>
            <p className="mt-1 text-xl font-semibold">{me ? money(me.balance) : "-"}</p>
          </div>
          <p className="border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
            A receipt is issued after each payment. You can print it or save it as a PDF.
          </p>
        </aside>
      </div>

      {receipt && <Receipt tx={receipt} onClose={() => setReceipt(null)} />}
    </AppShell>
  );
}