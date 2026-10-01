"use client";

import { useEffect } from "react";
import type { Transaction } from "@/lib/api";
import { dateTime, isIncoming, money } from "@/lib/format";

const META: Record<string, { title: string; kind: string }> = {
  PAYMENT: { title: "Payment confirmed", kind: "Bill / school payment" },
  TRANSFER_OUT: { title: "Transfer sent", kind: "Account transfer" },
  TRANSFER_IN: { title: "Transfer received", kind: "Account transfer" },
  DEPOSIT: { title: "Deposit completed", kind: "Account top-up" },
  SAVINGS_OUT: { title: "Moved to savings", kind: "Savings goal" },
  SAVINGS_IN: { title: "Moved from savings", kind: "Savings goal" },
};

export default function Receipt({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const incoming = isIncoming(tx.type);
  const isTransfer = tx.type.startsWith("TRANSFER");
  const meta = META[tx.type] ?? META.PAYMENT;

  const rows: { k: string; v: string; sub?: string }[] = [
    { k: "Receipt no.", v: tx.receiptNo },
    { k: "Date", v: dateTime(tx.createdAt) },
    { k: "Type", v: meta.kind },
    { k: "From", v: tx.senderName, sub: tx.senderAccount ?? undefined },
    { k: "To", v: tx.beneficiaryName, sub: tx.beneficiaryAccount ?? undefined },
    { k: isTransfer ? "Note" : "Reference", v: isTransfer ? tx.note ?? "-" : tx.reference },
    { k: "Balance after", v: money(tx.balanceAfter) },
  ];

  return (
    <div
      className="overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        id="receipt"
        className="pop card w-full max-w-md p-7"
        style={{ background: "#0b0b14" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle className="check-circle" cx="26" cy="26" r="24" stroke="var(--ok)" strokeWidth="1.5" />
            <path className="check-mark" d="M16 27l7 7 14-15" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="label mt-4">{meta.title}</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">
            {incoming ? "+" : ""}{money(tx.amount)}
          </p>
        </div>

        <dl className="mt-7 divide-y divide-[var(--line)] text-sm">
          {rows.map((r) => (
            <div key={r.k} className="flex items-start justify-between gap-6 py-3">
              <dt className="muted text-[var(--muted)]">{r.k}</dt>
              <dd className="text-right font-medium">
                {r.v}
                {r.sub && (
                  <span className="muted block text-xs font-normal tracking-wide text-[var(--muted)]">{r.sub}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <p className="muted mt-5 text-center text-xs text-[var(--muted)]">
          Arthix Banque &middot; demo transaction, no real funds moved
        </p>

        <div className="no-print mt-6 flex gap-3">
          <button onClick={() => window.print()} className="btn btn-primary flex-1">
            Print / Save as PDF
          </button>
          <button onClick={onClose} className="btn btn-ghost">Close</button>
        </div>
      </div>
    </div>
  );
}