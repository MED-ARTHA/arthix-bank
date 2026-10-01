"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";
import { api, Me } from "@/lib/api";
import { initials, money } from "@/lib/format";

const banking: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/deposit", label: "Add money", icon: "plus" },
  { href: "/transfers", label: "Transfers", icon: "send" },
  { href: "/payments", label: "Payments", icon: "receipt" },
  { href: "/goals", label: "Savings goals", icon: "target" },
  { href: "/transactions", label: "Transactions", icon: "list" },
  { href: "/offers", label: "Offers & tools", icon: "gift" },
];
const account: { href: string; label: string; icon: IconName }[] = [
  { href: "/profile", label: "Profile & security", icon: "user" },
];

export function Brand({ size = 40, stacked = false }: { size?: number; stacked?: boolean }) {
  return (
    <span className={`flex items-center ${stacked ? "flex-col gap-3" : "gap-3"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="Arthix" style={{ height: size, width: "auto" }} className="logo-glow" />
      <span className={`font-semibold tracking-[0.3em] ${stacked ? "text-xl" : "text-[15px]"}`}>ARTHIX</span>
    </span>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
        active
          ? "bg-[var(--accent-soft)] text-white"
          : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-white"
      }`}
    >
      {active && <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded bg-[var(--accent)]" />}
      <Icon name={icon} size={18} />
      {label}
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  const loadMe = useCallback(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) router.replace("/login");
    else setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    loadMe();
    window.addEventListener("balance-changed", loadMe);
    return () => window.removeEventListener("balance-changed", loadMe);
  }, [ready, loadMe]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  if (!ready) return null;

  const close = () => setOpen(false);

  return (
    <div className="min-h-screen">
      {open && <div className="overlay fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={close} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--line)] bg-[rgba(4,4,12,0.86)] backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/dashboard" onClick={close} className="px-6 pb-6 pt-7">
          <Brand size={46} />
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          <p className="label px-3 pb-2 pt-1">Banking</p>
          {banking.map((l) => (
            <NavItem key={l.href} {...l} active={pathname === l.href} onClick={close} />
          ))}
          <p className="label px-3 pb-2 pt-5">Account</p>
          {account.map((l) => (
            <NavItem key={l.href} {...l} active={pathname === l.href} onClick={close} />
          ))}
        </nav>

        <div className="m-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7b6cf0] to-[#2dd4bf] text-sm font-semibold text-white">
              {me ? initials(me.fullName) : ""}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{me?.fullName ?? " "}</p>
              <p className="truncate text-xs text-[var(--muted)]">{me ? money(me.balance) : " "}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] py-2 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-white"
          >
            <Icon name="logout" size={14} /> Log out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[rgba(4,4,12,0.8)] px-4 backdrop-blur-md lg:hidden">
          <Brand size={28} />
          <button onClick={() => setOpen(true)} className="text-[var(--muted)] hover:text-white" aria-label="Menu">
            <Icon name="menu" size={22} />
          </button>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}