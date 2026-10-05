"use client";

import "./overview.css";
import { useEffect, useRef, useState } from "react";
import { Wifi } from "lucide-react";
import { api, Me } from "@/lib/api";

const DOTS = "\u2022\u2022\u2022\u2022";

/** The 3D card scene. Tilts with the pointer, disabled for touch and reduced motion (see overview.css). */
export default function CardScene() {
  const root = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  function track(e: React.PointerEvent<HTMLDivElement>) {
    const el = root.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  }

  function reset() {
    root.current?.style.setProperty("--px", "0");
    root.current?.style.setProperty("--py", "0");
  }

  const last4 = me?.accountNumber?.slice(-4);

  return (
    <div ref={root} className="rail-scene rise" onPointerMove={track} onPointerLeave={reset} aria-hidden="true">
      <div className="ov-scene">
        <div className="ov-stack">
          <div className="ov-card ov-c3" />
          <div className="ov-card ov-c2" />
          <div className="ov-card ov-c1">
            <div className="ov-top">
              <span>ARTHIX</span>
              <Wifi size={16} style={{ transform: "rotate(90deg)" }} />
            </div>
            <div className="ov-chip" />
            <div className="ov-foot">
              <span>{me?.fullName ?? "Arthix member"}</span>
              <span>{last4 ? `${DOTS} ${last4}` : ""}</span>
            </div>
          </div>
          <span className="ov-orb ov-o1" />
          <span className="ov-orb ov-o2" />
        </div>
      </div>
    </div>
  );
}