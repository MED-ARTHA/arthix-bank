import type { Transaction } from "@/lib/api";

export default function TransactionList({ items }: { items: Transaction[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No transactions yet.</p>;
  }
  return (
    <ul className="divide-y rounded-2xl bg-white shadow">
      {items.map((t) => (
        <li key={t.id} className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">{t.label}</p>
            <p className="text-xs text-gray-500">
              {t.reference} · {new Date(t.createdAt).toLocaleString()}
            </p>
          </div>
          <p className="font-semibold text-red-600">-{t.amount.toFixed(2)} MAD</p>
        </li>
      ))}
    </ul>
  );
}