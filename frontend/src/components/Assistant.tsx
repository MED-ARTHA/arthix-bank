"use client";

import "./assistant.css";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Send, Sparkles, X } from "lucide-react";
import { request } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

const HELLO: Msg = { role: "assistant", content: "Hi, I'm the Arthix Assistant. Ask me how anything in the app works." };
const IDEAS = ["How do scheduled transfers work?", "What are the fees in Invest?", "How can I add money?"];

export default function Assistant() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([HELLO]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy, open]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: question }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const r = await request<{ reply: string }>("/api/assistant", {
        method: "POST",
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      setMsgs([...next, { role: "assistant", content: r.reply }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  if (path?.startsWith("/chat")) return null;

  return (
    <>
      {!open && (
        <button className="as-fab" onClick={() => setOpen(true)} aria-label="Open assistant">
          <Sparkles size={20} strokeWidth={1.6} />
        </button>
      )}
      {open && (
        <section className="as-panel" role="dialog" aria-label="Arthix Assistant">
          <header className="as-head">
            <span className="as-ava"><Sparkles size={15} /></span>
            <div><b>Arthix Assistant</b><small>Ask about the app</small></div>
            <button onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
          </header>

          <div className="as-body">
            {msgs.map((m, i) => <p key={i} className={"as-msg " + m.role}>{m.content}</p>)}
            {busy && <p className="as-msg assistant"><span className="dots"><span /><span /><span /></span></p>}
            {msgs.length === 1 && (
              <div className="as-ideas">{IDEAS.map((q) => <button key={q} onClick={() => ask(q)}>{q}</button>)}</div>
            )}
            <div ref={end} />
          </div>

          <div className="as-input">
            <input value={text} maxLength={500} placeholder="Type your question..." onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(text)} />
            <button onClick={() => ask(text)} disabled={busy || !text.trim()} aria-label="Send"><Send size={16} /></button>
          </div>
          <p className="as-note">AI can make mistakes. Demo app, not financial advice.</p>
        </section>
      )}
    </>
  );
}