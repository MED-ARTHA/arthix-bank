"use client";

import { useState } from "react";

/** Photo with a dark scrim. Give it a size through className. Falls back to a plain dark panel if the file is missing. */
export default function Photo({
  src,
  alt = "",
  className = "",
  children,
}: {
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-[#0a0b18] ${className}`}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(3,3,10,0.2) 0%, rgba(3,3,10,0.8) 100%)" }}
      />
      {children && <div className="absolute inset-0">{children}</div>}
    </div>
  );
}