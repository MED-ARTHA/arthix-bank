"use client";

import { useEffect } from "react";
import type { Transaction } from "@/lib/api";
import { dateTime, isIncoming, money } from "@/lib/format";

const TITLE: Record<string, string> = {
  PAYMENT: "Payment receipt",
  TRANSFER_OUT: "Transfer receipt",
  TRANSFER_IN: "Transfer received",
  DEPOSIT: "Deposit receipt",
  SAVINGS_OUT: "Savings transfer",
  SAVINGS_IN: "Savings withdrawal",
};

export default function Receipt({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const incoming = isIncoming(tx.type);
  const isTransfer = tx.type.startsWith("TRANSFER");

  const rows: { k: string; v: string; sub?: string }[] = [
    { k: "Receipt no.", v: tx.receiptNo },
    { k: "Date", v: dateTime(tx.createdAt) },
    { k: "From", v: tx.senderName, sub: tx.senderAccount ?? undefined },
    { k: "To", v: tx.beneficiaryName, sub: tx.beneficiaryAccount ?? undefined },
    { k: isTransfer ? "Note" : "Reference", v: isTransfer ? tx.note ?? "-" : tx.reference },
    { k: "Balance after", v: money(tx.balanceAfter) },
  ];

  return (
    <div className="overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        id="receipt"
        className="pop card w-full max-w-md p-8"
        style={{ background: "#0b0c16" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <span className="serif text-xl tracking-[0.2em]">ARTHIX</span>
          <span className="label">{TITLE[tx.type] ?? "Receipt"}</span>
        </div>

        <p className="serif mt-10 text-5xl tracking-tight">
          {incoming ? "+" : ""}{money(tx.amount)}
        </p>
        <p className="mt-3 flex items-center gap-2 text-xs text-[var(--ok)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" /> Completed
        </p>

        <dl className="mt-8 divide-y divide-[var(--line)] border-t border-[var(--line)] text-sm">
          {rows.map((r) => (
            <div key={r.k} className="flex items-start justify-between gap-6 py-3">
              <dt className="muted text-[var(--muted)]">{r.k}</dt>
              <dd className="text-right">
                {r.v}
                {r.sub && <span className="muted block text-xs tracking-wide text-[var(--muted)]">{r.sub}</span>}
              </dd>
            </div>
          ))}
        </dl>

        <p className="muted mt-6 text-xs leading-relaxed text-[var(--muted)]">
          Arthix Banque. Demo transaction, no real funds were moved.
        </p>

        <div className="no-print mt-7 flex gap-3">
          <button onClick={() => window.print()} className="btn btn-primary flex-1">
            Print / Save as PDF
          </button>
          <button onClick={onClose} className="btn btn-ghost">Close</button>
        </div>
      </div>
    </div>
  );
}