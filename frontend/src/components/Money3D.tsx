"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { AR_BAM, AR_DIRHAM, AR_KINGDOM, type Bank, type Coin, type Note } from "@/lib/moroccan";

/** Pointer tilt: writes --rx / --ry on the element, CSS does the rest. Ignored on touch. */
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

/** Eight-pointed star (khatam), the classic Moroccan motif. */
export function Star({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <rect x="24" y="24" width="52" height="52" />
      <rect x="24" y="24" width="52" height="52" transform="rotate(45 50 50)" />
      <circle cx="50" cy="50" r="11" />
    </svg>
  );
}

function Arches() {
  return (
    <svg viewBox="0 0 180 80" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      {[8, 66, 124].map((x) => (
        <path key={x} d={`M${x} 76 V40 a22 22 0 1 1 48 0 V76 M${x + 8} 76 V42 a14 14 0 1 1 32 0 V76`} />
      ))}
    </svg>
  );
}

export function Banknote({ note }: { note: Note }) {
  const tilt = useTilt<HTMLDivElement>(8);
  const [back, setBack] = useState(false);
  const toggle = () => setBack((b) => !b);
  const style = { "--c1": note.from, "--c2": note.to } as CSSProperties;
  return (
    <div className="dc-note" style={style} {...tilt} role="button" tabIndex={0}
      aria-label={`${note.value} dirham note, press to flip`}
      onClick={toggle} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}>
      <div className={"dc-note-in" + (back ? " flip" : "")}>
        <div className="dc-face dc-front">
          <header><b>BANK AL-MAGHRIB</b><i lang="ar">{AR_BAM}</i></header>
          <div className="dc-val">{note.value}<small>DIRHAMS</small></div>
          <div className="dc-medal"><Star size={70} /></div>
          <div className="dc-thread" />
          <footer><span>{note.value}A 4710 8362</span><span lang="ar">{AR_DIRHAM}</span></footer>
        </div>
        <div className="dc-face dc-back">
          <header><b>RABAT</b><i lang="ar">{AR_KINGDOM}</i></header>
          <div className="dc-arches"><Arches /></div>
          <div className="dc-val dc-val-sm">{note.value}</div>
        </div>
      </div>
    </div>
  );
}

export function CoinView({ coin }: { coin: Coin }) {
  const style = { "--d": `${coin.size}px`, "--ring": coin.ring, "--core": coin.core } as CSSProperties;
  return (
    <div className="dc-coin" style={style} aria-label={`${coin.value} dirham coin`}>
      <div className="dc-coin-in">
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} className="dc-edge" style={{ transform: `translateZ(${i - 3}px)` }} />
        ))}
        <div className="dc-cface" style={{ transform: "translateZ(4px)" }}>
          <div className="dc-core"><b>{coin.value}</b><small>DH</small><span lang="ar">{AR_DIRHAM}</span></div>
        </div>
        <div className="dc-cface" style={{ transform: "rotateY(180deg) translateZ(4px)" }}>
          <div className="dc-core"><Star size={coin.size * 0.36} /><span lang="ar">{AR_KINGDOM}</span></div>
        </div>
      </div>
    </div>
  );
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