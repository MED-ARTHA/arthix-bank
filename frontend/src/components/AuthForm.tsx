"use client";

import "./auth.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Eye, EyeOff, Receipt, ShieldCheck, Wifi } from "lucide-react";
import Logo from "@/components/Logo";
import { api } from "@/lib/api";

const strengthOf = (p: string) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++;
  return s;
};
const METER = ["#ef7480", "#ef7480", "#e0b04a", "#7c6df0", "#5cc9a7"];

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";
  const score = strengthOf(form.password);
  const iv = (n: number) => ({ "--i": n }) as React.CSSProperties;

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
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <aside className="auth-showcase">
        <div className="auth-photo" style={{ backgroundImage: "url(/images/hero.jpg)" }} aria-hidden="true" />
        <div className="aurora" aria-hidden="true"><i /><i /></div>
        <Logo height={110} />

        <div className="auth-copy">
          <h2>Your money, always in motion.</h2>
          <p>Instant transfers, clear savings goals and a receipt for every operation, in one calm place.</p>
        </div>

        <div className="stage" aria-hidden="true">
          <div className="vcard">
            <div className="vc-top">
              <span className="vc-brand">ARTHIX</span>
              <Wifi size={18} strokeWidth={1.5} style={{ transform: "rotate(90deg)" }} />
            </div>
            <div>
              <div className="vc-chip" />
              <p className="vc-num">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4821</p>
            </div>
            <div className="vc-foot"><span>Arthix Classic</span><span>Valid 09/29</span></div>
          </div>

          <div className="feed">
            <div className="feed-row" style={iv(0)}>
              <span className="feed-ico"><ArrowDownLeft size={15} strokeWidth={1.6} /></span>
              <div>Salary<small>Today, 09:12</small></div>
              <b className="pos">+8 500,00</b>
            </div>
            <div className="feed-row" style={iv(1)}>
              <span className="feed-ico"><Receipt size={15} strokeWidth={1.6} /></span>
              <div>SRM, electricity<small>Yesterday</small></div>
              <b>-420,00</b>
            </div>
            <div className="feed-row" style={iv(2)}>
              <span className="feed-ico"><ArrowUpRight size={15} strokeWidth={1.6} /></span>
              <div>Transfer to Sara B.<small>Monday</small></div>
              <b>-250,00</b>
            </div>
          </div>
        </div>
      </aside>

      <section className="auth-panel">
        <form onSubmit={onSubmit} className="auth-box">
          <div className="auth-mobile-logo" style={iv(0)}><Logo height={80} /></div>

          <div style={iv(1)}>
            <h1 className="auth-title">{isSignup ? "Open your account" : "Welcome back"}</h1>
            <p className="auth-sub">{isSignup ? "It takes less than a minute." : "Sign in to your Arthix account."}</p>
          </div>

          {isSignup && (
            <div className="field" style={iv(2)}>
              <input id="fullName" placeholder=" " required autoComplete="name" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <label htmlFor="fullName">Full name</label>
            </div>
          )}

          <div className="field" style={iv(3)}>
            <input id="email" type="email" placeholder=" " required autoComplete="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label htmlFor="email">Email</label>
          </div>

          <div style={iv(4)}>
            <div className="field">
              <input id="password" type={show ? "text" : "password"} placeholder=" " required minLength={8}
                autoComplete={isSignup ? "new-password" : "current-password"} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <label htmlFor="password">Password</label>
              <button type="button" className="toggle" onClick={() => setShow(!show)} aria-label="Show or hide password">
                {show ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
              </button>
            </div>
            {isSignup && form.password && (
              <div className="meter" style={{ "--c": METER[score] } as React.CSSProperties}>
                {[0, 1, 2, 3].map((i) => <i key={i} className={i < score ? "on" : ""} />)}
              </div>
            )}
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div style={iv(5)}>
            <button disabled={loading} className="auth-btn">
              {loading ? <span className="spin" /> : (<>{isSignup ? "Create account" : "Sign in"} <ArrowRight size={17} strokeWidth={1.7} /></>)}
            </button>
          </div>

          <p className="auth-switch" style={iv(6)}>
            {isSignup ? "Already a client? " : "New here? "}
            <Link className="auth-link" href={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Sign in" : "Open an account"}
            </Link>
          </p>

          <p className="auth-foot" style={iv(7)}>
            <ShieldCheck size={14} strokeWidth={1.5} /> Protected session &middot; demo environment
          </p>
        </form>
      </section>
    </main>
  );
}