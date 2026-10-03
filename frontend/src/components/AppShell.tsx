"use client";

import Logo from "@/components/Logo";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight, Gift, House, List, LogOut, Menu, MessageCircle, Plus, Receipt, Send, Target, User, type LucideIcon,
} from "lucide-react";
import ChatProvider, { useChat } from "@/components/ChatProvider";
import { api, Me } from "@/lib/api";
import { initials, money } from "@/lib/format";
import { mediaSrc } from "@/lib/media";

type Item = { href: string; label: string; icon: LucideIcon };

const banking: Item[] = [
  { href: "/dashboard", label: "Overview", icon: House },
  { href: "/chat", label: "Messages", icon: MessageCircle },
  { href: "/deposit", label: "Add money", icon: Plus },
  { href: "/transfers", label: "Transfers", icon: Send },
  { href: "/scheduled", label: "Scheduled", icon: ArrowLeftRight },
  { href: "/payments", label: "Payments", icon: Receipt },
  { href: "/goals", label: "Savings goals", icon: Target },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/offers", label: "Offers & tools", icon: Gift },
];
const account: Item[] = [{ href: "/profile", label: "Profile & security", icon: User }];

export function Brand({ size = 40 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <Logo height={size} />;
}

function NavItem({
  item, active, badge, onClick,
}: { item: Item; active: boolean; badge?: number; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
        active ? "bg-white/[0.06] text-white" : "text-[var(--muted)] hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {active && <span className="absolute bottom-2 left-0 top-2 w-px bg-[var(--accent)]" />}
      <Icon size={17} strokeWidth={1.5} />
      {item.label}
      {!!badge && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-medium text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const { unread } = useChat();

  const loadMe = useCallback(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    loadMe();
    window.addEventListener("balance-changed", loadMe);
    return () => window.removeEventListener("balance-changed", loadMe);
  }, [loadMe]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen">
      {open && <div className="overlay fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={close} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--line)] bg-[rgba(3,3,10,0.9)] backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/dashboard" onClick={close} className="px-6 pb-6 pt-7">
          <Brand size={64} />
        </Link>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          <p className="label px-3 pb-2">Banking</p>
          {banking.map((l) => (
            <NavItem key={l.href} item={l} active={pathname === l.href} badge={l.href === "/chat" ? unread : undefined} onClick={close} />
          ))}
          <p className="label px-3 pb-2 pt-6">Account</p>
          {account.map((l) => (
            <NavItem key={l.href} item={l} active={pathname === l.href} onClick={close} />
          ))}
        </nav>

        <div className="border-t border-[var(--line)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--line)] text-xs font-medium">
              {me?.avatarUrl ? <img src={mediaSrc(me.avatarUrl)} alt="" className="h-full w-full object-cover" /> : me ? initials(me.fullName) : ""}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm">{me?.fullName ?? " "}</p>
              <p className="truncate text-xs text-[var(--muted)]">{me ? money(me.balance) : " "}</p>
            </div>
          </div>
          <button onClick={logout} className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)] transition hover:text-white">
            <LogOut size={14} strokeWidth={1.5} /> Log out
          </button>
          <p className="mt-4 text-[10px] leading-relaxed text-[var(--muted)]">Demo environment. No real funds are moved.</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[rgba(3,3,10,0.85)] px-4 backdrop-blur-md lg:hidden">
          <Brand size={64} />
          <button onClick={() => setOpen(true)} className="relative text-[var(--muted)] hover:text-white" aria-label="Menu">
            <Menu size={22} strokeWidth={1.5} />
            {unread > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />}
          </button>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8 lg:px-12 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) router.replace("/login");
    else setReady(true);
  }, [router]);

  if (!ready) return null;
  return (
    <ChatProvider>
      <Shell>{children}</Shell>
    </ChatProvider>
  );
}