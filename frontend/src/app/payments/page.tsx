"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, Provider } from "@/lib/api";

export default function PaymentsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState({ provider: "", reference: "", amount: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .providers()
      .then((p) => {
        setProviders(p);
        setForm((f) => ({ ...f, provider: p[0]?.id ?? "" }));
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const t = await api.pay({
        provider: form.provider,
        reference: form.reference,
        amount: Number(form.amount),
      });
      setMsg({ ok: true, text: `Payment done. New balance: ${t.balanceAfter.toFixed(2)} MAD` });
      setForm((f) => ({ ...f, reference: "", amount: "" }));
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-600";

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Payments</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow">
        <select
          className={input}
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.category === "SCHOOLS" ? "School" : "Bill"} · {p.name}
            </option>
          ))}
        </select>
        <input
          className={input}
          placeholder="Reference (invoice / student number)"
          required
          value={form.reference}
          onChange={(e) => setForm({ ...form, reference: e.target.value })}
        />
        <input
          className={input}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Amount (MAD)"
          required
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        {msg && <p className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "..." : "Pay"}
        </button>
      </form>
    </AppShell>
  );
}