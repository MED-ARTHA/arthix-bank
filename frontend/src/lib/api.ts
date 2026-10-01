const API = process.env.NEXT_PUBLIC_API_URL;

export type AuthResponse = { token: string; fullName: string; email: string };
export type Me = { fullName: string; email: string; balance: number; accountNumber: string | null };
export type TxType = "PAYMENT" | "TRANSFER_OUT" | "TRANSFER_IN" | "DEPOSIT" | "SAVINGS_OUT" | "SAVINGS_IN";
export type Transaction = {
  id: number;
  type: TxType;
  category: string;
  label: string;
  reference: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  receiptNo: string;
  senderName: string;
  senderAccount: string | null;
  beneficiaryName: string;
  beneficiaryAccount: string | null;
  note: string | null;
};
export type Provider = { id: string; name: string; category: string };
export type Offer = { title: string; description: string };
export type Recipient = { fullName: string; accountNumber: string };
export type Voucher = {
  code: string;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
};
export type Goal = {
  id: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
  createdAt: string;
};
export type Profile = {
  fullName: string;
  email: string;
  phone: string | null;
  accountNumber: string | null;
  createdAt: string;
};

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
    throw new Error(message || `Request failed (${res.status})`);
  }

  if (typeof window !== "undefined" && options.method && options.method !== "GET") {
    window.dispatchEvent(new Event("balance-changed"));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const post = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  signup: (body: { fullName: string; email: string; password: string }) =>
    post<AuthResponse>("/api/auth/signup", body),
  login: (body: { email: string; password: string }) => post<AuthResponse>("/api/auth/login", body),
  me: () => request<Me>("/api/me"),
  providers: () => request<Provider[]>("/api/providers"),
  offers: () => request<Offer[]>("/api/offers"),
  transactions: () => request<Transaction[]>("/api/transactions"),
  pay: (body: { provider: string; reference: string; amount: number }) =>
    post<Transaction>("/api/payments", body),
  lookup: (account: string) =>
    request<Recipient>(`/api/accounts/lookup?account=${encodeURIComponent(account)}`),
  transfer: (body: { toAccount: string; amount: number; note: string }) =>
    post<Transaction>("/api/transfers", body),

  depositCard: (body: { cardNumber: string; expiry: string; cvc: string; holder: string; amount: number }) =>
    post<Transaction>("/api/deposits/card", body),
  vouchers: () => request<Voucher[]>("/api/deposits/vouchers"),
  createVoucher: (amount: number) => post<Voucher>("/api/deposits/vouchers", { amount }),
  redeemVoucher: (code: string) =>
    post<Transaction>(`/api/deposits/vouchers/${encodeURIComponent(code)}/redeem`),

  goals: () => request<Goal[]>("/api/goals"),
  createGoal: (body: { name: string; targetAmount: number; deadline: string | null }) =>
    post<Goal>("/api/goals", body),
  goalDeposit: (id: number, amount: number) => post<Goal>(`/api/goals/${id}/deposit`, { amount }),
  goalWithdraw: (id: number, amount: number) => post<Goal>(`/api/goals/${id}/withdraw`, { amount }),
  deleteGoal: (id: number) => request<void>(`/api/goals/${id}`, { method: "DELETE" }),

  profile: () => request<Profile>("/api/profile"),
  updateProfile: (body: { fullName: string; phone: string }) =>
    request<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    post<void>("/api/profile/password", body),
};