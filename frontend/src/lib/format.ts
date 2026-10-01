import type { CSSProperties } from "react";

export const money = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

export const plain = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

export const dateOnly = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long" });

export const delay = (i: number) => ({ "--i": i }) as CSSProperties;

const INCOMING = ["TRANSFER_IN", "DEPOSIT", "SAVINGS_IN"];
export const isIncoming = (type: string) => INCOMING.includes(type);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");