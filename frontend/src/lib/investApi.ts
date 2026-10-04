import { request } from "@/lib/api";

export type Instrument = {
  symbol: string; name: string; category: string; risk: number; description: string;
  price: number; changePct: number; history: number[];
};
export type Holding = {
  symbol: string; name: string; category: string; units: number; avgPrice: number; price: number;
  value: number; cost: number; pnl: number; pnlPct: number; history: number[];
};
export type Portfolio = {
  cash: number; invested: number; cost: number; pnl: number; pnlPct: number; total: number;
  holdings: Holding[]; allocation: { category: string; value: number }[];
};
export type Order = {
  id: number; side: "BUY" | "SELL"; symbol: string; name: string; units: number; price: number;
  amount: number; fee: number; pnl: number | null; createdAt: string;
};
export type Model = {
  id: string; name: string; tagline: string; risk: number; expectedReturn: number; minAmount: number;
  parts: { symbol: string; name: string; pct: number }[];
};

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const inv = {
  market: () => request<Instrument[]>("/api/invest/market"),
  models: () => request<Model[]>("/api/invest/models"),
  portfolio: () => request<Portfolio>("/api/invest/portfolio"),
  orders: () => request<Order[]>("/api/invest/orders"),
  buy: (symbol: string, amount: number) => request<Order>("/api/invest/buy", post({ symbol, amount })),
  sell: (symbol: string, amount: number | null, all: boolean) =>
    request<Order>("/api/invest/sell", post({ symbol, amount, all })),
  apply: (model: string, amount: number) => request<Order[]>("/api/invest/models/apply", post({ model, amount })),
};