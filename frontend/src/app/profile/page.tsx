"use client";

import "./profile.css";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { api, Me, Profile } from "@/lib/api";
import { uploadMedia } from "@/lib/media";
import { clearAvatar, setAvatar } from "@/lib/mediaApi";
import { dateOnly, delay } from "@/lib/format";

const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["#ef7480", "#ef7480", "#e0b04a", "#7c6df0", "#5cc9a7"];

const rulesOf = (p: string): [string, boolean][] => [
  ["At least 8 characters", p.length >= 8],
  ["Upper and lower case letters", /[A-Z]/.test(p) && /[a-z]/.test(p)],
  ["A number", /\d/.test(p)],
  ["A symbol, like ! or #", /[^A-Za-z0-9]/.test(p)],
];

const strengthOf = (p: string) => (p.length < 8 ? 0 : Math.min(rulesOf(p).filter(([, ok]) => ok).length, 4));

type Note = { ok: boolean; text: string } | null;

function Feedback({ note }: { note: Note }) {
  if (!note) return null;
  return (
    <p className="pf-msg" style={{ color: note.ok ? "var(--ok)" : "var(--err)" }}>
      {note.ok && <Check size={14} />}
      {note.text}
    </p>
  );
}

function PasswordField({ label, value, onChange, autoComplete, minLength }: {
  label: string; value: string; onChange: (v: string) => void; autoComplete: string; minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="pf-pass">
        <input className="input" type={show ? "text" : "password"} required minLength={minLength}
          autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={16} strokeWidth={1.6} /> : <Eye size={16} strokeWidth={1.6} />}
        </button>
      </div>
    </div>
  );
}

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
      setMsg({ ok: true, text: "Saved." });
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

  const name = profile?.fullName ?? me?.fullName ?? "";
  const dirty = form.fullName.trim() !== (profile?.fullName ?? "") || form.phone.trim() !== (profile?.phone ?? "");
  const score = strengthOf(pw.next);

  return (
    <AppShell>
      <header className="rise">
        <p className="label">Account</p>
        <h1 className="serif mt-2 text-4xl">Profile & security</h1>
        <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">Your details, your photo and your password. Changes apply right away.</p>
      </header>

      <div className="pf mt-8">
        <aside className="pf-id card rise" style={delay(1)}>
          <div className="pf-ava">
            <Avatar name={name} url={me?.avatarUrl} size={112} />
            <button type="button" className="pf-cam" onClick={() => fileRef.current?.click()} disabled={uploading}
              aria-label={me?.avatarUrl ? "Change photo" : "Add a photo"}>
              {uploading ? `${Math.round(progress * 100)}%` : <Camera size={15} strokeWidth={1.7} />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => onPick(e.target.files?.[0])} />
          </div>

          <p className="pf-name serif">{name || " "}</p>
          <p className="pf-mail">{profile?.email}</p>

          {me?.avatarUrl && (
            <button type="button" className="pf-link" onClick={removeAvatar} disabled={uploading}>
              <Trash2 size={13} strokeWidth={1.6} /> Remove photo
            </button>
          )}
          <Feedback note={avatarMsg} />

          <dl className="pf-facts">
            <div>
              <dt>Account number</dt>
              <dd>
                <button type="button" className="pf-copy" onClick={copy}>
                  {me?.accountNumber ?? "-"}
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </dd>
            </div>
            <div>
              <dt>Client since</dt>
              <dd>{profile ? dateOnly(profile.createdAt) : " "}</dd>
            </div>
          </dl>
        </aside>

        <div className="pf-main">
          <form onSubmit={save} className="card pf-section rise" style={delay(2)}>
            <div className="pf-head">
              <h2 className="serif">Personal details</h2>
              <p>This is how other members see you in Messages.</p>
            </div>
            <div className="pf-fields two">
              <div>
                <label className="label">Full name</label>
                <input className="input mt-2" required maxLength={80} value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input mt-2" placeholder="+212 6 00 00 00 00" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <p className="pf-hint">Optional.</p>
              </div>
            </div>
            <div className="pf-fields">
              <div>
                <label className="label">Email</label>
                <input className="input mt-2 opacity-60" disabled value={profile?.email ?? ""} />
                <p className="pf-hint">Your email is your sign-in, it can&apos;t be changed here.</p>
              </div>
            </div>
            <div className="pf-foot">
              <Feedback note={msg} />
              <button disabled={saving || !dirty} className="btn btn-primary">{saving ? "Saving..." : "Save changes"}</button>
            </div>
          </form>

          <form onSubmit={changePw} className="card pf-section rise" style={delay(3)}>
            <div className="pf-head">
              <h2 className="serif">Password</h2>
              <p>Pick something you don&apos;t use anywhere else.</p>
            </div>
            <div className="pf-fields">
              <PasswordField label="Current password" value={pw.current} autoComplete="current-password"
                onChange={(v) => setPw({ ...pw, current: v })} />
              <div className="pf-fields two" style={{ marginTop: 0 }}>
                <div>
                  <PasswordField label="New password" value={pw.next} autoComplete="new-password" minLength={8}
                    onChange={(v) => setPw({ ...pw, next: v })} />
                </div>
                <PasswordField label="Confirm new password" value={pw.confirm} autoComplete="new-password"
                  onChange={(v) => setPw({ ...pw, confirm: v })} />
              </div>
            </div>

            {pw.next && (
              <>
                <div className="pf-meter" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <i key={i} style={{ background: i < Math.max(score, 1) ? STRENGTH_COLOR[score] : undefined }} />
                  ))}
                </div>
                <p className="pf-hint" style={{ color: STRENGTH_COLOR[score] }}>{STRENGTH_LABEL[score]}</p>
              </>
            )}
            <ul className="pf-rules">
              {rulesOf(pw.next).map(([text, ok]) => (
                <li key={text} className={ok ? "ok" : ""}>
                  {ok ? <Check size={13} strokeWidth={2} /> : <span className="dot" />}
                  {text}
                </li>
              ))}
            </ul>

            <div className="pf-foot">
              <Feedback note={pwMsg} />
              <button disabled={pwBusy || !pw.current || !pw.next || !pw.confirm} className="btn btn-primary">
                {pwBusy ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}