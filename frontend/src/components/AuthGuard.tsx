"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

/** Blocks the page until a valid session is confirmed by the backend. */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function deny() {
      localStorage.removeItem("token");
      if (!cancelled) router.replace("/login");
    }

    function check() {
      if (!localStorage.getItem("token")) {
        setOk(false);
        return deny();
      }
      api.me()
        .then(() => !cancelled && setOk(true))
        .catch((e) => {
          // 401 = token invalide ou expire. Autre erreur (reseau): on ne deconnecte pas.
          if (e instanceof Error && e.message.includes("401")) deny();
          else if (!cancelled) setOk(true);
        });
    }

    check();
    // bouton "retour" apres logout (page restauree du cache)
    const onShow = (e: PageTransitionEvent) => e.persisted && check();
    window.addEventListener("pageshow", onShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onShow);
    };
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}