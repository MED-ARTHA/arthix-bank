"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import TransactionList from "@/components/TransactionList";
import { api, Transaction } from "@/lib/api";

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    api.transactions().then(setTxs).catch(() => {});
  }, []);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Transactions</h1>
      <TransactionList items={txs} />
    </AppShell>
  );
}