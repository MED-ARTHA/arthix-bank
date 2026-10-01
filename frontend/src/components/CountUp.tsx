"use client";

import { useEffect, useState } from "react";

export default function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
}