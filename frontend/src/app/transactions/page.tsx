"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import Receipt from "@/components/Receipt";
import TransactionList from "@/components/TransactionList";
import { api, Transaction } from "@/lib/api";
import { isIncoming } from "@/lib/format";

const filters = [
  { id: "ALL", label: "All" },
  { id: "DEPOSIT", label: "Deposits" },
  { id: "TRANSFER", label: "Transfers" },
  { id: "BILLS", label: "Bills" },
  { id: "SCHOOLS", label: "Schools" },
  { id: "SAVINGS", label: "Savings" },
];

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Transaction | null>(null);

  useEffect(() => {
    api.transactions().then(setTxs).catch(() => {});
  }, []);

  const q = query.trim().toLowerCase();
  const items = txs
    .filter((t) => filter === "ALL" || t.category === filter)
    .filter((t) => !q || (t.label + " " + t.reference + " " + t.receiptNo).toLowerCase().includes(q));

  function exportCsv() {
    const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Receipt", "Date", "Type", "Label", "Reference", "Amount", "Balance after"];
    const rows = items.map((t) =>
      [
        t.receiptNo,
        t.createdAt,
        t.type,
        t.label,
        t.reference,
        (isIncoming(t.type) ? "" : "-") + t.amount.toFixed(2),
        t.balanceAfter.toFixed(2),
      ]
        .map(esc)
        .join(",")
    );
    const blob = new Blob([[head.map(esc).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arthix-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">History</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Transactions</h1>
        </div>
        <button onClick={exportCsv} disabled={items.length === 0} className="btn btn-ghost flex items-center gap-2 text-xs">
          <Icon name="download" size={14} /> Export CSV
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? "chip-active" : ""}`}>
            {f.label}
          </button>
        ))}
        <input
          className="input ml-auto !w-full sm:!w-64"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-5">
        <TransactionList items={items} onSelect={setOpen} />
      </div>
      {open && <Receipt tx={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}