import type { Transaction } from "@/lib/api";
import { delay, isIncoming, money } from "@/lib/format";

const CAT: Record<string, string> = {
  BILLS: "Bill",
  SCHOOLS: "School",
  TRANSFER: "Transfer",
  DEPOSIT: "Deposit",
  SAVINGS: "Savings",
};

const short = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

export default function TransactionList({
  items,
  onSelect,
}: {
  items: Transaction[];
  onSelect?: (t: Transaction) => void;
}) {
  if (items.length === 0) {
    return <div className="card p-10 text-center text-sm text-[var(--muted)]">No transactions yet.</div>;
  }
  return (
    <ul className="card divide-y divide-[var(--line)] overflow-hidden">
      {items.map((t, i) => {
        const incoming = isIncoming(t.type);
        return (
          <li key={t.id} className="rise" style={delay(Math.min(i, 8))}>
            <button
              onClick={() => onSelect?.(t)}
              className="grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.04]"
            >
              <span className="text-xs uppercase tracking-wider text-[var(--muted)]">{short(t.createdAt)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm">{t.label}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {CAT[t.category] ?? t.category} &middot; {t.reference}
                </p>
              </div>
              <p className={`text-sm font-medium ${incoming ? "text-[var(--ok)]" : ""}`}>
                {incoming ? "+" : "-"}{money(t.amount)}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}