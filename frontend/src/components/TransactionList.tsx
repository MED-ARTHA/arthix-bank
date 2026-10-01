import type { Transaction } from "@/lib/api";
import { TYPE_META } from "@/lib/analytics";
import Icon from "@/components/Icon";
import { dateTime, delay, isIncoming, money } from "@/lib/format";

export default function TransactionList({
  items,
  onSelect,
}: {
  items: Transaction[];
  onSelect?: (t: Transaction) => void;
}) {
  if (items.length === 0) {
    return <div className="card p-8 text-center text-sm text-[var(--muted)]">No transactions yet.</div>;
  }
  return (
    <ul className="card divide-y divide-[var(--line)] overflow-hidden">
      {items.map((t, i) => {
        const incoming = isIncoming(t.type);
        const meta = TYPE_META[t.type] ?? TYPE_META.PAYMENT;
        return (
          <li key={t.id} className="rise" style={delay(Math.min(i, 8))}>
            <button
              onClick={() => onSelect?.(t)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[var(--surface-hover)]"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: meta.color + "22", color: meta.color }}
              >
                <Icon name={meta.icon} size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.label}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {t.reference} &middot; {dateTime(t.createdAt)}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-medium ${incoming ? "text-[var(--ok)]" : ""}`}>
                {incoming ? "+" : "-"}{money(t.amount)}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}