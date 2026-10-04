"use client";

import "./select.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type Option = { value: string; label: string; group?: string; hint?: string };

export default function Select({
  value, onChange, options, placeholder = "Select...", searchable,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const showSearch = searchable ?? options.length > 6;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => (o.label + " " + (o.group ?? "")).toLowerCase().includes(s)) : options;
  }, [options, q]);

  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);

  function toggle() {
    setOpen((o) => !o);
    setQ("");
    setIdx(Math.max(0, options.findIndex((o) => o.value === value)));
  }
  function pick(o: Option) { onChange(o.value); setOpen(false); }

  function onKey(e: React.KeyboardEvent) {
    if (!open) { if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); toggle(); } return; }
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(list.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (list[idx]) pick(list[idx]); }
  }

  return (
    <div ref={root} className="sel" onKeyDown={onKey}>
      <button type="button" className={"sel-btn" + (open ? " open" : "")} onClick={toggle} aria-haspopup="listbox" aria-expanded={open}>
        <span className={current ? "" : "sel-ph"}>{current?.label ?? placeholder}</span>
        <ChevronDown size={16} strokeWidth={1.6} className="sel-chev" />
      </button>

      {open && (
        <div className="sel-pop" role="listbox">
          {showSearch && (
            <div className="sel-search">
              <Search size={14} strokeWidth={1.6} />
              <input autoFocus placeholder="Search..." value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} />
            </div>
          )}
          <div className="sel-list">
            {list.length === 0 && <p className="sel-empty">No result</p>}
            {list.map((o, i) => (
              <div key={o.value}>
                {o.group && o.group !== list[i - 1]?.group && <p className="sel-group">{o.group}</p>}
                <button type="button" role="option" aria-selected={o.value === value}
                  className={"sel-opt" + (i === idx ? " hl" : "") + (o.value === value ? " on" : "")}
                  onMouseEnter={() => setIdx(i)} onClick={() => pick(o)}>
                  <span>{o.label}</span>
                  {o.hint && <small>{o.hint}</small>}
                  {o.value === value && <Check size={15} strokeWidth={2} className="sel-check" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}