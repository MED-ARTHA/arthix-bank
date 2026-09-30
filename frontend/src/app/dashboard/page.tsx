"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import TransactionList from "@/components/TransactionList";
import { api, Me, Transaction } from "@/lib/api";

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.transactions().then(setTxs).catch(() => {});
  }, []);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Hello{me ? `, ${me.fullName}` : ""}</h1>

      <div className="rounded-2xl bg-blue-600 p-6 text-white">
        <p className="text-sm opacity-80">Balance</p>
        <p className="text-3xl font-bold">{me ? me.balance.toFixed(2) : "..."} MAD</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <Link href="/payments" className="rounded-2xl bg-white p-4 shadow">Pay a bill / school</Link>
        <Link href="/offers" className="rounded-2xl bg-white p-4 shadow">Bank offers</Link>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent transactions</h2>
        <Link href="/transactions" className="text-sm text-blue-600">See all</Link>
      </div>
      <TransactionList items={txs.slice(0, 5)} />
    </AppShell>
  );
}