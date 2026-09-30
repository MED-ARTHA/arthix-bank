"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { api, Offer } from "@/lib/api";

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    api.offers().then(setOffers).catch(() => {});
  }, []);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Bank offers</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {offers.map((o) => (
          <div key={o.title} className="rounded-2xl bg-white p-5 shadow">
            <h3 className="font-semibold">{o.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{o.description}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}