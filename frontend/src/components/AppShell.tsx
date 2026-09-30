"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/payments", label: "Payments" },
  { href: "/transactions", label: "Transactions" },
  { href: "/offers", label: "Offers" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) router.replace("/login");
    else setReady(true);
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  if (!ready) return <p className="p-6">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-3xl items-center gap-4 p-4 text-sm">
          <span className="font-bold text-blue-600">Arthix Banque</span>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "font-semibold text-blue-600" : "text-gray-600"}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={logout} className="ml-auto text-red-600">
            Logout
          </button>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 p-4">{children}</main>
    </div>
  );
}