"use client";

const MARKS = [
  { name: "NORDALIS", cls: "pm-wide", icon: "M3 17 L12 4 L21 17 Z" },
  { name: "Verano", cls: "pm-serif", icon: "M12 3 a9 9 0 1 0 0.01 0 M12 8 a4 4 0 1 1 -0.01 0" },
  { name: "kestrel", cls: "pm-round", icon: "M3 12 Q12 2 21 12 Q12 22 3 12" },
  { name: "QUANTA", cls: "pm-bold", icon: "M4 4 H20 V20 H4 Z M9 9 H15 V15 H9 Z" },
  { name: "Meridian", cls: "pm-light", icon: "M12 2 V22 M2 12 H22" },
  { name: "ALTURA", cls: "pm-wide", icon: "M3 20 L9 8 L13 15 L16 10 L21 20 Z" },
];

/** Infinite "trusted by" strip. Names are fictional placeholders: replace with real partner logos. */
export default function PartnerStrip() {
  const row = [...MARKS, ...MARKS, ...MARKS, ...MARKS];
  return (
    <div className="ps" aria-label="Partners">
      <p className="ps-label"><i />Trusted partners<i /></p>
      <div className="ps-mask">
        <div className="ps-track">
          {row.map((m, i) => (
            <span key={i} className={"ps-mark " + m.cls}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                <path d={m.icon} />
              </svg>
              {m.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}