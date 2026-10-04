"use client";

import "./auth.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { Cormorant_Garamond } from "next/font/google";
import Card3D from "@/components/Card3D";
import PartnerStrip from "@/components/PartnerStrip";
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
const COOLDOWN = 45;

const italian = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], style: ["italic", "normal"], variable: "--font-italian" });

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "code">("form");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const isSignup = mode === "signup";
  const score = strengthOf(form.password);
  const iv = (n: number) => ({ "--i": n }) as React.CSSProperties;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function finish(token: string) {
    localStorage.setItem("token", token);
    router.push("/dashboard");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (!isSignup) {
        const data = await api.login({ email: form.email, password: form.password });
        finish(data.token);
      } else if (step === "form") {
        const r = await api.signup(form);
        setForm((f) => ({ ...f, email: r.email }));
        setStep("code");
        setCooldown(COOLDOWN);
        setLoading(false);
      } else {
        const data = await api.verifyEmail({ ...form, code });
        finish(data.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || loading) return;
    setError("");
    setInfo("");
    try {
      await api.resendCode(form.email);
      setCode("");
      setCooldown(COOLDOWN);
      setInfo("A new code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function changeEmail() {
    setStep("form");
    setCode("");
    setError("");
    setInfo("");
  }

  const verifying = isSignup && step === "code";

  return (
    <main className="auth">
      <aside className="auth-showcase">
        <div className="auth-photo" style={{ backgroundImage: "url(/images/hero.jpg)" }} aria-hidden="true" />
        <div className="aurora" aria-hidden="true"><i /><i /></div>
        <Logo height={110} />

        <div className={"auth-copy " + italian.variable}>
          <span className="ac-eyebrow" style={iv(0)}><i />Private banking</span>
          <h2 className="ac-title">
            <span className="ac-line"><span style={iv(1)}>Your money,</span></span>
            <span className="ac-line ac-em"><span style={iv(2)}>always in motion.</span></span>
          </h2>
          <p className="ac-sub" style={iv(3)}>Instant transfers, clear savings goals and a receipt for every operation, in one calm place.</p>
        </div>

        <div className="stage" aria-hidden="true">
          <Card3D />

          </div>
      </aside>

      <section className="auth-panel">
        <form onSubmit={onSubmit} className="auth-box">
          <div className="auth-mobile-logo" style={iv(0)}><Logo height={80} /></div>

          {verifying ? (
            <>
              <div style={iv(1)}>
                <div className="verify-ico"><MailCheck size={22} strokeWidth={1.5} /></div>
                <h1 className="auth-title">Check your email</h1>
                <p className="auth-sub">We sent a 6-digit code to <span style={{ color: "#fff" }}>{form.email}</span>.</p>
              </div>

              <div style={iv(2)}>
                <input
                  className="code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  placeholder="000000"
                  aria-label="Verification code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}
              {info && <p className="auth-info">{info}</p>}

              <div style={iv(3)}>
                <button disabled={loading || code.length !== 6} className="auth-btn">
                  {loading ? <span className="spin" /> : (<>Verify and create account <ArrowRight size={17} strokeWidth={1.7} /></>)}
                </button>
              </div>

              <div className="auth-actions" style={iv(4)}>
                <button type="button" className="auth-ghost" onClick={resend} disabled={cooldown > 0}>
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
                <button type="button" className="auth-ghost" onClick={changeEmail}>Use another email</button>
              </div>
            </>
          ) : (
            <>
              <div style={iv(1)}>
                <h1 className="auth-title">{isSignup ? "Open your account" : "Welcome back"}</h1>
                <p className="auth-sub">{isSignup ? "We will verify your email first." : "Sign in to your Arthix account."}</p>
              </div>

              {isSignup && (
                <div className="field" style={iv(2)}>
                  <input id="fullName" placeholder=" " required maxLength={80} autoComplete="name" value={form.fullName}
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
                  {loading ? <span className="spin" /> : (<>{isSignup ? "Send verification code" : "Sign in"} <ArrowRight size={17} strokeWidth={1.7} /></>)}
                </button>
              </div>

              <p className="auth-switch" style={iv(6)}>
                {isSignup ? "Already a client? " : "New here? "}
                <Link className="auth-link" href={isSignup ? "/login" : "/signup"}>
                  {isSignup ? "Sign in" : "Open an account"}
                </Link>
              </p>
            </>
          )}

          <p className="auth-foot" style={iv(7)}>
            <ShieldCheck size={14} strokeWidth={1.5} /> Protected session &middot; demo environment
          </p>
        </form>
      </section>
    <div className="ps-bar"><PartnerStrip /></div>
    </main>
  );
}