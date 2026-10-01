"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Brand } from "@/components/AppShell";
import Icon, { type IconName } from "@/components/Icon";
import { delay } from "@/lib/format";

const perks: { icon: IconName; title: string; text: string }[] = [
  { icon: "send", title: "Instant transfers", text: "Send money to any Arthix account in a second, free of charge." },
  { icon: "target", title: "Savings goals", text: "Set a target, track your progress and watch it grow." },
  { icon: "shield", title: "Secure by design", text: "Protected sessions, limits and a receipt for every operation." },
];

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
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-center px-16 lg:flex">
        <div className="rise float w-fit">
          <Brand size={84} />
        </div>
        <h2 className="rise mt-10 max-w-md text-4xl font-semibold leading-tight tracking-tight" style={delay(1)}>
          Banking that moves at your speed.
        </h2>
        <ul className="mt-10 space-y-6">
          {perks.map((p, i) => (
            <li key={p.title} className="rise flex max-w-md gap-4" style={delay(i + 2)}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[#a79cff]">
                <Icon name={p.icon} size={18} />
              </span>
              <div>
                <p className="text-sm font-medium">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-center justify-center p-5">
        <form onSubmit={onSubmit} className="rise card w-full max-w-sm space-y-5 p-8">
          <div className="flex justify-center lg:hidden">
            <Brand size={64} stacked />
          </div>
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
      </section>
    </main>
  );
}