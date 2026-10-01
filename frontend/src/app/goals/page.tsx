"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Ring } from "@/components/Charts";
import Icon from "@/components/Icon";
import { api, Goal } from "@/lib/api";
import { dateOnly, delay, money } from "@/lib/format";

const COLORS = ["#8b7cf6", "#2dd4bf", "#fbbf24", "#38bdf8", "#fb7185", "#4fd1a5"];

function GoalCard({ g, index, onChanged }: { g: Goal; index: number; onChanged: () => void }) {
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  const color = COLORS[g.id % COLORS.length];
  const pct = g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0;
  const done = pct >= 1;
  const remaining = Math.max(g.targetAmount - g.savedAmount, 0);
  const days = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 864e5) : null;
  const perMonth = days !== null && days > 0 && remaining > 0 ? remaining / Math.max(days / 30, 1) : null;

  async function move(kind: "deposit" | "withdraw") {
    const a = Number(amt);
    if (!(a > 0)) return;
    setErr("");
    setBusy(true);
    try {
      if (kind === "deposit") await api.goalDeposit(g.id, a);
      else await api.goalWithdraw(g.id, a);
      setAmt("");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDel) {
      setConfirmDel(true);
      setTimeout(() => setConfirmDel(false), 3000);
      return;
    }
    try {
      await api.deleteGoal(g.id);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="rise card card-hover p-6" style={{ ...delay(Math.min(index + 1, 6)), ["--c" as string]: color + "77" }}>
      <div className="flex items-center gap-5">
        <Ring value={pct} size={92} stroke={8} color={color}>
          <span className="text-sm font-semibold">{Math.min(Math.round(pct * 100), 100)}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{g.name}</h3>
            {done && (
              <span className="badge pulse-ok" style={{ background: "rgba(79,209,165,0.15)", color: "#4fd1a5" }}>
                Reached
              </span>
            )}
          </div>
          <p className="mt-1 text-sm">
            <span className="font-semibold" style={{ color }}>{money(g.savedAmount)}</span>
            <span className="text-[var(--muted)]"> of {money(g.targetAmount)}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {g.deadline
              ? days !== null && days > 0
                ? `${days} days left (${dateOnly(g.deadline)})`
                : `Deadline passed (${dateOnly(g.deadline)})`
              : "No deadline"}
          </p>
        </div>
      </div>

      {perMonth !== null && (
        <p className="mt-4 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-[var(--muted)]">
          <Icon name="bolt" size={12} /> Save about{" "}
          <span className="font-medium text-white">{money(perMonth)}</span> per month to get there on time.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <input
          className="input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
        />
        <button onClick={() => move("deposit")} disabled={busy || !(Number(amt) > 0)} className="btn btn-primary !px-4">
          Add
        </button>
        <button onClick={() => move("withdraw")} disabled={busy || !(Number(amt) > 0)} className="btn btn-ghost !px-4">
          Take
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-[var(--err)]">{err}</p>}

      <button
        onClick={remove}
        className={`mt-4 flex items-center gap-1.5 text-xs transition ${
          confirmDel ? "text-[var(--err)]" : "text-[var(--muted)] hover:text-white"
        }`}
      >
        <Icon name="trash" size={13} />
        {confirmDel ? "Click again to close (savings return to your balance)" : "Close goal"}
      </button>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [form, setForm] = useState({ name: "", target: "", deadline: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => api.goals().then(setGoals).catch(() => setGoals([]));
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.createGoal({
        name: form.name.trim(),
        targetAmount: Number(form.target),
        deadline: form.deadline || null,
      });
      setForm({ name: "", target: "", deadline: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const total = (goals ?? []).reduce((s, g) => s + g.savedAmount, 0);

  return (
    <AppShell>
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Savings goals</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Put money aside, on purpose</h1>
        </div>
        <div className="text-right">
          <p className="label">Total saved</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--teal)]">{money(total)}</p>
        </div>
      </div>

      <form onSubmit={create} className="rise card mt-8 p-6" style={delay(1)}>
        <p className="mb-4 text-sm font-medium">New goal</p>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="input md:col-span-2"
            placeholder="Laptop, trip, emergency fund..."
            maxLength={40}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            type="number"
            min="1"
            step="0.01"
            placeholder="Target (MAD)"
            required
            value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value })}
          />
          <input
            className="input"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
        </div>
        {error && <p className="mt-3 text-sm text-[var(--err)]">{error}</p>}
        <button disabled={loading} className="btn btn-primary mt-4">
          {loading ? "Creating..." : "Create goal"}
        </button>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {goals === null && (
          <>
            <div className="shimmer h-56 rounded-2xl" />
            <div className="shimmer h-56 rounded-2xl" />
          </>
        )}
        {goals?.length === 0 && (
          <div className="card p-10 text-center text-sm text-[var(--muted)] md:col-span-2">
            No goals yet. Create your first one above.
          </div>
        )}
        {goals?.map((g, i) => (
          <GoalCard key={g.id} g={g} index={i} onChanged={load} />
        ))}
      </div>
    </AppShell>
  );
}