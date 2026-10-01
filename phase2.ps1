$ErrorActionPreference = "Stop"

# Racine du projet = dossier ou se trouve ce script
$root = $PSScriptRoot
if (-not (Test-Path (Join-Path $root "backend")) -or -not (Test-Path (Join-Path $root "frontend"))) {
  Write-Host "Mets phase2.ps1 dans le dossier Arthix-Bank (a cote de backend et frontend)" -ForegroundColor Red
  exit 1
}

function W($p, $c) {
  $full = Join-Path $root $p
  New-Item -ItemType Directory -Force -Path (Split-Path $full) | Out-Null
  [System.IO.File]::WriteAllText($full, $c, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "  ok  $p" -ForegroundColor DarkGray
}
function Rep($p, $old, $new) {
  $full = Join-Path $root $p
  if (-not (Test-Path $full)) { Write-Host "NOT FOUND (file) $p" -ForegroundColor Red; return }
  $t = [System.IO.File]::ReadAllText($full)
  if (-not $t.Contains($old)) { Write-Host "NOT FOUND in $p" -ForegroundColor Yellow; return }
  [System.IO.File]::WriteAllText($full, $t.Replace($old, $new), (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "  ok  $p (patched)" -ForegroundColor DarkGray
}
function AppendBeforeBrace($p, $code) {
  $full = Join-Path $root $p
  $t = [System.IO.File]::ReadAllText($full)
  $i = $t.LastIndexOf('}')
  [System.IO.File]::WriteAllText($full, $t.Substring(0, $i) + $code + "}`n", (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "  ok  $p (appended)" -ForegroundColor DarkGray
}

$b = "backend\src\main\java\com\arthix\backend"

Write-Host "== BACKEND ==" -ForegroundColor Cyan

# --- Transaction entity (nouveaux champs, tous nullable pour les anciennes lignes)
W "$b\entity\Transaction.java" @'
package com.arthix.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private String reference;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceAfter;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(length = 20)
    private String type;

    @Column(length = 120)
    private String counterpartyName;

    @Column(length = 20)
    private String counterpartyAccount;

    @Column(length = 100)
    private String note;

    @Column(length = 24)
    private String transferRef;

    protected Transaction() {}

    public Transaction(User user, String category, String label, String reference,
                       BigDecimal amount, BigDecimal balanceAfter) {
        this.user = user;
        this.category = category;
        this.label = label;
        this.reference = reference;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.type = "PAYMENT";
    }

    public static Transaction transfer(User owner, boolean outgoing, User other, BigDecimal amount,
                                       BigDecimal balanceAfter, String note, String ref) {
        String clean = (note == null || note.isBlank()) ? null : note.trim();
        Transaction t = new Transaction(
            owner,
            "TRANSFER",
            (outgoing ? "Transfer to " : "Transfer from ") + other.getFullName(),
            clean != null ? clean : "Virement",
            amount,
            balanceAfter);
        t.type = outgoing ? "TRANSFER_OUT" : "TRANSFER_IN";
        t.counterpartyName = other.getFullName();
        t.counterpartyAccount = other.getAccountNumber();
        t.note = clean;
        t.transferRef = ref;
        return t;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getCategory() { return category; }
    public String getLabel() { return label; }
    public String getReference() { return reference; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public Instant getCreatedAt() { return createdAt; }
    public String getType() { return type; }
    public String getCounterpartyName() { return counterpartyName; }
    public String getCounterpartyAccount() { return counterpartyAccount; }
    public String getNote() { return note; }
    public String getTransferRef() { return transferRef; }
}
'@

# --- UserRepository : on AJOUTE 3 methodes (sans toucher a l'existant)
$repo = "$b\repository\UserRepository.java"
if (Test-Path (Join-Path $root $repo)) {
  $rt = [System.IO.File]::ReadAllText((Join-Path $root $repo))
  if ($rt -notmatch 'findWithLockByAccountNumber') {
    AppendBeforeBrace $repo @'

    java.util.Optional<User> findByAccountNumber(String accountNumber);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<User> findWithLockByAccountNumber(String accountNumber);

    @org.springframework.data.jpa.repository.Query("select u.accountNumber from User u where u.email = :email")
    java.util.Optional<String> findAccountNumberByEmail(@org.springframework.data.repository.query.Param("email") String email);
'@
  } else { Write-Host "  skip UserRepository (deja fait)" -ForegroundColor DarkGray }
} else { Write-Host "NOT FOUND $repo" -ForegroundColor Red }

W "$b\dto\BankDtos.java" @'
package com.arthix.backend.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;

public class BankDtos {

    public record PaymentRequest(
        @NotBlank String provider,
        @NotBlank @Size(max = 50) String reference,
        @NotNull @DecimalMin(value = "0.01", message = "Amount must be positive")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount
    ) {}

    public record TransferRequest(
        @NotBlank @Size(max = 30) String toAccount,
        @NotNull @DecimalMin(value = "0.01", message = "Amount must be positive")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount,
        @Size(max = 100, message = "Note is too long (100 characters max)") String note
    ) {}

    public record RecipientDto(String fullName, String accountNumber) {}

    public record TransactionDto(Long id, String type, String category, String label, String reference,
                                 BigDecimal amount, BigDecimal balanceAfter, Instant createdAt,
                                 String receiptNo,
                                 String senderName, String senderAccount,
                                 String beneficiaryName, String beneficiaryAccount,
                                 String note) {}

    public record ProviderDto(String id, String name, String category) {}

    public record OfferDto(String title, String description) {}
}
'@

W "$b\service\BankService.java" @'
package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.entity.Transaction;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.TransactionRepository;
import com.arthix.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class BankService {

    private static final BigDecimal MAX_TRANSFER = new BigDecimal("50000.00");

    private static final List<ProviderDto> PROVIDERS = List.of(
        new ProviderDto("srm", "SRM (Eau & Electricite)", "BILLS"),
        new ProviderDto("telecom", "Telecom / Internet", "BILLS"),
        new ProviderDto("school-private", "Ecole privee", "SCHOOLS"),
        new ProviderDto("university", "Universite", "SCHOOLS")
    );

    private static final List<OfferDto> OFFERS = List.of(
        new OfferDto("Carte Arthix Classic", "Carte bancaire gratuite la premiere annee."),
        new OfferDto("Credit etudiant", "Financez vos etudes avec un taux preferentiel."),
        new OfferDto("Epargne Arthix+", "Un compte d'epargne avec un taux avantageux."),
        new OfferDto("Paiement facilite", "Payez vos factures en un clic, sans frais.")
    );

    private final UserRepository users;
    private final TransactionRepository txs;

    public BankService(UserRepository users, TransactionRepository txs) {
        this.users = users;
        this.txs = txs;
    }

    public List<ProviderDto> providers() { return PROVIDERS; }

    public List<OfferDto> offers() { return OFFERS; }

    @Transactional(readOnly = true)
    public List<TransactionDto> transactions(String email) {
        User u = users.findByEmail(email).orElseThrow();
        return txs.findTop50ByUserOrderByCreatedAtDesc(u).stream().map(this::toDto).toList();
    }

    @Transactional
    public TransactionDto pay(String email, PaymentRequest req) {
        ProviderDto p = PROVIDERS.stream()
            .filter(x -> x.id().equals(req.provider()))
            .findFirst()
            .orElseThrow(() -> bad("Unknown provider"));

        User u = users.findByEmailForUpdate(email).orElseThrow();

        if (u.getBalance().compareTo(req.amount()) < 0) {
            throw bad("Insufficient balance");
        }

        u.setBalance(u.getBalance().subtract(req.amount()));
        Transaction t = txs.save(new Transaction(
            u, p.category(), p.name(), req.reference().trim(), req.amount(), u.getBalance()));
        return toDto(t);
    }

    @Transactional(readOnly = true)
    public RecipientDto lookup(String email, String account) {
        String acc = normalize(account);
        String mine = users.findAccountNumberByEmail(email).orElse(null);
        if (acc.equals(mine)) throw bad("This is your own account");
        User u = users.findByAccountNumber(acc).orElseThrow(BankService::noAccount);
        return new RecipientDto(mask(u.getFullName()), u.getAccountNumber());
    }

    @Transactional
    public TransactionDto transfer(String email, TransferRequest req) {
        String sa = users.findAccountNumberByEmail(email)
            .orElseThrow(() -> bad("Your account has no number yet"));
        String ra = normalize(req.toAccount());
        BigDecimal amount = req.amount();

        if (sa.equals(ra)) throw bad("You cannot transfer to your own account");
        if (amount.compareTo(MAX_TRANSFER) > 0) throw bad("Maximum per transfer is 50 000 MAD");

        // lock dans un ordre fixe pour eviter les deadlocks
        User sender;
        User recipient;
        if (sa.compareTo(ra) < 0) {
            sender = users.findWithLockByAccountNumber(sa).orElseThrow();
            recipient = users.findWithLockByAccountNumber(ra).orElseThrow(BankService::noAccount);
        } else {
            recipient = users.findWithLockByAccountNumber(ra).orElseThrow(BankService::noAccount);
            sender = users.findWithLockByAccountNumber(sa).orElseThrow();
        }

        if (sender.getBalance().compareTo(amount) < 0) throw bad("Insufficient balance");

        sender.setBalance(sender.getBalance().subtract(amount));
        recipient.setBalance(recipient.getBalance().add(amount));

        String ref = "TRF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        Transaction out = txs.save(Transaction.transfer(
            sender, true, recipient, amount, sender.getBalance(), req.note(), ref));
        txs.save(Transaction.transfer(
            recipient, false, sender, amount, recipient.getBalance(), req.note(), ref));
        return toDto(out);
    }

    private TransactionDto toDto(Transaction t) {
        User u = t.getUser();
        String type = t.getType() == null ? "PAYMENT" : t.getType();
        String sName;
        String sAcc;
        String bName;
        String bAcc;
        switch (type) {
            case "TRANSFER_OUT" -> {
                sName = u.getFullName(); sAcc = u.getAccountNumber();
                bName = t.getCounterpartyName(); bAcc = t.getCounterpartyAccount();
            }
            case "TRANSFER_IN" -> {
                sName = t.getCounterpartyName(); sAcc = t.getCounterpartyAccount();
                bName = u.getFullName(); bAcc = u.getAccountNumber();
            }
            default -> {
                sName = u.getFullName(); sAcc = u.getAccountNumber();
                bName = t.getLabel(); bAcc = null;
            }
        }
        String receipt = t.getTransferRef() != null ? t.getTransferRef() : String.format("ARX-%08d", t.getId());
        return new TransactionDto(t.getId(), type, t.getCategory(), t.getLabel(), t.getReference(),
            t.getAmount(), t.getBalanceAfter(), t.getCreatedAt(), receipt,
            sName, sAcc, bName, bAcc, t.getNote());
    }

    private static String normalize(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "").toUpperCase();
    }

    private static String mask(String full) {
        String[] p = full.trim().split("\\s+");
        if (p.length == 1) return p[0];
        return p[0] + " " + p[p.length - 1].charAt(0) + ".";
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }

    private static ResponseStatusException noAccount() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Beneficiary account not found");
    }
}
'@

W "$b\controller\BankController.java" @'
package com.arthix.backend.controller;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.service.BankService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class BankController {

    private final BankService bank;

    public BankController(BankService bank) {
        this.bank = bank;
    }

    @GetMapping("/providers")
    public List<ProviderDto> providers() {
        return bank.providers();
    }

    @GetMapping("/offers")
    public List<OfferDto> offers() {
        return bank.offers();
    }

    @GetMapping("/transactions")
    public List<TransactionDto> transactions(Authentication auth) {
        return bank.transactions(auth.getName());
    }

    @PostMapping("/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionDto pay(Authentication auth, @Valid @RequestBody PaymentRequest req) {
        return bank.pay(auth.getName(), req);
    }

    @GetMapping("/accounts/lookup")
    public RecipientDto lookup(Authentication auth, @RequestParam String account) {
        return bank.lookup(auth.getName(), account);
    }

    @PostMapping("/transfers")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionDto transfer(Authentication auth, @Valid @RequestBody TransferRequest req) {
        return bank.transfer(auth.getName(), req);
    }
}
'@

# --- Handler d'erreurs (pour que le frontend recoive un vrai "message")
$hasAdvice = Get-ChildItem -Path (Join-Path $root "backend\src") -Recurse -Filter *.java |
  Select-String -Pattern "RestControllerAdvice" -Quiet
if (-not $hasAdvice) {
  W "$b\config\ApiExceptionHandler.java" @'
package com.arthix.backend.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> status(ResponseStatusException e) {
        String msg = e.getReason() == null ? "Request failed" : e.getReason();
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", msg));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
            .findFirst().map(f -> f.getDefaultMessage()).orElse("Invalid request");
        return ResponseEntity.badRequest().body(Map.of("message", msg));
    }
}
'@
} else { Write-Host "  skip ApiExceptionHandler (un handler existe deja)" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "== FRONTEND ==" -ForegroundColor Cyan

W "frontend\src\lib\api.ts" @'
const API = process.env.NEXT_PUBLIC_API_URL;

export type AuthResponse = { token: string; fullName: string; email: string };
export type Me = { fullName: string; email: string; balance: number; accountNumber: string | null };
export type TxType = "PAYMENT" | "TRANSFER_OUT" | "TRANSFER_IN";
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
  lookup: (account: string) =>
    request<Recipient>(`/api/accounts/lookup?account=${encodeURIComponent(account)}`),
  transfer: (body: { toAccount: string; amount: number; note: string }) =>
    request<Transaction>("/api/transfers", { method: "POST", body: JSON.stringify(body) }),
};
'@

W "frontend\src\components\Receipt.tsx" @'
"use client";

import { useEffect } from "react";
import type { Transaction } from "@/lib/api";
import { dateTime, money } from "@/lib/format";

export default function Receipt({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const incoming = tx.type === "TRANSFER_IN";
  const isTransfer = tx.type !== "PAYMENT";
  const title = incoming ? "Transfer received" : isTransfer ? "Transfer sent" : "Payment confirmed";

  const rows: { k: string; v: string; sub?: string }[] = [
    { k: "Receipt no.", v: tx.receiptNo },
    { k: "Date", v: dateTime(tx.createdAt) },
    { k: "Type", v: isTransfer ? "Account transfer" : "Bill / school payment" },
    { k: "From", v: tx.senderName, sub: tx.senderAccount ?? undefined },
    { k: "To", v: tx.beneficiaryName, sub: tx.beneficiaryAccount ?? undefined },
    { k: isTransfer ? "Note" : "Reference", v: isTransfer ? tx.note ?? "-" : tx.reference },
    { k: "Balance after", v: money(tx.balanceAfter) },
  ];

  return (
    <div
      className="overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        id="receipt"
        className="pop card w-full max-w-md p-7"
        style={{ background: "#0b0b14" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle className="check-circle" cx="26" cy="26" r="24" stroke="var(--ok)" strokeWidth="1.5" />
            <path className="check-mark" d="M16 27l7 7 14-15" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="label mt-4">{title}</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">
            {incoming ? "+" : ""}{money(tx.amount)}
          </p>
        </div>

        <dl className="mt-7 divide-y divide-[var(--line)] text-sm">
          {rows.map((r) => (
            <div key={r.k} className="flex items-start justify-between gap-6 py-3">
              <dt className="muted text-[var(--muted)]">{r.k}</dt>
              <dd className="text-right font-medium">
                {r.v}
                {r.sub && <span className="muted block text-xs font-normal tracking-wide text-[var(--muted)]">{r.sub}</span>}
              </dd>
            </div>
          ))}
        </dl>

        <p className="muted mt-5 text-center text-xs text-[var(--muted)]">
          Arthix Banque &middot; demo transaction, no real funds moved
        </p>

        <div className="no-print mt-6 flex gap-3">
          <button onClick={() => window.print()} className="btn btn-primary flex-1">
            Print / Save as PDF
          </button>
          <button onClick={onClose} className="btn btn-ghost">Close</button>
        </div>
      </div>
    </div>
  );
}
'@

W "frontend\src\components\TransactionList.tsx" @'
import type { Transaction } from "@/lib/api";
import { dateTime, delay, money } from "@/lib/format";

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
        const incoming = t.type === "TRANSFER_IN";
        return (
          <li key={t.id} className="rise" style={delay(Math.min(i, 8))}>
            <button
              onClick={() => onSelect?.(t)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--surface-hover)]"
            >
              <div className="min-w-0">
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
'@

W "frontend\src\app\transfers\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Receipt from "@/components/Receipt";
import { api, Me, Recipient, Transaction } from "@/lib/api";
import { delay, money } from "@/lib/format";

const ACCOUNT_RE = /^ARX\d{13}$/;

export default function TransfersPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ account: "", amount: "", note: "" });
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);
  const [step, setStep] = useState<"form" | "review">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  const account = form.account.replace(/\s+/g, "").toUpperCase();
  const amount = Number(form.amount);
  const tooMuch = !!me && amount > me.balance;
  const canReview = !!recipient && amount > 0 && !tooMuch;

  useEffect(() => {
    setRecipient(null);
    setLookupError("");
    if (!ACCOUNT_RE.test(account)) return;
    let cancelled = false;
    setLooking(true);
    api
      .lookup(account)
      .then((r) => !cancelled && setRecipient(r))
      .catch((e) => !cancelled && setLookupError(e instanceof Error ? e.message : "Error"))
      .finally(() => !cancelled && setLooking(false));
    return () => {
      cancelled = true;
    };
  }, [account]);

  async function confirm() {
    setError("");
    setLoading(true);
    try {
      const t = await api.transfer({ toAccount: account, amount, note: form.note.trim() });
      setReceipt(t);
      setMe((m) => (m ? { ...m, balance: t.balanceAfter } : m));
      setForm({ account: "", amount: "", note: "" });
      setStep("form");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Transfers</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Send money</h1>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        {step === "form" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canReview) setStep("review");
            }}
            className="rise card space-y-5 p-6 md:col-span-3"
            style={delay(1)}
          >
            <div>
              <label className="label">Beneficiary account</label>
              <input
                className="input mt-2 tracking-wide"
                placeholder="ARX0000000000000"
                maxLength={20}
                required
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
              />
              <div className="mt-2 min-h-5 text-xs">
                {looking && <span className="text-[var(--muted)]">Checking account...</span>}
                {recipient && (
                  <span className="text-[var(--ok)]">Account holder: {recipient.fullName}</span>
                )}
                {lookupError && <span className="text-[var(--err)]">{lookupError}</span>}
              </div>
            </div>

            <div>
              <label className="label">Amount (MAD)</label>
              <input
                className="input mt-2"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              {tooMuch && <p className="mt-2 text-xs text-[var(--err)]">Amount is higher than your balance.</p>}
            </div>

            <div>
              <label className="label">Note (optional)</label>
              <input
                className="input mt-2"
                placeholder="Rent, dinner..."
                maxLength={100}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            {error && <p className="text-sm text-[var(--err)]">{error}</p>}

            <button disabled={!canReview} className="btn btn-primary w-full">
              Review transfer
            </button>
          </form>
        ) : (
          <div className="pop card space-y-5 p-6 md:col-span-3">
            <p className="label">Review</p>
            <p className="text-4xl font-semibold tracking-tight">{money(amount)}</p>
            <dl className="divide-y divide-[var(--line)] text-sm">
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-[var(--muted)]">From</dt>
                <dd className="text-right font-medium">
                  {me?.fullName}
                  <span className="block text-xs font-normal tracking-wide text-[var(--muted)]">{me?.accountNumber}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-[var(--muted)]">To</dt>
                <dd className="text-right font-medium">
                  {recipient?.fullName}
                  <span className="block text-xs font-normal tracking-wide text-[var(--muted)]">{account}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-[var(--muted)]">Note</dt>
                <dd className="font-medium">{form.note.trim() || "-"}</dd>
              </div>
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-[var(--muted)]">Fees</dt>
                <dd className="font-medium">0,00 MAD</dd>
              </div>
            </dl>
            {error && <p className="text-sm text-[var(--err)]">{error}</p>}
            <div className="flex gap-3">
              <button onClick={confirm} disabled={loading} className="btn btn-primary flex-1">
                {loading ? "Sending..." : "Confirm and send"}
              </button>
              <button onClick={() => setStep("form")} disabled={loading} className="btn btn-ghost">
                Back
              </button>
            </div>
          </div>
        )}

        <aside className="rise card h-fit space-y-5 p-6 md:col-span-2" style={delay(2)}>
          <div>
            <p className="label">Sending from</p>
            <p className="mt-1 text-sm font-medium tracking-wide">{me?.accountNumber ?? "-"}</p>
          </div>
          <div>
            <p className="label">Available</p>
            <p className="mt-1 text-xl font-semibold">{me ? money(me.balance) : "-"}</p>
          </div>
          <p className="border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
            Transfers between Arthix accounts are instant and free. Limit: 50 000 MAD per transfer.
          </p>
        </aside>
      </div>

      {receipt && <Receipt tx={receipt} onClose={() => setReceipt(null)} />}
    </AppShell>
  );
}
'@

