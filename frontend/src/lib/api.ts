const API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8081";

// ---------- types (mirror the backend DTOs) ----------

export type Me = {
  fullName: string;
  email: string;
  balance: number;
  accountNumber: string | null;
  avatarUrl?: string | null;
};

export type Profile = {
  fullName: string;
  email: string;
  phone: string | null;
  accountNumber: string | null;
  createdAt: string;
};

export type Transaction = {
  id: number;
  type: string;
  category: string;
  label: string;
  reference: string | null;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  receiptNo: string;
  senderName: string | null;
  senderAccount: string | null;
  beneficiaryName: string | null;
  beneficiaryAccount: string | null;
  note: string | null;
};

export type Provider = { id: string; name: string; category: string };
export type Offer = { title: string; description: string };
export type Recipient = { fullName: string; accountNumber: string };

export type Goal = {
  id: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
  createdAt: string;
};

export type Voucher = {
  code: string;
  amount: number;
  status: string;
  createdAt: string;
  expiresAt: string;
};

export type Scheduled = {
  id: number;
  toAccount: string;
  amount: number;
  note: string | null;
  frequency: "ONCE" | "WEEKLY" | "MONTHLY";
  nextRun: string;
  status: "ACTIVE" | "DONE" | "FAILED";
  lastError: string | null;
};

export type AuthResponse = { token: string; fullName?: string; email?: string };

// ---------- request helper ----------

function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem("token");
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API}${path}`, { ...options, headers });

  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/")) {
    localStorage.removeItem("token");
    window.location.replace("/login");
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.message === "string" && data.message) message = data.message;
      else if (Array.isArray(data?.errors) && data.errors[0]?.defaultMessage) message = data.errors[0].defaultMessage;
      else if (typeof data?.error === "string") message = data.error;
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

// ---------- API ----------

export const api = {
  // auth
  login: (d: { email: string; password: string }) => request<AuthResponse>("/api/auth/login", json("POST", d)),
  signup: (d: { fullName: string; email: string; password: string }) =>
    request<{ email: string; expiresInMinutes: number }>("/api/auth/signup", json("POST", d)),
  resendCode: (email: string) =>
    request<{ email: string; expiresInMinutes: number }>("/api/auth/resend", json("POST", { email })),
  verifyEmail: (d: { fullName: string; email: string; password: string; code: string }) =>
    request<AuthResponse>("/api/auth/verify", json("POST", d)),

  // account
  me: () => request<Me>("/api/me"),
  profile: () => request<Profile>("/api/profile"),
  updateProfile: (d: { fullName: string; phone: string }) => request<Profile>("/api/profile", json("PUT", d)),
  changePassword: (d: { currentPassword: string; newPassword: string }) =>
    request<void>("/api/profile/password", json("POST", d)),

  // bank
  providers: () => request<Provider[]>("/api/providers"),
  offers: () => request<Offer[]>("/api/offers"),
  transactions: () => request<Transaction[]>("/api/transactions"),
  pay: (d: { provider: string; reference: string; amount: number }) =>
    request<Transaction>("/api/payments", json("POST", d)),
  lookup: (account: string) =>
    request<Recipient>(`/api/accounts/lookup?account=${encodeURIComponent(account)}`),
  transfer: (d: { toAccount: string; amount: number; note?: string }) =>
    request<Transaction>("/api/transfers", json("POST", d)),

  // deposits
  depositCard: (d: { cardNumber: string; expiry: string; cvc: string; holder: string; amount: number }) =>
    request<Transaction>("/api/deposits/card", json("POST", d)),
  vouchers: () => request<Voucher[]>("/api/deposits/vouchers"),
  createVoucher: (d: { amount: number }) => request<Voucher>("/api/deposits/vouchers", json("POST", d)),
  redeemVoucher: (code: string) =>
    request<Transaction>(`/api/deposits/vouchers/${encodeURIComponent(code)}/redeem`, json("POST")),

  // goals
  goals: () => request<Goal[]>("/api/goals"),
  createGoal: (d: { name: string; targetAmount: number; deadline?: string | null }) =>
    request<Goal>("/api/goals", json("POST", d)),
  goalDeposit: (id: number, amount: number) => request<Goal>(`/api/goals/${id}/deposit`, json("POST", { amount })),
  goalWithdraw: (id: number, amount: number) => request<Goal>(`/api/goals/${id}/withdraw`, json("POST", { amount })),
  deleteGoal: (id: number) => request<void>(`/api/goals/${id}`, json("DELETE")),

  // scheduled transfers
  scheduled: () => request<Scheduled[]>("/api/scheduled"),
  createScheduled: (d: { toAccount: string; amount: number; note?: string; frequency: string; firstRun: string }) =>
    request<Scheduled>("/api/scheduled", json("POST", d)),
  cancelScheduled: (id: number) => request<void>(`/api/scheduled/${id}`, json("DELETE")),
};