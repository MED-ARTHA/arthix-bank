"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import { api, Profile } from "@/lib/api";
import { dateOnly, delay, initials } from "@/lib/format";

const strengthOf = (p: string) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
};
const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["#f0707a", "#f0707a", "#fbbf24", "#38bdf8", "#4fd1a5"];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .profile()
      .then((p) => {
        setProfile(p);
        setForm({ fullName: p.fullName, phone: p.phone ?? "" });
      })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const p = await api.updateProfile({ fullName: form.fullName.trim(), phone: form.phone.trim() });
      setProfile(p);
      setMsg({ ok: true, text: "Profile updated." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: "The two new passwords do not match." });
      return;
    }
    setPwBusy(true);
    try {
      await api.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ ok: true, text: "Password updated." });
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "Error" });
    } finally {
      setPwBusy(false);
    }
  }

  function copy() {
    if (!profile?.accountNumber) return;
    navigator.clipboard.writeText(profile.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const score = strengthOf(pw.next);

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Profile</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Profile & security</h1>
      </div>

      <section className="glow-card rise mt-8 p-7" style={delay(1)}>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#7b6cf0] to-[#2dd4bf] text-2xl font-semibold text-white">
            {profile ? initials(profile.fullName) : ""}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold">{profile?.fullName ?? " "}</p>
            <p className="mt-1 truncate text-sm text-[var(--muted)]">{profile?.email}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {profile ? `Client since ${dateOnly(profile.createdAt)}` : " "}
            </p>
          </div>
          <div className="text-right">
            <p className="label">Account number</p>
            <button onClick={copy} className="mt-1 flex items-center gap-2 text-sm font-medium tracking-wide hover:text-[#a79cff]">
              {profile?.accountNumber ?? "-"}
              <Icon name={copied ? "check" : "copy"} size={14} />
            </button>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form onSubmit={save} className="rise card space-y-5 p-6" style={delay(2)}>
          <p className="text-sm font-medium">Personal information</p>
          <div>
            <label className="label">Full name</label>
            <input
              className="input mt-2"
              required
              maxLength={80}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input mt-2 opacity-60" disabled value={profile?.email ?? ""} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input mt-2"
              placeholder="+212 6 00 00 00 00"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-[var(--ok)]" : "text-[var(--err)]"}`}>{msg.text}</p>}
          <button disabled={saving} className="btn btn-primary">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <form onSubmit={changePw} className="rise card space-y-5 p-6" style={delay(3)}>
          <p className="text-sm font-medium">Change password</p>
          <div>
            <label className="label">Current password</label>
            <input
              className="input mt-2"
              type="password"
              required
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              className="input mt-2"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
            {pw.next && (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((score + 1) / 5) * 100}%`,
                      background: STRENGTH_COLOR[score],
                      transition: "width 0.4s, background 0.4s",
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs" style={{ color: STRENGTH_COLOR[score] }}>
                  {STRENGTH_LABEL[score]}
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              className="input mt-2"
              type="password"
              required
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
          </div>
          {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-[var(--ok)]" : "text-[var(--err)]"}`}>{pwMsg.text}</p>}
          <button disabled={pwBusy} className="btn btn-primary">
            {pwBusy ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>

      <section className="rise card mt-4 p-6" style={delay(4)}>
        <p className="mb-4 text-sm font-medium">Security checklist</p>
        <ul className="grid gap-3 text-sm sm:grid-cols-3">
          {[
            { ok: true, text: "Email on file" },
            { ok: !!profile?.phone, text: "Phone number added" },
            { ok: true, text: "Session protected (token)" },
          ].map((c) => (
            <li key={c.text} className="flex items-center gap-3">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={
                  c.ok
                    ? { background: "rgba(79,209,165,0.15)", color: "#4fd1a5" }
                    : { background: "rgba(251,191,36,0.15)", color: "#fbbf24" }
                }
              >
                <Icon name={c.ok ? "check" : "shield"} size={13} />
              </span>
              <span className={c.ok ? "" : "text-[var(--muted)]"}>{c.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}