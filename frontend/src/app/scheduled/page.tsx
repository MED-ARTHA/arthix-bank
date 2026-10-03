"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { api, Scheduled } from "@/lib/api";
import { delay, money } from "@/lib/format";

const FREQ = { ONCE: "One time", WEEKLY: "Every week", MONTHLY: "Every month" } as const;
const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default function ScheduledPage() {
  const [items, setItems] = useState<Scheduled[]>([]);
  const [form, setForm] = useState({ toAccount: "", amount: "", note: "", frequency: "ONCE", firstRun: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.scheduled().then(setItems).catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.createScheduled({
        toAccount: form.toAccount.trim(),
        amount: Number(form.amount),
        note: form.note.trim() || undefined,
        frequency: form.frequency,
        firstRun: new Date(form.firstRun).toISOString(),
      });
      setForm({ toAccount: "", amount: "", note: "", frequency: "ONCE", firstRun: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: number) {
    try {
      await api.cancelScheduled(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Scheduled</p>
        <h1 className="serif mt-2 text-4xl">Scheduled transfers</h1>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="rise card space-y-5 p-6 lg:col-span-2" style={delay(1)}>
          <div>
            <label className="label">Recipient account</label>
            <input className="input mt-2 tracking-wide" placeholder="ARX0000000000000" required maxLength={20}
              value={form.toAccount} onChange={(e) => setForm({ ...form, toAccount: e.target.value })} />
          </div>
          <div>
            <label className="label">Amount (MAD)</label>
            <input className="input mt-2" type="number" step="0.01" min="0.01" required placeholder="0.00"
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">First run</label>
            <input className="input mt-2" type="datetime-local" required
              value={form.firstRun} onChange={(e) => setForm({ ...form, firstRun: e.target.value })} />
          </div>
          <div>
            <label className="label">Repeat</label>
            <select className="input mt-2" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              <option value="ONCE">One time</option>
              <option value="WEEKLY">Every week</option>
              <option value="MONTHLY">Every month</option>
            </select>
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input className="input mt-2" maxLength={100} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          {error && <p className="text-sm text-[var(--err)]">{error}</p>}
          <button disabled={busy} className="btn btn-primary w-full">{busy ? "Saving..." : "Schedule transfer"}</button>
        </form>

        <section className="rise card p-6 lg:col-span-3" style={delay(2)}>
          <p className="text-sm">Your schedule</p>
          {items.length === 0 ? (
            <div className="py-14 text-center text-sm text-[var(--muted)]">
              <CalendarClock className="mx-auto mb-3" size={28} strokeWidth={1.2} />
              Nothing scheduled yet.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--line)]">
              {items.map((s) => (
                <li key={s.id} className="flex items-center gap-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm tracking-wide">{s.toAccount}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {FREQ[s.frequency]} &middot; {s.status === "ACTIVE" ? `next ${fmt(s.nextRun)}` : s.status === "DONE" ? "completed" : "failed"}
                    </p>
                    {s.lastError && <p className="mt-0.5 text-xs text-[var(--err)]">{s.lastError}</p>}
                  </div>
                  <p className="text-sm font-medium">{money(s.amount)}</p>
                  <button onClick={() => cancel(s.id)} className="text-[var(--muted)] hover:text-white" aria-label="Cancel">
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}