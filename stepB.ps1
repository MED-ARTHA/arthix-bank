$ErrorActionPreference = "Stop"

if (-not (Test-Path "package.json")) {
  Write-Host "Lanci had script mn dakhel dossier frontend (fin kayn package.json)" -ForegroundColor Red
  exit 1
}

function W($p, $c) {
  $full = Join-Path (Get-Location).Path $p
  New-Item -ItemType Directory -Force -Path (Split-Path $full) | Out-Null
  [System.IO.File]::WriteAllText($full, $c, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "  ok  $p" -ForegroundColor DarkGray
}
function R($p, $old, $new) {
  $full = Join-Path (Get-Location).Path $p
  if (-not (Test-Path $full)) { Write-Host "NOT FOUND (file) $p" -ForegroundColor Red; return }
  $t = [System.IO.File]::ReadAllText($full)
  if (-not $t.Contains($old)) { Write-Host "NOT FOUND in $p" -ForegroundColor Yellow; return }
  [System.IO.File]::WriteAllText($full, $t.Replace($old, $new), (New-Object System.Text.UTF8Encoding($false)))
}

R "src\app\layout.tsx" 'title: "Create Next App"' 'title: "Arthix Banque"'

W "src\app\globals.css" @'
@import "tailwindcss";

:root {
  --bg: #02020a;
  --surface: rgba(255, 255, 255, 0.035);
  --surface-hover: rgba(255, 255, 255, 0.06);
  --line: rgba(255, 255, 255, 0.08);
  --text: #ebebf3;
  --muted: #8a8aa2;
  --accent: #7b6cf0;
  --accent-soft: rgba(123, 108, 240, 0.16);
  --ok: #4fd1a5;
  --err: #f0707a;
}

html { background: var(--bg); }

body {
  background: transparent;
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums;
}

/* planet arc */
body::before {
  content: "";
  position: fixed;
  z-index: -2;
  width: 160vmax;
  height: 160vmax;
  left: calc(96vw - 160vmax);
  top: calc(70vh - 80vmax);
  border-radius: 50%;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 78% 6%, rgba(70, 80, 200, 0.32), transparent 38%),
    radial-gradient(circle at 60% 60%, #03030a 0%, #03030a 55%, #0a0e2c 100%);
  box-shadow:
    inset -2px 2px 0 rgba(110, 120, 235, 0.22),
    inset 0 0 0 14px rgba(18, 22, 74, 0.35),
    inset 0 30px 140px rgba(60, 70, 190, 0.12);
}

/* star dust */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.6;
  background-image:
    radial-gradient(1px 1px at 20px 30px, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(1px 1px at 90px 80px, rgba(255, 255, 255, 0.55), transparent),
    radial-gradient(1.3px 1.3px at 170px 40px, rgba(180, 170, 255, 0.7), transparent);
  background-size: 190px 120px, 310px 170px, 250px 210px;
  -webkit-mask-image: linear-gradient(165deg, #000 0%, transparent 32%);
  mask-image: linear-gradient(165deg, #000 0%, transparent 32%);
}

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
}
.card-hover { transition: background 0.2s, border-color 0.2s; }
.card-hover:hover { background: var(--surface-hover); border-color: rgba(255, 255, 255, 0.14); }

.label {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.7rem 0.9rem;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.input::placeholder { color: #5f5f78; }
select.input option { background: #0d0d18; }

.btn {
  border-radius: 10px;
  padding: 0.7rem 1.1rem;
  font-weight: 500;
  font-size: 14px;
  transition: transform 0.15s, background 0.2s, opacity 0.2s;
}
.btn:active { transform: scale(0.98); }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: #8d80f5; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-ghost { border: 1px solid var(--line); color: var(--text); }
.btn-ghost:hover { background: var(--surface-hover); }

/* motion */
@keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.rise { animation: rise 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) both; animation-delay: calc(var(--i, 0) * 70ms); }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
.overlay { animation: fade 0.2s both; }
@keyframes pop { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.check-circle { stroke-dasharray: 160; stroke-dashoffset: 160; animation: draw 0.6s 0.1s ease forwards; }
.check-mark { stroke-dasharray: 40; stroke-dashoffset: 40; animation: draw 0.4s 0.55s ease forwards; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* print / save as PDF: receipt only */
@media print {
  body::before, body::after { display: none; }
  body * { visibility: hidden; }
  #receipt, #receipt * { visibility: visible; }
  #receipt {
    position: fixed; inset: 0; margin: 0; padding: 48px;
    background: #fff !important; color: #111 !important;
    border: none !important; border-radius: 0 !important;
  }
  #receipt .label, #receipt .muted { color: #555 !important; }
  .no-print { display: none !important; }
}
'@

W "src\lib\format.ts" @'
import type { CSSProperties } from "react";

export const money = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

export const delay = (i: number) => ({ "--i": i }) as CSSProperties;
'@

W "src\lib\api.ts" @'
const API = process.env.NEXT_PUBLIC_API_URL;

export type AuthResponse = { token: string; fullName: string; email: string };
export type Me = { fullName: string; email: string; balance: number; accountNumber: string | null };
export type Transaction = {
  id: number;
  category: string;
  label: string;
  reference: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  receiptNo: string;
  senderName: string;
  senderAccount: string | null;
};
export type Provider = { id: string; name: string; category: string };
export type Offer = { title: string; description: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && token) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = data.message || data.error || text;
    } catch {}
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  signup: (body: { fullName: string; email: string; password: string }) =>
    request<AuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<Me>("/api/me"),
  providers: () => request<Provider[]>("/api/providers"),
  offers: () => request<Offer[]>("/api/offers"),
  transactions: () => request<Transaction[]>("/api/transactions"),
  pay: (body: { provider: string; reference: string; amount: number }) =>
    request<Transaction>("/api/payments", { method: "POST", body: JSON.stringify(body) }),
};
'@

W "src\components\CountUp.tsx" @'
"use client";

import { useEffect, useState } from "react";

export default function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
}
'@

W "src\components\Receipt.tsx" @'
"use client";

import { useEffect } from "react";
import type { Transaction } from "@/lib/api";
import { dateTime, money } from "@/lib/format";

export default function Receipt({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: [string, string][] = [
    ["Receipt no.", tx.receiptNo],
    ["Date", dateTime(tx.createdAt)],
    ["Paid by", tx.senderName],
    ["From account", tx.senderAccount ?? "-"],
    ["Beneficiary", tx.label],
    ["Reference", tx.reference],
    ["Balance after", money(tx.balanceAfter)],
  ];

  return (
    <div
      className="overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        id="receipt"
        className="pop card w-full max-w-md p-7"
        style={{ background: "#0b0b14" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle className="check-circle" cx="26" cy="26" r="24" stroke="var(--ok)" strokeWidth="1.5" />
            <path className="check-mark" d="M16 27l7 7 14-15" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="label mt-4">Payment confirmed</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">{money(tx.amount)}</p>
        </div>

        <dl className="mt-7 divide-y divide-[var(--line)] text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-6 py-3">
              <dt className="muted text-[var(--muted)]">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="muted mt-5 text-center text-xs text-[var(--muted)]">
          Arthix Banque &middot; demo payment, no real funds moved
        </p>

        <div className="no-print mt-6 flex gap-3">
          <button onClick={() => window.print()} className="btn btn-primary flex-1">
            Print / Save as PDF
          </button>
          <button onClick={onClose} className="btn btn-ghost">Close</button>
        </div>
      </div>
    </div>
  );
}
'@

W "src\components\TransactionList.tsx" @'
import type { Transaction } from "@/lib/api";
import { dateTime, delay, money } from "@/lib/format";

export default function TransactionList({
  items,
  onSelect,
}: {
  items: Transaction[];
  onSelect?: (t: Transaction) => void;
}) {
  if (items.length === 0) {
    return <div className="card p-8 text-center text-sm text-[var(--muted)]">No transactions yet.</div>;
  }
  return (
    <ul className="card divide-y divide-[var(--line)] overflow-hidden">
      {items.map((t, i) => (
        <li key={t.id} className="rise" style={delay(Math.min(i, 8))}>
          <button
            onClick={() => onSelect?.(t)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--surface-hover)]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t.label}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                {t.reference} &middot; {dateTime(t.createdAt)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium">-{money(t.amount)}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
'@

W "src\components\AppShell.tsx" @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/payments", label: "Payments" },
  { href: "/transactions", label: "Transactions" },
  { href: "/offers", label: "Offers" },
];

export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8.25" stroke="var(--accent)" strokeWidth="1.5" />
        <path d="M10 1.75A8.25 8.25 0 0 1 18.25 10" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-[13px] font-semibold tracking-[0.22em]">ARTHIX</span>
    </span>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) router.replace("/login");
    else setReady(true);
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(5,5,11,0.72)] backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-5 text-sm">
          <Link href="/dashboard"><Brand /></Link>
          <div className="flex gap-5 overflow-x-auto">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative whitespace-nowrap py-4 transition ${active ? "text-white" : "text-[var(--muted)] hover:text-white"}`}
                >
                  {l.label}
                  {active && <span className="absolute inset-x-0 bottom-0 h-px bg-[var(--accent)]" />}
                </Link>
              );
            })}
          </div>
          <button onClick={logout} className="ml-auto text-[var(--muted)] transition hover:text-white">
            Log out
          </button>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-10">{children}</main>
    </div>
  );
}
'@

W "src\components\AuthForm.tsx" @'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Brand } from "@/components/AppShell";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = isSignup
        ? await api.signup(form)
        : await api.login({ email: form.email, password: form.password });
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <form onSubmit={onSubmit} className="rise card w-full max-w-sm space-y-5 p-8">
        <Brand />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isSignup ? "Open your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {isSignup ? "It takes less than a minute." : "Sign in to your Arthix account."}
          </p>
        </div>

        {isSignup && (
          <input
            className="input"
            placeholder="Full name"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        )}
        <input
          className="input"
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <div className="relative">
          <input
            className="input pr-16"
            type={show ? "text" : "password"}
            placeholder="Password (min 8 characters)"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-white"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>

        {error && <p className="text-sm text-[var(--err)]">{error}</p>}

        <button disabled={loading} className="btn btn-primary w-full">
          {loading ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
        </button>

        <p className="text-center text-sm text-[var(--muted)]">
          {isSignup ? "Already a client? " : "New here? "}
          <Link className="text-white underline-offset-4 hover:underline" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Sign in" : "Open an account"}
          </Link>
        </p>
      </form>
    </main>
  );
}
'@

W "src\app\dashboard\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import CountUp from "@/components/CountUp";
import Receipt from "@/components/Receipt";
import TransactionList from "@/components/TransactionList";
import { api, Me, Transaction } from "@/lib/api";
import { delay, money } from "@/lib/format";

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [open, setOpen] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.transactions().then(setTxs).catch(() => {});
  }, []);

  const spent = txs.reduce((s, t) => s + t.amount, 0);

  function copy() {
    if (!me?.accountNumber) return;
    navigator.clipboard.writeText(me.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="rise">
          <p className="label">Welcome back</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{me?.fullName ?? " "}</h1>
        </div>

        <section className="rise card p-7" style={delay(1)}>
          <p className="label">Available balance</p>
          <p className="mt-3 text-5xl font-semibold tracking-tight">
            {me ? <CountUp value={me.balance} /> : "0,00"}
            <span className="ml-2 text-lg font-normal text-[var(--muted)]">MAD</span>
          </p>
          <div className="mt-6 flex items-center justify-between border-t border-[var(--line)] pt-4 text-sm">
            <div>
              <p className="label">Account number</p>
              <p className="mt-1 font-medium tracking-wide">{me?.accountNumber ?? "-"}</p>
            </div>
            <button onClick={copy} className="btn btn-ghost !py-1.5 text-xs">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rise card p-5" style={delay(2)}>
            <p className="label">Payments</p>
            <p className="mt-2 text-2xl font-semibold">{txs.length}</p>
          </div>
          <div className="rise card p-5" style={delay(3)}>
            <p className="label">Total spent</p>
            <p className="mt-2 text-2xl font-semibold">{money(spent)}</p>
          </div>
          <Link href="/payments" className="rise card card-hover flex flex-col justify-between p-5" style={delay(4)}>
            <p className="label">Quick action</p>
            <p className="mt-2 text-base font-medium">Pay a bill or school fee</p>
          </Link>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent activity</h2>
            <Link href="/transactions" className="text-xs text-[var(--muted)] hover:text-white">
              View all
            </Link>
          </div>
          <TransactionList items={txs.slice(0, 5)} onSelect={setOpen} />
        </section>
      </div>
      {open && <Receipt tx={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}
'@

W "src\app\payments\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Receipt from "@/components/Receipt";
import { api, Me, Provider, Transaction } from "@/lib/api";
import { delay, money } from "@/lib/format";

export default function PaymentsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ provider: "", reference: "", amount: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api
      .providers()
      .then((p) => {
        setProviders(p);
        setForm((f) => ({ ...f, provider: p[0]?.id ?? "" }));
      })
      .catch(() => {});
  }, []);

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
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pay a bill or school fee</h1>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <form onSubmit={onSubmit} className="rise card space-y-5 p-6 md:col-span-3" style={delay(1)}>
          <div>
            <label className="label">Beneficiary</label>
            <select
              className="input mt-2"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Reference</label>
            <input
              className="input mt-2"
              placeholder="Invoice or student number"
              required
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
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
          {error && <p className="text-sm text-[var(--err)]">{error}</p>}
          <button disabled={loading || tooMuch} className="btn btn-primary w-full">
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
'@

W "src\app\transactions\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Receipt from "@/components/Receipt";
import TransactionList from "@/components/TransactionList";
import { api, Transaction } from "@/lib/api";

const filters = [
  { id: "ALL", label: "All" },
  { id: "BILLS", label: "Bills" },
  { id: "SCHOOLS", label: "Schools" },
];

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [open, setOpen] = useState<Transaction | null>(null);

  useEffect(() => {
    api.transactions().then(setTxs).catch(() => {});
  }, []);

  const items = filter === "ALL" ? txs : txs.filter((t) => t.category === filter);

  return (
    <AppShell>
      <div className="rise">
        <p className="label">History</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Transactions</h1>
      </div>

      <div className="mt-6 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-4 py-1.5 text-xs transition ${
              filter === f.id
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                : "border-[var(--line)] text-[var(--muted)] hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <TransactionList items={items} onSelect={setOpen} />
      </div>
      {open && <Receipt tx={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}
'@

W "src\app\offers\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, Offer } from "@/lib/api";
import { delay } from "@/lib/format";

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    api.offers().then(setOffers).catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Arthix Banque</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Offers</h1>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {offers.map((o, i) => (
          <div key={o.title} className="rise card card-hover p-6" style={delay(i + 1)}>
            <h3 className="font-medium">{o.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{o.description}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
'@

Write-Host ""
Write-Host "Done" -ForegroundColor Green
