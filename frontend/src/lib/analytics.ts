import type { Transaction } from "./api";

export const isSpend = (t: Transaction) => t.type === "PAYMENT" || t.type === "TRANSFER_OUT";

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  BILLS: { label: "Bills", color: "#fbbf24" },
  SCHOOLS: { label: "Schools", color: "#38bdf8" },
  TRANSFER: { label: "Transfers", color: "#8b7cf6" },
};

export const TYPE_META: Record<string, { color: string; icon: "receipt" | "send" | "plus" | "target" }> = {
  PAYMENT: { color: "#fbbf24", icon: "receipt" },
  TRANSFER_OUT: { color: "#8b7cf6", icon: "send" },
  TRANSFER_IN: { color: "#8b7cf6", icon: "send" },
  DEPOSIT: { color: "#4fd1a5", icon: "plus" },
  SAVINGS_OUT: { color: "#2dd4bf", icon: "target" },
  SAVINGS_IN: { color: "#2dd4bf", icon: "target" },
};

export function byCategory(txs: Transaction[]) {
  const sums: Record<string, number> = {};
  for (const t of txs.filter(isSpend)) sums[t.category] = (sums[t.category] ?? 0) + t.amount;
  return Object.entries(sums)
    .map(([key, value]) => ({
      key,
      value,
      label: CATEGORY_META[key]?.label ?? key,
      color: CATEGORY_META[key]?.color ?? "#8a8aa2",
    }))
    .sort((a, b) => b.value - a.value);
}

export function last7Days(txs: Transaction[]) {
  const days: { key: string; label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toDateString(),
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      value: 0,
    });
  }
  for (const t of txs.filter(isSpend)) {
    const slot = days.find((d) => d.key === new Date(t.createdAt).toDateString());
    if (slot) slot.value += t.amount;
  }
  return days;
}

export function balanceSeries(txs: Transaction[]) {
  return txs
    .slice(0, 20)
    .reverse()
    .map((t) => t.balanceAfter);
}