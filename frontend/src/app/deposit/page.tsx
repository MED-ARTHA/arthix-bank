"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import Receipt from "@/components/Receipt";
import { api, Transaction, Voucher } from "@/lib/api";
import { dateTime, delay, money } from "@/lib/format";

const QUICK = [100, 500, 1000, 5000];

const fmtNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})(?=.)/g, "$1 ");
const fmtExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
};

function luhn(d: string) {
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const brandOf = (d: string) => (d.startsWith("4") ? "VISA" : /^(5|2)/.test(d) ? "MASTERCARD" : "CARD");

function CardPreview({ number, holder, expiry }: { number: string; holder: string; expiry: string }) {
  const digits = number.replace(/\D/g, "");
  const shown = digits.padEnd(16, "\u2022").replace(/(.{4})(?=.)/g, "$1 ");
  return (
    <div
      className="float relative aspect-[1.586/1] w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 p-6"
      style={{ background: "linear-gradient(135deg, #3a2f9e 0%, #1b1550 55%, #0e2a3a 100%)" }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(139,124,246,0.55), transparent 65%)" }}
      />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-8 w-auto" />
          <span className="text-xs font-semibold tracking-[0.2em] text-white/80">{brandOf(digits)}</span>
        </div>
        <div>
          <div className="mb-4 h-7 w-10 rounded-md bg-gradient-to-br from-amber-200/90 to-amber-500/70" />
          <p className="text-xl tracking-[0.14em] text-white">{shown}</p>
        </div>
        <div className="flex items-end justify-between text-xs">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-white/50">Card holder</p>
            <p className="mt-0.5 text-sm uppercase tracking-wide text-white">{holder || "YOUR NAME"}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-white/50">Expires</p>
            <p className="mt-0.5 text-sm text-white">{expiry || "MM/YY"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusStyle(s: Voucher["status"]) {
  if (s === "PAID") return { background: "rgba(79,209,165,0.15)", color: "#4fd1a5" };
  if (s === "EXPIRED") return { background: "rgba(255,255,255,0.06)", color: "#8a8aa2" };
  return { background: "rgba(251,191,36,0.15)", color: "#fbbf24" };
}

export default function DepositPage() {
  const [tab, setTab] = useState<"card" | "voucher">("card");
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", cvc: "", amount: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [vAmount, setVAmount] = useState("");
  const [vError, setVError] = useState("");
  const [vLoading, setVLoading] = useState(false);
  const [busyCode, setBusyCode] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const loadVouchers = () => api.vouchers().then(setVouchers).catch(() => {});
  useEffect(() => {
    loadVouchers();
  }, []);

  const digits = card.number.replace(/\D/g, "");
  const cardOk = digits.length >= 13 && luhn(digits);
  const amount = Number(card.amount);
  const canPay = cardOk && /^\d{2}\/\d{2}$/.test(card.expiry) && card.cvc.length >= 3 && card.holder.trim() && amount >= 10;

  async function payCard(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const t = await api.depositCard({
        cardNumber: digits,
        expiry: card.expiry,
        cvc: card.cvc,
        holder: card.holder.trim(),
        amount,
      });
      setReceipt(t);
      setCard({ number: "", holder: "", expiry: "", cvc: "", amount: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function createVoucher(e: React.FormEvent) {
    e.preventDefault();
    setVError("");
    setVLoading(true);
    try {
      await api.createVoucher(Number(vAmount));
      setVAmount("");
      await loadVouchers();
    } catch (err) {
      setVError(err instanceof Error ? err.message : "Error");
    } finally {
      setVLoading(false);
    }
  }

  async function redeem(code: string) {
    setVError("");
    setBusyCode(code);
    try {
      const t = await api.redeemVoucher(code);
      setReceipt(t);
      await loadVouchers();
    } catch (err) {
      setVError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyCode("");
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 1500);
  }

  const hoursLeft = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 36e5));

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Add money</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Top up your account</h1>
      </div>

      <div className="rise mt-6 flex gap-2" style={delay(1)}>
        <button onClick={() => setTab("card")} className={`chip ${tab === "card" ? "chip-active" : ""}`}>
          Bank card
        </button>
        <button onClick={() => setTab("voucher")} className={`chip ${tab === "voucher" ? "chip-active" : ""}`}>
          Cash voucher
        </button>
      </div>

      {tab === "card" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="flex flex-col items-center gap-4 lg:col-span-2">
            <CardPreview number={card.number} holder={card.holder} expiry={card.expiry} />
            <p className="max-w-sm text-center text-xs leading-relaxed text-[var(--muted)]">
              Demo mode: use card <span className="text-white">4242 4242 4242 4242</span>, any future date and any
              3-digit code. The card is only validated, it is never stored.
            </p>
          </div>

          <form onSubmit={payCard} className="rise card space-y-5 p-6 lg:col-span-3" style={delay(2)}>
            <div>
              <label className="label">Card number</label>
              <div className="relative">
                <input
                  className="input mt-2 pr-10 tracking-wide"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: fmtNumber(e.target.value) })}
                />
                {cardOk && (
                  <span className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-[var(--ok)]">
                    <Icon name="check" size={16} />
                  </span>
                )}
              </div>
              {digits.length >= 13 && !cardOk && (
                <p className="mt-2 text-xs text-[var(--err)]">This card number looks invalid.</p>
              )}
            </div>
            <div>
              <label className="label">Name on card</label>
              <input
                className="input mt-2 uppercase"
                placeholder="MOHAMED A."
                maxLength={40}
                value={card.holder}
                onChange={(e) => setCard({ ...card, holder: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Expiry</label>
                <input
                  className="input mt-2"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: fmtExpiry(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Security code</label>
                <input
                  className="input mt-2"
                  inputMode="numeric"
                  type="password"
                  placeholder="CVC"
                  maxLength={4}
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") })}
                />
              </div>
            </div>
            <div>
              <label className="label">Amount (MAD)</label>
              <input
                className="input mt-2"
                type="number"
                min="10"
                max="20000"
                step="0.01"
                placeholder="0.00"
                value={card.amount}
                onChange={(e) => setCard({ ...card, amount: e.target.value })}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button type="button" key={q} onClick={() => setCard({ ...card, amount: String(q) })} className="chip">
                    +{q}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-[var(--err)]">{error}</p>}
            <button disabled={loading || !canPay} className="btn btn-primary w-full">
              {loading ? "Processing..." : amount >= 10 ? `Add ${money(amount)}` : "Add money"}
            </button>
            <p className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
              <Icon name="lock" size={13} /> Limit: 20 000 MAD per deposit, 50 000 MAD per day.
            </p>
          </form>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <form onSubmit={createVoucher} className="rise card h-fit space-y-5 p-6 lg:col-span-2" style={delay(2)}>
            <div>
              <p className="text-sm font-medium">Pay cash at an agency</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                Generate a voucher, give the code and the cash to any partner agency, and your balance is credited
                instantly. Valid for 48 hours.
              </p>
            </div>
            <div>
              <label className="label">Amount (MAD)</label>
              <input
                className="input mt-2"
                type="number"
                min="50"
                max="10000"
                step="0.01"
                placeholder="0.00"
                required
                value={vAmount}
                onChange={(e) => setVAmount(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {[200, 500, 1000, 2000].map((q) => (
                  <button type="button" key={q} onClick={() => setVAmount(String(q))} className="chip">
                    {q}
                  </button>
                ))}
              </div>
            </div>
            {vError && <p className="text-sm text-[var(--err)]">{vError}</p>}
            <button disabled={vLoading || !(Number(vAmount) >= 50)} className="btn btn-primary w-full">
              {vLoading ? "Generating..." : "Generate voucher"}
            </button>
          </form>

          <div className="space-y-3 lg:col-span-3">
            {vouchers.length === 0 && (
              <div className="card p-8 text-center text-sm text-[var(--muted)]">No vouchers yet.</div>
            )}
            {vouchers.map((v, i) => (
              <div key={v.code} className="rise card p-5" style={delay(Math.min(i, 6))}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-lg tracking-[0.18em]">{v.code}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Created {dateTime(v.createdAt)}
                      {v.status === "PENDING" && ` \u00b7 expires in ${hoursLeft(v.expiresAt)}h`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{money(v.amount)}</p>
                    <span className="badge mt-1" style={statusStyle(v.status)}>
                      {v.status}
                    </span>
                  </div>
                </div>
                {v.status === "PENDING" && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                    <button onClick={() => copyCode(v.code)} className="btn btn-ghost flex items-center gap-2 !py-1.5 text-xs">
                      <Icon name={copiedCode === v.code ? "check" : "copy"} size={13} />
                      {copiedCode === v.code ? "Copied" : "Copy code"}
                    </button>
                    <button
                      onClick={() => redeem(v.code)}
                      disabled={busyCode === v.code}
                      className="btn btn-primary !py-1.5 text-xs"
                    >
                      {busyCode === v.code ? "Processing..." : "Simulate agency payment (demo)"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {receipt && <Receipt tx={receipt} onClose={() => setReceipt(null)} />}
    </AppShell>
  );
}