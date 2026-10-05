"use client";

import "./menu-logo.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PUBLIC_ROUTES = ["/login", "/signup"];

/** Shows the Arthix logo in the top corner while the sidebar is hidden (the sidebar flag lives on <html data-nav>). */
export default function HiddenMenuLogo() {
  const path = usePathname() ?? "";
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setHidden(root.dataset.nav === "hidden");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-nav"] });
    return () => observer.disconnect();
  }, []);

  if (!hidden || path === "/" || PUBLIC_ROUTES.some((p) => path.startsWith(p))) return null;

  return (
    <Link href="/dashboard" className="menu-logo" aria-label="Arthix, back to overview">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-trim.png"
        alt="Arthix"
        onError={(e) => {
          const el = e.currentTarget;
          if (!el.src.endsWith("/logo-mark.png")) el.src = "/logo-mark.png";
        }}
      />
    </Link>
  );
}