"use client";

import "./sidebar-toggle.css";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const KEY = "arthix.nav.hidden";
const PUBLIC_ROUTES = ["/login", "/signup"];

/** Collapses the sidebar on desktop. State is kept in localStorage and mirrored on <html data-nav>. Shortcut: Ctrl/Cmd + B. */
export default function SidebarToggle() {
  const path = usePathname() ?? "";
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(KEY) === "1");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.nav = hidden ? "hidden" : "shown";
    localStorage.setItem(KEY, hidden ? "1" : "0");
  }, [hidden, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "b") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      setHidden((h) => !h);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready || path === "/" || PUBLIC_ROUTES.some((p) => path.startsWith(p))) return null;

  const Icon = hidden ? PanelLeftOpen : PanelLeftClose;
  const label = hidden ? "Show menu" : "Hide menu";
  return (
    <button type="button" className="nav-toggle" onClick={() => setHidden(!hidden)} aria-label={label} title={`${label} (Ctrl+B)`}>
      <Icon size={15} strokeWidth={1.6} />
    </button>
  );
}