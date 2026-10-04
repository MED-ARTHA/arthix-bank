"use client";

import { useEffect, useRef } from "react";
import { Wifi } from "lucide-react";

/** Interactive 3D card: auto-rotates, can be dragged, keeps its momentum, then resumes. */
export default function Card3D() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    const glare = glareRef.current;
    const shadow = shadowRef.current;
    if (!stage || !card || !glare || !shadow) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const AUTO = reduce ? 0 : 0.32; // degrees per frame (60fps)
    let ry = -24;
    let rx = 8;
    let vy = AUTO;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let idleSince = 0;
    let prev = performance.now();
    let raf = 0;

    const apply = () => {
      card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      const rad = (ry * Math.PI) / 180;
      const facing = Math.cos(rad);
      glare.style.opacity = String(Math.max(0, facing) * 0.9);
      glare.style.transform = `translateX(${(Math.sin(rad) * 70).toFixed(1)}%)`;
      const w = 0.28 + Math.abs(Math.cos(rad)) * 0.72;
      shadow.style.transform = `translateX(${(Math.sin(rad) * 14).toFixed(1)}%) scaleX(${w.toFixed(3)})`;
      shadow.style.opacity = String(0.55 + Math.abs(Math.cos(rad)) * 0.45);
    };

    const tick = (t: number) => {
      const dt = Math.min(32, t - prev) / 16.67;
      prev = t;
      if (!dragging) {
        const idle = t - idleSince > 1400;
        const target = idle ? AUTO : 0;
        vy += (target - vy) * Math.min(1, 0.035 * dt);
        ry += vy * dt;
        rx += (8 - rx) * Math.min(1, 0.05 * dt);
      }
      apply();
      raf = requestAnimationFrame(tick);
    };

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      vy = 0;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add("c3d-grabbing");
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      ry += dx * 0.55;
      rx = Math.max(-35, Math.min(35, rx - dy * 0.3));
      vy = (dx * 0.55) / Math.max(1, (now - lastT) / 16.67);
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      idleSince = performance.now();
      vy = Math.max(-6, Math.min(6, vy));
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
      stage.classList.remove("c3d-grabbing");
    };

    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div ref={stageRef} className="c3d-stage" aria-hidden="true">
      <div className="c3d-float">
        <div ref={cardRef} className="c3d-card">
          <div className="c3d-face c3d-front">
            <div className="c3d-sheen" />
            <div ref={glareRef} className="c3d-glare" />
            <div className="vc-top">
              <span className="vc-brand">ARTHIX</span>
              <Wifi size={18} strokeWidth={1.5} style={{ transform: "rotate(90deg)" }} />
            </div>
            <div>
              <div className="vc-chip" />
              <p className="vc-num">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4821</p>
            </div>
            <div className="vc-foot"><span>Arthix Classic</span><span>Valid 09/29</span></div>
          </div>

          <div className="c3d-face c3d-back">
            <div className="c3d-stripe" />
            <div className="c3d-sign"><span>Authorized signature</span><b>&bull;&bull;&bull;</b></div>
            <p className="c3d-legal">Issued by Arthix. Demo environment, no real funds.</p>
          </div>
        </div>
        <div ref={shadowRef} className="c3d-shadow" />
      </div>
    </div>
  );
}