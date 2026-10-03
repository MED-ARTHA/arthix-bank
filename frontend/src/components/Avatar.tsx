/* eslint-disable @next/next/no-img-element */
import { initials } from "@/lib/format";
import { mediaSrc } from "@/lib/media";

export default function Avatar({
  name, url, size = 40, online,
}: { name: string; url?: string | null; size?: number; online?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-[var(--line)] bg-white/[0.05] font-medium"
        style={{ fontSize: Math.max(10, size * 0.3) }}
      >
        {url ? <img src={mediaSrc(url)} alt="" className="h-full w-full object-cover" /> : initials(name)}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a14] bg-[var(--ok)]" />
      )}
    </div>
  );
}