/* eslint-disable @next/next/no-img-element */
"use client";

import "./chat.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check, CheckCheck, ChevronLeft, Clock, MessageCircle, Paperclip, Search, SendHorizontal, TriangleAlert, UserPlus, X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { useChat } from "@/components/ChatProvider";
import { api, Me } from "@/lib/api";
import { chatApi, type ChatMessage, type Conversation, type PeerInfo } from "@/lib/chatApi";
import { mediaSrc, uploadMedia, type UploadedMedia } from "@/lib/media";

type Msg = ChatMessage & { pending?: boolean; failed?: boolean };
type Peer = { account: string; name: string; avatarUrl: string | null };

const ACCOUNT_RE = /^ARX\d{13}$/;
const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const near = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 5 * 60 * 1000;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const y = new Date();
  y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function listTime(iso: string) {
  const d = new Date(iso);
  return sameDay(d, new Date()) ? time(iso) : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function ChatView() {
  const { status, send, sendTyping, markRead, subscribe } = useChat();

  const [me, setMe] = useState<Me | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [active, setActive] = useState<Peer | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewer, setViewer] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newAccount, setNewAccount] = useState("");
  const [found, setFound] = useState<PeerInfo | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);

  const meRef = useRef<Me | null>(null);
  const activeRef = useRef<Peer | null>(null);
  const convRef = useRef<Conversation[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTypingSent = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { meRef.current = me; });
  useEffect(() => { activeRef.current = active; });
  useEffect(() => { convRef.current = conversations; });

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setViewer(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  const loadConversations = useCallback(() => {
    chatApi.conversations().then(setConversations).catch(() => {}).finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    loadConversations();
    const w = new URLSearchParams(window.location.search).get("with");
    if (w && ACCOUNT_RE.test(w.toUpperCase())) {
      chatApi.peer(w.toUpperCase()).then((p) => openChat(p)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversations]);

  useEffect(() => {
    return subscribe({
      message: (m) => {
        const mine = m.from === meRef.current?.accountNumber;
        const peer = mine ? m.to : m.from;
        const isActive = activeRef.current?.account === peer;

        if (isActive) {
          setMsgs((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            if (mine && m.clientId) {
              const i = prev.findIndex((x) => x.clientId === m.clientId);
              if (i >= 0) {
                const copy = [...prev];
                copy[i] = m;
                return copy;
              }
            }
            return [...prev, m];
          });
          if (!mine) {
            markRead(peer);
            setTyping(false);
          }
        }

        const preview = m.content || (m.mediaType === "video" ? "Video" : "Photo");
        if (convRef.current.some((c) => c.account === peer)) {
          setConversations((prev) => {
            const cur = prev.find((c) => c.account === peer);
            if (!cur) return prev;
            const updated: Conversation = {
              ...cur, lastMessage: preview, lastAt: m.createdAt, lastMine: mine,
              unread: mine || isActive ? 0 : cur.unread + 1,
            };
            return [updated, ...prev.filter((c) => c.account !== peer)];
          });
        } else {
          loadConversations();
        }
      },
      typing: (from) => {
        if (activeRef.current?.account !== from) return;
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 3000);
      },
      read: (by) => {
        if (activeRef.current?.account !== by) return;
        setMsgs((prev) => prev.map((x) => (x.from === meRef.current?.accountNumber ? { ...x, read: true } : x)));
      },
      error: (text) => {
        setNotice(text);
        setMsgs((prev) => prev.map((x) => (x.pending ? { ...x, pending: false, failed: true } : x)));
      },
    });
  }, [subscribe, markRead, loadConversations]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const acc = active.account;

    chatApi
      .messages(acc)
      .then((list) => {
        if (cancelled) return;
        setMsgs(list);
        setLoadingThread(false);
        markRead(acc);
        setConversations((prev) => prev.map((c) => (c.account === acc ? { ...c, unread: 0 } : c)));
      })
      .catch(() => !cancelled && setLoadingThread(false));

    const poll = () => chatApi.presence(acc).then((r) => !cancelled && setOnline(r.online)).catch(() => {});
    poll();
    const id = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, markRead]);

  useEffect(() => {
    const acc = newAccount.replace(/\s+/g, "").toUpperCase();
    if (!ACCOUNT_RE.test(acc)) return;
    let cancelled = false;
    chatApi
      .peer(acc)
      .then((r) => { if (!cancelled) { setFound(r); setLookupError(""); } })
      .catch((e) => { if (!cancelled) { setFound(null); setLookupError(e instanceof Error ? e.message : "Error"); } })
      .finally(() => !cancelled && setLooking(false));
    return () => { cancelled = true; };
  }, [newAccount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs.length, typing]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [draft]);

  function openChat(peer: Peer) {
    setActive({ account: peer.account, name: peer.name, avatarUrl: peer.avatarUrl });
    setMsgs([]);
    setTyping(false);
    setOnline(false);
    setLoadingThread(true);
    setNotice("");
    setNewOpen(false);
    setNewAccount("");
    setFound(null);
    clearFile();
  }

  function onNewAccountChange(v: string) {
    setNewAccount(v);
    setFound(null);
    setLookupError("");
    setLooking(ACCOUNT_RE.test(v.replace(/\s+/g, "").toUpperCase()));
  }

  function clearFile() {
    setFile(null);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    const img = f.type.startsWith("image/");
    const vid = f.type.startsWith("video/");
    if (!img && !vid) { setNotice("Only images and videos can be sent."); return; }
    const max = img ? 10 : 25;
    if (f.size > max * 1024 * 1024) { setNotice(`${img ? "Images" : "Videos"} are limited to ${max} MB.`); return; }
    setNotice("");
    setFile(f);
  }

  async function submit() {
    const text = draft.trim();
    if ((!text && !file) || !active || uploading) return;
    if (!me?.accountNumber) { setNotice("Your account has no number yet."); return; }

    let media: UploadedMedia | undefined;
    if (file) {
      try {
        setUploading(true);
        setProgress(0);
        media = await uploadMedia(file, "chat", setProgress);
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Upload failed.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const clientId = crypto.randomUUID();
    if (!send(active.account, text, clientId, media?.id)) {
      setNotice("You are offline. Reconnecting...");
      return;
    }
    setNotice("");
    setMsgs((prev) => [
      ...prev,
      {
        id: -Date.now(), from: me.accountNumber as string, to: active.account, content: text,
        createdAt: new Date().toISOString(), read: false, clientId, pending: true,
        mediaUrl: media?.url ?? null, mediaType: media?.type ?? null,
      },
    ]);
    setDraft("");
    clearFile();
  }

  function onDraft(v: string) {
    setDraft(v);
    if (active && v && Date.now() - lastTypingSent.current > 2000) {
      lastTypingSent.current = Date.now();
      sendTyping(active.account);
    }
  }

  const statusMeta =
    status === "online" ? { color: "var(--ok)", text: "Live" }
    : status === "connecting" ? { color: "#e0b04a", text: "Reconnecting" }
    : { color: "var(--err)", text: "Offline" };

  const canSend = (!!draft.trim() || !!file) && status === "online" && !uploading;

  return (
    <div className="card rise grid h-[calc(100vh-6rem)] min-h-[520px] overflow-hidden lg:grid-cols-[340px_1fr]">
      {/* ---------- conversations ---------- */}
      <aside className={`${active ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-[var(--line)]`}>
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <div>
            <h1 className="serif text-2xl">Messages</h1>
            <p className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className={`h-2 w-2 rounded-full ${status === "online" ? "live" : ""}`} style={{ background: statusMeta.color }} />
              {statusMeta.text}
            </p>
          </div>
          <button onClick={() => setNewOpen((o) => !o)} className="btn btn-ghost flex items-center gap-2 !px-3 !py-2 text-xs" aria-label="New conversation">
            <UserPlus size={15} strokeWidth={1.6} /> New
          </button>
        </div>

        {newOpen && (
          <div className="pop mx-4 mb-3 rounded-lg border border-[var(--line)] bg-white/[0.03] p-3">
            <label className="label">Account number</label>
            <div className="relative mt-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input className="input !pl-9 tracking-wide" placeholder="ARX0000000000000" maxLength={20} autoFocus
                value={newAccount} onChange={(e) => onNewAccountChange(e.target.value)} />
            </div>
            <div className="mt-2 min-h-5 text-xs">
              {looking && <span className="text-[var(--muted)]">Checking account...</span>}
              {lookupError && <span className="text-[var(--err)]">{lookupError}</span>}
            </div>
            {found && (
              <button onClick={() => openChat(found)} className="btn btn-primary mt-1 flex w-full items-center justify-center gap-2 !py-2 text-sm">
                <MessageCircle size={15} strokeWidth={1.6} /> Chat with {found.name}
              </button>
            )}
          </div>
        )}

        <div className="chat-scroll min-h-0 flex-1 overflow-y-auto">
          {loadingList && (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => <div key={i} className="shimmer h-14 rounded-lg" />)}
            </div>
          )}
          {!loadingList && conversations.length === 0 && (
            <div className="px-6 py-14 text-center text-sm text-[var(--muted)]">
              No conversations yet.<br />Press <span className="text-white">New</span> and enter an account number.
            </div>
          )}
          {conversations.map((c) => (
            <button
              key={c.account}
              onClick={() => openChat(c)}
              className={`flex w-full items-center gap-3 border-b border-[var(--line)] px-5 py-3.5 text-left transition hover:bg-white/[0.04] ${
                active?.account === c.account ? "bg-white/[0.06]" : ""
              }`}
            >
              <Avatar name={c.name} url={c.avatarUrl} online={c.online} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm">{c.name}</p>
                  <span className="shrink-0 text-[11px] text-[var(--muted)]">{listTime(c.lastAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className={`truncate text-xs ${c.unread > 0 ? "text-white" : "text-[var(--muted)]"}`}>
                    {c.lastMine && "You: "}{c.lastMessage}
                  </p>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-medium text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ---------- thread ---------- */}
      <section className={`${active ? "flex" : "hidden lg:flex"} min-h-0 flex-col`}>
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)]">
              <MessageCircle size={26} strokeWidth={1.2} />
            </div>
            <p className="serif mt-5 text-2xl">Your conversations</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
              Pick a conversation, or start a new one with an Arthix account number. Messages, photos and videos arrive instantly.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-3.5">
              <button onClick={() => setActive(null)} className="text-[var(--muted)] hover:text-white lg:hidden" aria-label="Back">
                <ChevronLeft size={22} strokeWidth={1.5} />
              </button>
              <Avatar name={active.name} url={active.avatarUrl} online={online} />
              <div className="min-w-0">
                <p className="truncate text-sm">{active.name}</p>
                <p className="h-4 text-xs text-[var(--muted)]">
                  {typing ? (
                    <span className="flex items-center gap-1.5 text-[#a89ff5]">typing <span className="dots"><span /><span /><span /></span></span>
                  ) : online ? (
                    <span className="text-[var(--ok)]">Online</span>
                  ) : "Offline"}
                </p>
              </div>
            </header>

            <div ref={scrollRef} className="chat-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {loadingThread && (
                <div className="space-y-3">
                  <div className="shimmer h-10 w-1/2 rounded-2xl" />
                  <div className="shimmer ml-auto h-10 w-2/5 rounded-2xl" />
                  <div className="shimmer h-10 w-1/3 rounded-2xl" />
                </div>
              )}
              {!loadingThread && msgs.length === 0 && (
                <p className="py-16 text-center text-sm text-[var(--muted)]">Say hello to {active.name}.</p>
              )}

              {msgs.map((m, i) => {
                const mine = m.from === me?.accountNumber;
                const prev = msgs[i - 1];
                const next = msgs[i + 1];
                const newDay = !prev || !sameDay(new Date(prev.createdAt), new Date(m.createdAt));
                const groupedWithPrev = !!prev && !newDay && prev.from === m.from && near(prev.createdAt, m.createdAt);
                const groupedWithNext = !!next && next.from === m.from && sameDay(new Date(next.createdAt), new Date(m.createdAt)) && near(next.createdAt, m.createdAt);
                return (
                  <div key={m.clientId ?? m.id}>
                    {newDay && (
                      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-[var(--muted)]">
                        <span className="h-px flex-1 bg-[var(--line)]" />{dayLabel(m.createdAt)}<span className="h-px flex-1 bg-[var(--line)]" />
                      </div>
                    )}
                    <div className={`flex ${mine ? "justify-end" : "justify-start"} ${groupedWithPrev ? "mt-1" : "mt-3"}`}>
                      <div className={`bubble-in flex flex-col ${mine ? "items-end" : "items-start"} ${m.mediaUrl ? "w-[min(320px,78%)]" : "max-w-[78%]"}`}>
                        <div
                          className={`w-full overflow-hidden text-sm leading-relaxed ${m.mediaUrl ? "p-1.5" : "px-4 py-2.5"} ${
                            mine ? "rounded-2xl rounded-br-md bg-[#7c6df0] text-white" : "rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06]"
                          } ${m.failed ? "opacity-60" : ""}`}
                        >
                          {m.mediaUrl && (m.mediaType === "video" ? (
                            <video src={mediaSrc(m.mediaUrl)} controls preload="metadata" playsInline className="max-h-72 w-full rounded-xl bg-black" />
                          ) : (
                            <button onClick={() => setViewer(mediaSrc(m.mediaUrl))} className="block w-full overflow-hidden rounded-xl">
                              <img src={mediaSrc(m.mediaUrl)} alt="" loading="lazy" className="max-h-72 w-full object-cover transition duration-300 hover:scale-[1.03]" />
                            </button>
                          ))}
                          {m.content && (
                            <p className={`whitespace-pre-wrap break-words ${m.mediaUrl ? "px-2.5 pb-1 pt-2" : ""}`}>{m.content}</p>
                          )}
                        </div>
                        {!groupedWithNext && (
                          <p className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-[var(--muted)]">
                            {m.failed ? (
                              <span className="flex items-center gap-1 text-[var(--err)]"><TriangleAlert size={11} /> Not sent</span>
                            ) : (
                              <>
                                {time(m.createdAt)}
                                {mine && (m.pending ? <Clock size={12} /> : m.read ? <CheckCheck size={14} className="text-[#a89ff5]" /> : <Check size={14} />)}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div className="bubble-in mt-3 inline-flex rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-[var(--muted)]">
                  <span className="dots"><span /><span /><span /></span>
                </div>
              )}
            </div>

            {notice && <p className="border-t border-[var(--line)] bg-[rgba(239,116,128,0.08)] px-5 py-2 text-xs text-[var(--err)]">{notice}</p>}

            <footer className="border-t border-[var(--line)] p-4">
              {file && previewUrl && (
                <div className="pop mb-3 flex items-center gap-3 rounded-lg border border-[var(--line)] bg-white/[0.03] p-2 pr-3">
                  {file.type.startsWith("image/") ? (
                    <img src={previewUrl} alt="" className="h-14 w-14 rounded-md object-cover" />
                  ) : (
                    <video src={previewUrl} muted className="h-14 w-14 rounded-md bg-black object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">{file.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">{(file.size / 1048576).toFixed(1)} MB{uploading ? ` - ${Math.round(progress * 100)}%` : ""}</p>
                    {uploading && (
                      <div className="mt-1.5 h-1 overflow-hidden rounded bg-white/10">
                        <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                      </div>
                    )}
                  </div>
                  {!uploading && (
                    <button onClick={clearFile} className="text-[var(--muted)] hover:text-white" aria-label="Remove attachment"><X size={16} /></button>
                  )}
                </div>
              )}

              <div className="flex items-end gap-3">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="btn btn-ghost flex h-[46px] w-[46px] shrink-0 items-center justify-center !p-0"
                  aria-label="Attach a photo or video"
                >
                  <Paperclip size={18} strokeWidth={1.5} />
                </button>
                <textarea
                  ref={areaRef}
                  rows={1}
                  maxLength={1000}
                  className="input max-h-36 resize-none !py-3"
                  placeholder={status === "online" ? "Write a message..." : "Connecting..."}
                  value={draft}
                  onChange={(e) => onDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                />
                <button onClick={() => void submit()} disabled={!canSend} className="btn btn-primary flex h-[46px] w-[46px] shrink-0 items-center justify-center !p-0" aria-label="Send">
                  <SendHorizontal size={18} strokeWidth={1.6} />
                </button>
              </div>
              <p className="mt-2 flex justify-between text-[11px] text-[var(--muted)]">
                <span>Enter to send, Shift + Enter for a new line. Photos up to 10 MB, videos up to 25 MB.</span>
                {draft.length > 800 && <span>{draft.length}/1000</span>}
              </p>
            </footer>
          </>
        )}
      </section>

      {viewer && (
        <div className="overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6" onClick={() => setViewer(null)}>
          <button className="absolute right-5 top-5 text-white/80 hover:text-white" aria-label="Close"><X size={26} /></button>
          <img src={viewer} alt="" className="pop max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <AppShell>
      <ChatView />
    </AppShell>
  );
}