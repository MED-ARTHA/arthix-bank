"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Copy, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { api, Me, Profile } from "@/lib/api";
import { uploadMedia } from "@/lib/media";
import { clearAvatar, setAvatar } from "@/lib/mediaApi";
import { dateOnly, delay } from "@/lib/format";

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
const STRENGTH_COLOR = ["#ef7480", "#ef7480", "#e0b04a", "#7c6df0", "#5cc9a7"];

type Note = { ok: boolean; text: string } | null;

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Note>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [avatarMsg, setAvatarMsg] = useState<Note>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<Note>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.profile().then((p) => {
      setProfile(p);
      setForm({ fullName: p.fullName, phone: p.phone ?? "" });
    }).catch(() => {});
  }, []);

  async function onPick(f: File | undefined) {
    if (!f) return;
    setAvatarMsg(null);
    setUploading(true);
    setProgress(0);
    try {
      const up = await uploadMedia(f, "avatar", setProgress);
      const r = await setAvatar(up.id);
      setMe((m) => (m ? { ...m, avatarUrl: r.avatarUrl } : m));
      setAvatarMsg({ ok: true, text: "Photo updated." });
    } catch (e) {
      setAvatarMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setAvatarMsg(null);
    try {
      await clearAvatar();
      setMe((m) => (m ? { ...m, avatarUrl: null } : m));
    } catch (e) {
      setAvatarMsg({ ok: false, text: e instanceof Error ? e.message : "Error" });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const p = await api.updateProfile({ fullName: form.fullName.trim(), phone: form.phone.trim() });
      setProfile(p);
      setMe((m) => (m ? { ...m, fullName: p.fullName } : m));
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
    if (!me?.accountNumber) return;
    navigator.clipboard.writeText(me.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const score = strengthOf(pw.next);
  const name = profile?.fullName ?? me?.fullName ?? "";

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Profile</p>
        <h1 className="serif mt-2 text-4xl">Profile & security</h1>
      </div>

      <section className="glow-card rise mt-8 p-7" style={delay(1)}>
        <div className="flex flex-wrap items-center gap-6">
          <div className="group relative">
            <Avatar name={name} url={me?.avatarUrl} size={96} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/55 text-xs opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              aria-label="Change photo"
            >
              {uploading ? `${Math.round(progress * 100)}%` : <Camera size={20} strokeWidth={1.5} />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => onPick(e.target.files?.[0])} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="serif truncate text-2xl">{name || " "}</p>
            <p className="mt-1 truncate text-sm text-[var(--muted)]">{profile?.email}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{profile ? `Client since ${dateOnly(profile.createdAt)}` : " "}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-ghost flex items-center gap-2 !py-2 text-xs">
                <Camera size={14} strokeWidth={1.6} /> {me?.avatarUrl ? "Change photo" : "Add a photo"}
              </button>
              {me?.avatarUrl && (
                <button onClick={removeAvatar} disabled={uploading} className="btn btn-ghost flex items-center gap-2 !py-2 text-xs">
                  <Trash2 size={14} strokeWidth={1.6} /> Remove
                </button>
              )}
            </div>
            {avatarMsg && <p className={`mt-3 text-xs ${avatarMsg.ok ? "text-[var(--ok)]" : "text-[var(--err)]"}`}>{avatarMsg.text}</p>}
          </div>

          <div className="text-right">
            <p className="label">Account number</p>
            <button onClick={copy} className="mt-1 flex items-center gap-2 text-sm tracking-wide hover:text-[#a89ff5]">
              {me?.accountNumber ?? "-"}
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form onSubmit={save} className="rise card space-y-5 p-6" style={delay(2)}>
          <p className="text-sm">Personal information</p>
          <div>
            <label className="label">Full name</label>
            <input className="input mt-2" required maxLength={80} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input mt-2 opacity-60" disabled value={profile?.email ?? ""} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input mt-2" placeholder="+212 6 00 00 00 00" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-[var(--ok)]" : "text-[var(--err)]"}`}>{msg.text}</p>}
          <button disabled={saving} className="btn btn-primary">{saving ? "Saving..." : "Save changes"}</button>
        </form>

        <form onSubmit={changePw} className="rise card space-y-5 p-6" style={delay(3)}>
          <p className="text-sm">Change password</p>
          <div>
            <label className="label">Current password</label>
            <input className="input mt-2" type="password" required autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="input mt-2" type="password" required minLength={8} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            {pw.next && (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${((score + 1) / 5) * 100}%`, background: STRENGTH_COLOR[score], transition: "width 0.4s, background 0.4s" }} />
                </div>
                <p className="mt-1.5 text-xs" style={{ color: STRENGTH_COLOR[score] }}>{STRENGTH_LABEL[score]}</p>
              </div>
            )}
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input className="input mt-2" type="password" required autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
          {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-[var(--ok)]" : "text-[var(--err)]"}`}>{pwMsg.text}</p>}
          <button disabled={pwBusy} className="btn btn-primary">{pwBusy ? "Updating..." : "Update password"}</button>
        </form>
      </div>
    </AppShell>
  );
}