const API = process.env.NEXT_PUBLIC_API_URL;

export type AuthResponse = { token: string; fullName: string; email: string };
export type Me = { fullName: string; email: string; balance: number };
export type Transaction = {
  id: number;
  category: string;
  label: string;
  reference: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};
export type Provider = { id: string; name: string; category: string };
export type Offer = { title: string; description: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && token) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

    if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = data.message || data.error || text;
    } catch {}
    throw new Error(`${res.status}: ${message || "empty response"}`);
  }
  return res.json();
}

export const api = {
  signup: (body: { fullName: string; email: string; password: string }) =>
    request<AuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<Me>("/api/me"),
  providers: () => request<Provider[]>("/api/providers"),
  offers: () => request<Offer[]>("/api/offers"),
  transactions: () => request<Transaction[]>("/api/transactions"),
  pay: (body: { provider: string; reference: string; amount: number }) =>
    request<Transaction>("/api/payments", { method: "POST", body: JSON.stringify(body) }),
};