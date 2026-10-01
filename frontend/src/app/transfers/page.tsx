"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Receipt from "@/components/Receipt";
import { api, Me, Recipient, Transaction } from "@/lib/api";
import { delay, money } from "@/lib/format";

const ACCOUNT_RE = /^ARX\d{13}$/;

export default function TransfersPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ account: "", amount: "", note: "" });
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);
  const [step, setStep] = useState<"form" | "review">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  const account = form.account.replace(/\s+/g, "").toUpperCase();
  const amount = Number(form.amount);
  const tooMuch = !!me && amount > me.balance;
  const canReview = !!recipient && amount > 0 && !tooMuch;

  useEffect(() => {
    setRecipient(null);
    setLookupError("");
    if (!ACCOUNT_RE.test(account)) return;
    let cancelled = false;
    setLooking(true);
    api
      .lookup(account)
      .then((r) => !cancelled && setRecipient(r))
      .catch((e) => !cancelled && setLookupError(e instanceof Error ? e.message : "Error"))
      .finally(() => !cancelled && setLooking(false));
    return () => {
      cancelled = true;
    };
  }, [account]);

  async function confirm() {
    setError("");
    setLoading(true);
    try {
      const t = await api.transfer({ toAccount: account, amount, note: form.note.trim() });
      setReceipt(t);
      setMe((m) => (m ? { ...m, balance: t.balanceAfter } : m));
      setForm({ account: "", amount: "", note: "" });
      setStep("form");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Transfers</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Send money</h1>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        {step === "form" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canReview) setStep("review");
            }}
            className="rise card space-y-5 p-6 md:col-span-3"
            style={delay(1)}
          >
            <div>
              <label className="label">Beneficiary account</label>
              <input
                className="input mt-2 tracking-wide"
                placeholder="ARX0000000000000"
                maxLength={20}
                required
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
              />
              <div className="mt-2 min-h-5 text-xs">
                {looking && <span className="text-[var(--muted)]">Checking account...</span>}
                {recipient && (
                  <span className="text-[var(--ok)]">Account holder: {recipient.fullName}</span>
                )}
                {lookupError && <span className="text-[var(--err)]">{lookupError}</span>}
              </div>
            </div>

            <div>
              <label className="label">Amount (MAD)</label>
              <input
                className="input mt-2"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              {tooMuch && <p className="mt-2 text-xs text-[var(--err)]">Amount is higher than your balance.</p>}
            </div>

            <div>
              <label className="label">Note (optional)</label>
              <input
                className="input mt-2"
                placeholder="Rent, dinner..."
                maxLength={100}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            {error && <p className="text-sm text-[var(--err)]">{error}</p>}

            <button disabled={!canReview} className="btn btn-primary w-full">
              Review transfer
            </button>
          </form>
        ) : (
          <div className="pop card space-y-5 p-6 md:col-span-3">
            <p className="label">Review</p>
            <p className="text-4xl font-semibold tracking-tight">{money(amount)}</p>
            <dl className="divide-y divide-[var(--line)] text-sm">
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-[var(--muted)]">From</dt>
                <dd className="text-right font-medium">
                  {me?.fullName}
                  <span className="block text-xs font-normal tracking-wide text-[var(--muted)]">{me?.accountNumber}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-[var(--muted)]">To</dt>
                <dd className="text-right font-medium">
                  {recipient?.fullName}
                  <span className="block text-xs font-normal tracking-wide text-[var(--muted)]">{account}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-[var(--muted)]">Note</dt>
                <dd className="font-medium">{form.note.trim() || "-"}</dd>
              </div>
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-[var(--muted)]">Fees</dt>
                <dd className="font-medium">0,00 MAD</dd>
              </div>
            </dl>
            {error && <p className="text-sm text-[var(--err)]">{error}</p>}
            <div className="flex gap-3">
              <button onClick={confirm} disabled={loading} className="btn btn-primary flex-1">
                {loading ? "Sending..." : "Confirm and send"}
              </button>
              <button onClick={() => setStep("form")} disabled={loading} className="btn btn-ghost">
                Back
              </button>
            </div>
          </div>
        )}

        <aside className="rise card h-fit space-y-5 p-6 md:col-span-2" style={delay(2)}>
          <div>
            <p className="label">Sending from</p>
            <p className="mt-1 text-sm font-medium tracking-wide">{me?.accountNumber ?? "-"}</p>
          </div>
          <div>
            <p className="label">Available</p>
            <p className="mt-1 text-xl font-semibold">{me ? money(me.balance) : "-"}</p>
          </div>
          <p className="border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
            Transfers between Arthix accounts are instant and free. Limit: 50 000 MAD per transfer.
          </p>
        </aside>
      </div>

      {receipt && <Receipt tx={receipt} onClose={() => setReceipt(null)} />}
    </AppShell>
  );
}