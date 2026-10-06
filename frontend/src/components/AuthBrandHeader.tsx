"use client";

import "./auth-brand.css";
import { usePathname } from "next/navigation";

const AUTH_ROUTES = ["/login", "/signup"];

/** Centered brand header for the sign in / sign up pages. Mounted once in the root layout. */
export default function AuthBrandHeader() {
  const path = usePathname() ?? "";
  if (!AUTH_ROUTES.some((p) => path.startsWith(p))) return null;

  return (
    <header className="ab" aria-label="Arthix">
      <span className="ab-line ab-left" aria-hidden="true" />
      <div className="ab-center">
        <span className="ab-glow" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-trim.png"
          alt="Arthix"
          className="ab-logo"
          onError={(e) => {
            const el = e.currentTarget;
            if (!el.src.endsWith("/logo-mark.png")) el.src = "/logo-mark.png";
          }}
        />
        <p className="ab-caption">Online banking</p>
      </div>
      <span className="ab-line ab-right" aria-hidden="true" />
    </header>
  );
}