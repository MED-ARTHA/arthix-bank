"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Bank, Coin, Note } from "@/lib/moroccan";

const MONEY = "/images/money";
const NOTE_RATIO: Record<number, number> = { 20: 1.9, 50: 1.95, 100: 2.06, 200: 2.08 };
const PAPER_LAYERS = [-1, 0, 1];
const COIN_LAYERS = Array.from({ length: 11 }, (_, i) => i - 5);
const RESUME_AFTER_MS = 2500;
const COIN_SPIN = 0.6;

type Mode = "sway" | "spin";

type Spin = {
  rx: number; ry: number; vx: number; vy: number;
  gx: number | null; gy: number | null;
  down: boolean; moved: number; last: number; amp: number;
};

/**
 * Free rotation with the pointer, with inertia, plus an automatic motion that pauses
 * while the user interacts and resumes a moment after.
 *  - "sway": the object gently rocks around its pose (banknotes)
 *  - "spin": the object turns continuously (coins)
 * Every frame also publishes the lighting variables used by the shadow and the gloss.
 */
function useSpin(home: { rx: number; ry: number }, mode: Mode) {
  const ref = useRef<HTMLDivElement>(null);
  const k = useRef<Spin>({
    rx: home.rx, ry: home.ry, vx: 0, vy: 0, gx: null, gy: null,
    down: false, moved: 0, last: -RESUME_AFTER_MS, amp: 0,
  });

  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const frame = (now: number) => {
      const s = k.current;
      const idle = !calm && !s.down && s.gx === null && now - s.last > RESUME_AFTER_MS;

      if (!s.down) {
        if (s.gx !== null && s.gy !== null) {
          s.rx += (s.gx - s.rx) * 0.14;
          s.ry += (s.gy - s.ry) * 0.14;
          if (Math.abs(s.gx - s.rx) < 0.1 && Math.abs(s.gy - s.ry) < 0.1) {
            s.rx = s.gx; s.ry = s.gy; s.gx = null; s.gy = null;
          }
        } else {
          s.rx += s.vx; s.ry += s.vy;
          s.vx *= 0.93; s.vy *= 0.93;
          if (idle && mode === "spin") s.ry += COIN_SPIN;
        }
      }

      s.amp += ((idle && mode === "sway" ? 1 : 0) - s.amp) * 0.04;
      const t = now / 1000;
      const rx = s.rx + Math.cos(t * 0.9) * 4 * s.amp;
      const ry = s.ry + Math.sin(t * 0.7) * 16 * s.amp;

      const el = ref.current;
      if (el) {
        el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
        const stage = el.parentElement;
        if (stage) {
          const a = (ry * Math.PI) / 180;
          const b = (rx * Math.PI) / 180;
          stage.style.setProperty("--sx", `${(-Math.sin(a) * 24).toFixed(1)}px`);
          stage.style.setProperty("--sw", (0.45 + 0.55 * Math.abs(Math.cos(a))).toFixed(2));
          stage.style.setProperty("--so", (0.55 + 0.45 * Math.abs(Math.cos(b))).toFixed(2));
          stage.style.setProperty("--gl", `${((Math.sin(a) * 0.5 + 0.5) * 100).toFixed(0)}%`);
        }
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const release = () => { k.current.down = false; k.current.last = performance.now(); };

  return {
    ref,
    wasTap: () => k.current.moved < 6,
    flip() {
      const s = k.current;
      s.gx = home.rx;
      s.gy = (Math.round(s.ry / 180) + 1) * 180;
      s.vx = 0; s.vy = 0; s.last = performance.now();
    },
    reset() {
      const s = k.current;
      s.gx = Math.round((s.rx - home.rx) / 360) * 360 + home.rx;
      s.gy = Math.round(s.ry / 360) * 360 + home.ry;
      s.vx = 0; s.vy = 0; s.last = performance.now();
    },
    bind: {
      onPointerDown(e: PointerEvent<HTMLDivElement>) {
        const s = k.current;
        e.currentTarget.setPointerCapture(e.pointerId);
        s.down = true; s.moved = 0; s.last = performance.now();
        s.gx = null; s.gy = null; s.vx = 0; s.vy = 0;
      },
      onPointerMove(e: PointerEvent<HTMLDivElement>) {
        const s = k.current;
        if (!s.down) return;
        s.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
        s.ry += e.movementX * 0.6;
        s.rx -= e.movementY * 0.6;
        s.vy = e.movementX * 0.6;
        s.vx = -e.movementY * 0.6;
      },
      onPointerUp: release,
      onPointerCancel: release,
    },
  };
}

export function Banknote({ note }: { note: Note }) {
  const spin = useSpin({ rx: -6, ry: 0 }, "sway");
  const style = { "--ratio": NOTE_RATIO[note.value] ?? 2 } as CSSProperties;
  return (
    <div className="dc-stage dc-stage-note" style={style} {...spin.bind}
      onClick={() => spin.wasTap() && spin.flip()} onDoubleClick={spin.reset}
      role="img" aria-label={`${note.value} dirham banknote, drag to rotate`}>
      <span className="dc-shadow" aria-hidden="true" />
      <div ref={spin.ref} className="dc-obj">
        {PAPER_LAYERS.map((z) => <i key={z} className="dc-ply" style={{ transform: `translateZ(${z}px)` }} />)}
        <img className="dc-sheet" src={`${MONEY}/${note.value}dh.jpg`} alt="" draggable={false}
          style={{ transform: "translateZ(1.5px)" }} />
        <img className="dc-sheet" src={`${MONEY}/${note.value}dhvers.jpg`} alt="" draggable={false}
          style={{ transform: "rotateY(180deg) translateZ(1.5px)" }} />
        <span className="dc-gloss" style={{ transform: "translateZ(1.6px)" }} />
        <span className="dc-gloss" style={{ transform: "rotateY(180deg) translateZ(1.6px)" }} />
      </div>
    </div>
  );
}

export function CoinView({ coin }: { coin: Coin }) {
  const spin = useSpin({ rx: -10, ry: -20 }, "spin");
  const style = { "--d": `${coin.size}px`, "--edge": coin.ring } as CSSProperties;
  return (
    <div className="dc-stage dc-stage-coin" style={style} {...spin.bind} onDoubleClick={spin.reset}
      role="img" aria-label={`${coin.value} dirham coin, drag to rotate`}>
      <span className="dc-shadow" aria-hidden="true" />
      <div ref={spin.ref} className="dc-obj dc-coin-obj">
        {COIN_LAYERS.map((z) => <i key={z} className="dc-edge" style={{ transform: `translateZ(${z}px)` }} />)}
        <img className="dc-cface" src={`${MONEY}/${coin.value}dh.png`} alt="" draggable={false}
          style={{ transform: "translateZ(6px)" }} />
        <img className="dc-cface" src={`${MONEY}/${coin.value}dhvers.png`} alt="" draggable={false}
          style={{ transform: "rotateY(180deg) translateZ(6px)" }} />
      </div>
    </div>
  );
}

/** Pointer tilt for the bank cards: writes --rx / --ry, CSS does the rest. Ignored on touch. */
function useTilt<T extends HTMLElement>(max = 10) {
  const ref = useRef<T>(null);
  const set = (rx: string, ry: string) => {
    ref.current?.style.setProperty("--rx", rx);
    ref.current?.style.setProperty("--ry", ry);
  };
  return {
    ref,
    onPointerMove(e: PointerEvent<T>) {
      const el = ref.current;
      if (!el || e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      set(`${(-y * max).toFixed(1)}deg`, `${(x * max).toFixed(1)}deg`);
    },
    onPointerLeave() { set("0deg", "0deg"); },
  };
}

export function BankCard({ bank, active, onPick }: { bank: Bank; active: boolean; onPick: () => void }) {
  const tilt = useTilt<HTMLButtonElement>(9);
  const [noLogo, setNoLogo] = useState(false);
  const style = { "--c1": bank.from, "--c2": bank.to } as CSSProperties;
  return (
    <button type="button" className={"dc-bank" + (active ? " on" : "")} style={style} {...tilt} onClick={onPick}>
      <div className="dc-bank-in">
        <div className="dc-bank-top"><span>{bank.kind}</span><i /></div>
        {noLogo ? (
          <b className="dc-word">{bank.name}</b>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="dc-logo" src={`/banks/${bank.id}.svg`} alt={bank.name} onError={() => setNoLogo(true)} />
        )}
        <div className="dc-chip" />
      </div>
    </button>
  );
}