W "frontend\src\app\transactions\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Receipt from "@/components/Receipt";
import TransactionList from "@/components/TransactionList";
import { api, Transaction } from "@/lib/api";

const filters = [
  { id: "ALL", label: "All" },
  { id: "TRANSFER", label: "Transfers" },
  { id: "BILLS", label: "Bills" },
  { id: "SCHOOLS", label: "Schools" },
];

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [open, setOpen] = useState<Transaction | null>(null);

  useEffect(() => {
    api.transactions().then(setTxs).catch(() => {});
  }, []);

  const items = filter === "ALL" ? txs : txs.filter((t) => t.category === filter);

  return (
    <AppShell>
      <div className="rise">
        <p className="label">History</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Transactions</h1>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-4 py-1.5 text-xs transition ${
              filter === f.id
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                : "border-[var(--line)] text-[var(--muted)] hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <TransactionList items={items} onSelect={setOpen} />
      </div>
      {open && <Receipt tx={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}
'@

W "frontend\src\app\dashboard\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import CountUp from "@/components/CountUp";
import Receipt from "@/components/Receipt";
import TransactionList from "@/components/TransactionList";
import { api, Me, Transaction } from "@/lib/api";
import { delay, money } from "@/lib/format";

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [open, setOpen] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.transactions().then(setTxs).catch(() => {});
  }, []);

  const spent = txs.filter((t) => t.type !== "TRANSFER_IN").reduce((s, t) => s + t.amount, 0);
  const received = txs.filter((t) => t.type === "TRANSFER_IN").reduce((s, t) => s + t.amount, 0);

  function copy() {
    if (!me?.accountNumber) return;
    navigator.clipboard.writeText(me.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="rise">
          <p className="label">Welcome back</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{me?.fullName ?? " "}</h1>
        </div>

        <section className="rise card p-7" style={delay(1)}>
          <p className="label">Available balance</p>
          <p className="mt-3 text-5xl font-semibold tracking-tight">
            {me ? <CountUp value={me.balance} /> : "0,00"}
            <span className="ml-2 text-lg font-normal text-[var(--muted)]">MAD</span>
          </p>
          <div className="mt-6 flex items-center justify-between border-t border-[var(--line)] pt-4 text-sm">
            <div>
              <p className="label">Account number</p>
              <p className="mt-1 font-medium tracking-wide">{me?.accountNumber ?? "-"}</p>
            </div>
            <button onClick={copy} className="btn btn-ghost !py-1.5 text-xs">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rise card p-5" style={delay(2)}>
            <p className="label">Transactions</p>
            <p className="mt-2 text-2xl font-semibold">{txs.length}</p>
          </div>
          <div className="rise card p-5" style={delay(3)}>
            <p className="label">Spent</p>
            <p className="mt-2 text-2xl font-semibold">{money(spent)}</p>
          </div>
          <div className="rise card p-5" style={delay(4)}>
            <p className="label">Received</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--ok)]">{money(received)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/transfers" className="rise card card-hover p-5" style={delay(5)}>
            <p className="label">Quick action</p>
            <p className="mt-2 text-base font-medium">Send money to an account</p>
          </Link>
          <Link href="/payments" className="rise card card-hover p-5" style={delay(6)}>
            <p className="label">Quick action</p>
            <p className="mt-2 text-base font-medium">Pay a bill or school fee</p>
          </Link>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent activity</h2>
            <Link href="/transactions" className="text-xs text-[var(--muted)] hover:text-white">
              View all
            </Link>
          </div>
          <TransactionList items={txs.slice(0, 5)} onSelect={setOpen} />
        </section>
      </div>
      {open && <Receipt tx={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}
'@

# --- lien "Transfers" dans la navbar
$shell = Join-Path $root "frontend\src\components\AppShell.tsx"
if ((Test-Path $shell) -and -not ([System.IO.File]::ReadAllText($shell)).Contains('/transfers')) {
  Rep "frontend\src\components\AppShell.tsx" '{ href: "/payments", label: "Payments" },' "{ href: `"/transfers`", label: `"Transfers`" },`n  { href: `"/payments`", label: `"Payments`" },"
}

Write-Host ""
Write-Host "Done" -ForegroundColor Green
