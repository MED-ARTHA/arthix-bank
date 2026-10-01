$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
if (-not (Test-Path (Join-Path $root "backend")) -or -not (Test-Path (Join-Path $root "frontend"))) {
  Write-Host "Mets phase3.ps1 dans le dossier Arthix-Bank (a cote de backend et frontend)" -ForegroundColor Red
  exit 1
}

function W($p, $c) {
  $full = Join-Path $root $p
  New-Item -ItemType Directory -Force -Path (Split-Path $full) | Out-Null
  [System.IO.File]::WriteAllText($full, $c, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "  ok  $p" -ForegroundColor DarkGray
}
function AppendBeforeBrace($p, $code) {
  $full = Join-Path $root $p
  $t = [System.IO.File]::ReadAllText($full)
  $i = $t.LastIndexOf('}')
  [System.IO.File]::WriteAllText($full, $t.Substring(0, $i) + $code + "}`n", (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "  ok  $p (appended)" -ForegroundColor DarkGray
}
function FileText($p) {
  $full = Join-Path $root $p
  if (-not (Test-Path $full)) { return $null }
  return [System.IO.File]::ReadAllText($full)
}

$b = "backend\src\main\java\com\arthix\backend"

Write-Host "== CHECKS ==" -ForegroundColor Cyan
$ut = FileText "$b\entity\User.java"
if ($null -eq $ut) { Write-Host "User.java introuvable" -ForegroundColor Red; exit 1 }
if ($ut -notmatch 'getAccountNumber') {
  Write-Host "User.java n'a pas accountNumber : fais d'abord Step A / phase2" -ForegroundColor Red; exit 1
}
if (-not (Test-Path (Join-Path $root "frontend\public\logo-mark.png"))) {
  Write-Host "ATTENTION: frontend\public\logo-mark.png manque (le logo ne s'affichera pas)" -ForegroundColor Yellow
}

Write-Host "== BACKEND ==" -ForegroundColor Cyan

# --- User : champ phone
if ($ut -notmatch 'String phone') {
  AppendBeforeBrace "$b\entity\User.java" @'

    @Column(length = 20)
    private String phone;

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
'@
}

# --- UserRepository : methodes ajoutees (sans toucher a l'existant)
$rt = FileText "$b\repository\UserRepository.java"
if ($null -eq $rt) { Write-Host "UserRepository.java introuvable" -ForegroundColor Red; exit 1 }
if ($rt -notmatch 'findWithLockByAccountNumber') {
  AppendBeforeBrace "$b\repository\UserRepository.java" @'

    java.util.Optional<User> findByAccountNumber(String accountNumber);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<User> findWithLockByAccountNumber(String accountNumber);

    @org.springframework.data.jpa.repository.Query("select u.accountNumber from User u where u.email = :email")
    java.util.Optional<String> findAccountNumberByEmail(@org.springframework.data.repository.query.Param("email") String email);
'@
}

# --- TransactionRepository : methode ajoutee
$tr = FileText "$b\repository\TransactionRepository.java"
if ($null -eq $tr) { Write-Host "TransactionRepository.java introuvable" -ForegroundColor Red; exit 1 }
if ($tr -notmatch 'findByUserAndTypeAndCreatedAtAfter') {
  AppendBeforeBrace "$b\repository\TransactionRepository.java" @'

    java.util.List<com.arthix.backend.entity.Transaction> findByUserAndTypeAndCreatedAtAfter(
        com.arthix.backend.entity.User user, String type, java.time.Instant after);
'@
}

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

    public static Transaction simple(User owner, String type, String category, String label,
                                     String reference, String counterpartyName,
                                     BigDecimal amount, BigDecimal balanceAfter, String ref) {
        Transaction t = new Transaction(owner, category, label, reference, amount, balanceAfter);
        t.type = type;
        t.counterpartyName = counterpartyName;
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

W "$b\entity\Voucher.java" @'
package com.arthix.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "vouchers")
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 12)
    private String status = "PENDING";

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant paidAt;

    protected Voucher() {}

    public Voucher(User user, String code, BigDecimal amount, Instant expiresAt) {
        this.user = user;
        this.code = code;
        this.amount = amount;
        this.expiresAt = expiresAt;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getCode() { return code; }
    public BigDecimal getAmount() { return amount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
}
'@

W "$b\entity\SavingsGoal.java" @'
package com.arthix.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "savings_goals")
public class SavingsGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 40)
    private String name;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal targetAmount;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal savedAmount = BigDecimal.ZERO;

    private LocalDate deadline;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected SavingsGoal() {}

    public SavingsGoal(User user, String name, BigDecimal targetAmount, LocalDate deadline) {
        this.user = user;
        this.name = name;
        this.targetAmount = targetAmount;
        this.deadline = deadline;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getName() { return name; }
    public BigDecimal getTargetAmount() { return targetAmount; }
    public BigDecimal getSavedAmount() { return savedAmount; }
    public void setSavedAmount(BigDecimal savedAmount) { this.savedAmount = savedAmount; }
    public LocalDate getDeadline() { return deadline; }
    public Instant getCreatedAt() { return createdAt; }
}
'@

W "$b\repository\VoucherRepository.java" @'
package com.arthix.backend.repository;

import com.arthix.backend.entity.User;
import com.arthix.backend.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {
    List<Voucher> findTop20ByUserOrderByCreatedAtDesc(User user);
    Optional<Voucher> findByCodeAndUser(String code, User user);
}
'@

W "$b\repository\SavingsGoalRepository.java" @'
package com.arthix.backend.repository;

import com.arthix.backend.entity.SavingsGoal;
import com.arthix.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    List<SavingsGoal> findByUserOrderByCreatedAtDesc(User user);
    Optional<SavingsGoal> findByIdAndUser(Long id, User user);
}
'@

W "$b\dto\BankDtos.java" @'
package com.arthix.backend.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

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

    // ----- deposits
    public record DepositCardRequest(
        @NotBlank String cardNumber,
        @NotBlank String expiry,
        @NotBlank String cvc,
        @NotBlank @Size(max = 60) String holder,
        @NotNull @DecimalMin(value = "10.00", message = "Minimum deposit is 10 MAD")
        @DecimalMax(value = "20000.00", message = "Maximum per deposit is 20 000 MAD")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount
    ) {}

    public record VoucherRequest(
        @NotNull @DecimalMin(value = "50.00", message = "Minimum voucher is 50 MAD")
        @DecimalMax(value = "10000.00", message = "Maximum voucher is 10 000 MAD")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount
    ) {}

    public record VoucherDto(String code, BigDecimal amount, String status, Instant createdAt, Instant expiresAt) {}

    // ----- goals
    public record GoalRequest(
        @NotBlank @Size(max = 40, message = "Name is too long (40 characters max)") String name,
        @NotNull @DecimalMin(value = "1.00", message = "Target must be at least 1 MAD")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal targetAmount,
        LocalDate deadline
    ) {}

    public record GoalMoveRequest(
        @NotNull @DecimalMin(value = "0.01", message = "Amount must be positive")
        @Digits(integer = 10, fraction = 2, message = "Invalid amount") BigDecimal amount
    ) {}

    public record GoalDto(Long id, String name, BigDecimal targetAmount, BigDecimal savedAmount,
                          LocalDate deadline, Instant createdAt) {}

    // ----- profile
    public record ProfileDto(String fullName, String email, String phone, String accountNumber, Instant createdAt) {}

    public record ProfileUpdateRequest(
        @NotBlank @Size(max = 80, message = "Name is too long") String fullName,
        @Pattern(regexp = "^$|^\\+?[0-9 ]{8,15}$", message = "Invalid phone number") String phone
    ) {}

    public record PasswordChangeRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, message = "New password must be at least 8 characters") String newPassword
    ) {}
}
'@

W "$b\service\TxMapper.java" @'
package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.TransactionDto;
import com.arthix.backend.entity.Transaction;
import com.arthix.backend.entity.User;

public final class TxMapper {

    private TxMapper() {}

    public static TransactionDto toDto(Transaction t) {
        User u = t.getUser();
        String type = t.getType() == null ? "PAYMENT" : t.getType();
        String sName;
        String sAcc;
        String bName;
        String bAcc;
        switch (type) {
            case "TRANSFER_OUT", "SAVINGS_OUT" -> {
                sName = u.getFullName(); sAcc = u.getAccountNumber();
                bName = t.getCounterpartyName(); bAcc = t.getCounterpartyAccount();
            }
            case "TRANSFER_IN", "DEPOSIT", "SAVINGS_IN" -> {
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
        new OfferDto("Carte Arthix Classic", "Carte bancaire gratuite la premiere annee, avec controle total depuis l'application."),
        new OfferDto("Credit etudiant", "Financez vos etudes avec un taux preferentiel. Simulez votre mensualite en direct."),
        new OfferDto("Epargne Arthix+", "Un compte d'epargne avec un taux avantageux. Visualisez la croissance de votre capital."),
        new OfferDto("Paiement facilite", "Payez vos factures en un clic, sans frais, avec recu instantane."),
        new OfferDto("Change multi-devises", "Convertissez vos MAD en EUR, USD, GBP ou CHF au meilleur taux."),
        new OfferDto("Cashback factures", "Recevez 1% de cashback sur vos paiements de factures et frais de scolarite.")
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
        return txs.findTop50ByUserOrderByCreatedAtDesc(u).stream().map(TxMapper::toDto).toList();
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
        return TxMapper.toDto(t);
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
        return TxMapper.toDto(out);
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

W "$b\service\WalletService.java" @'
package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.entity.Transaction;
import com.arthix.backend.entity.User;
import com.arthix.backend.entity.Voucher;
import com.arthix.backend.repository.TransactionRepository;
import com.arthix.backend.repository.UserRepository;
import com.arthix.backend.repository.VoucherRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class WalletService {

    private static final BigDecimal DAILY_LIMIT = new BigDecimal("50000.00");
    private static final Pattern EXPIRY = Pattern.compile("^(0[1-9]|1[0-2])/(\\d{2})$");
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RNG = new SecureRandom();

    private final UserRepository users;
    private final TransactionRepository txs;
    private final VoucherRepository vouchers;

    public WalletService(UserRepository users, TransactionRepository txs, VoucherRepository vouchers) {
        this.users = users;
        this.txs = txs;
        this.vouchers = vouchers;
    }

    // ---------- card top-up (simulation: the card is validated, never stored)
    @Transactional
    public TransactionDto depositCard(String email, DepositCardRequest req) {
        String digits = req.cardNumber().replaceAll("\\D", "");
        if (digits.length() < 13 || digits.length() > 19 || !luhn(digits)) throw bad("Invalid card number");

        Matcher m = EXPIRY.matcher(req.expiry().trim());
        if (!m.matches()) throw bad("Expiry must be MM/YY");
        YearMonth exp = YearMonth.of(2000 + Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)));
        if (exp.isBefore(YearMonth.now())) throw bad("This card has expired");
        if (!req.cvc().trim().matches("\\d{3,4}")) throw bad("Invalid security code");

        User u = users.findByEmailForUpdate(email).orElseThrow();
        BigDecimal amount = req.amount();

        Instant since = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
        BigDecimal today = txs.findByUserAndTypeAndCreatedAtAfter(u, "DEPOSIT", since).stream()
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (today.add(amount).compareTo(DAILY_LIMIT) > 0) {
            throw bad("Daily deposit limit reached (50 000 MAD)");
        }

        u.setBalance(u.getBalance().add(amount));
        String last4 = digits.substring(digits.length() - 4);
        Transaction t = txs.save(Transaction.simple(
            u, "DEPOSIT", "DEPOSIT", "Card top-up", "Card **** " + last4,
            brand(digits) + " **** " + last4, amount, u.getBalance(), code("DEP-", 8)));
        return TxMapper.toDto(t);
    }

    // ---------- cash voucher (pay at an agency, simulated)
    @Transactional(readOnly = true)
    public List<VoucherDto> vouchers(String email) {
        User u = users.findByEmail(email).orElseThrow();
        return vouchers.findTop20ByUserOrderByCreatedAtDesc(u).stream().map(WalletService::toDto).toList();
    }

    @Transactional
    public VoucherDto createVoucher(String email, VoucherRequest req) {
        User u = users.findByEmail(email).orElseThrow();
        long active = vouchers.findTop20ByUserOrderByCreatedAtDesc(u).stream()
            .filter(v -> "PENDING".equals(effective(v))).count();
        if (active >= 5) throw bad("You already have 5 active vouchers");
        Voucher v = vouchers.save(new Voucher(
            u, code("VCH-", 8), req.amount(), Instant.now().plus(48, ChronoUnit.HOURS)));
        return toDto(v);
    }

    @Transactional
    public TransactionDto redeemVoucher(String email, String rawCode) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        Voucher v = vouchers.findByCodeAndUser(rawCode.trim().toUpperCase(), u)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found"));
        String st = effective(v);
        if ("EXPIRED".equals(st)) throw bad("This voucher has expired");
        if (!"PENDING".equals(st)) throw bad("This voucher was already used");

        v.setStatus("PAID");
        v.setPaidAt(Instant.now());
        u.setBalance(u.getBalance().add(v.getAmount()));
        Transaction t = txs.save(Transaction.simple(
            u, "DEPOSIT", "DEPOSIT", "Cash deposit", "Voucher " + v.getCode(),
            "Cash voucher " + v.getCode(), v.getAmount(), u.getBalance(), v.getCode()));
        return TxMapper.toDto(t);
    }

    private static VoucherDto toDto(Voucher v) {
        return new VoucherDto(v.getCode(), v.getAmount(), effective(v), v.getCreatedAt(), v.getExpiresAt());
    }

    private static String effective(Voucher v) {
        if ("PENDING".equals(v.getStatus()) && Instant.now().isAfter(v.getExpiresAt())) return "EXPIRED";
        return v.getStatus();
    }

    private static String code(String prefix, int len) {
        StringBuilder sb = new StringBuilder(prefix);
        for (int i = 0; i < len; i++) sb.append(ALPHABET.charAt(RNG.nextInt(ALPHABET.length())));
        return sb.toString();
    }

    private static boolean luhn(String d) {
        int sum = 0;
        boolean alt = false;
        for (int i = d.length() - 1; i >= 0; i--) {
            int n = d.charAt(i) - '0';
            if (alt) {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
            alt = !alt;
        }
        return sum % 10 == 0;
    }

    private static String brand(String d) {
        if (d.startsWith("4")) return "Visa";
        if (d.startsWith("5") || d.startsWith("2")) return "Mastercard";
        if (d.startsWith("34") || d.startsWith("37")) return "Amex";
        return "Card";
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
'@

W "$b\service\GoalService.java" @'
package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.entity.SavingsGoal;
import com.arthix.backend.entity.Transaction;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.SavingsGoalRepository;
import com.arthix.backend.repository.TransactionRepository;
import com.arthix.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class GoalService {

    private final UserRepository users;
    private final SavingsGoalRepository goals;
    private final TransactionRepository txs;

    public GoalService(UserRepository users, SavingsGoalRepository goals, TransactionRepository txs) {
        this.users = users;
        this.goals = goals;
        this.txs = txs;
    }

    @Transactional(readOnly = true)
    public List<GoalDto> list(String email) {
        User u = users.findByEmail(email).orElseThrow();
        return goals.findByUserOrderByCreatedAtDesc(u).stream().map(GoalService::toDto).toList();
    }

    @Transactional
    public GoalDto create(String email, GoalRequest req) {
        User u = users.findByEmail(email).orElseThrow();
        if (goals.findByUserOrderByCreatedAtDesc(u).size() >= 10) throw bad("You can have up to 10 goals");
        if (req.deadline() != null && !req.deadline().isAfter(LocalDate.now())) {
            throw bad("Deadline must be in the future");
        }
        SavingsGoal g = goals.save(new SavingsGoal(u, req.name().trim(), req.targetAmount(), req.deadline()));
        return toDto(g);
    }

    @Transactional
    public GoalDto deposit(String email, Long id, BigDecimal amount) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        SavingsGoal g = find(u, id);
        if (u.getBalance().compareTo(amount) < 0) throw bad("Insufficient balance");

        u.setBalance(u.getBalance().subtract(amount));
        g.setSavedAmount(g.getSavedAmount().add(amount));
        txs.save(Transaction.simple(u, "SAVINGS_OUT", "SAVINGS", "Saved to " + g.getName(),
            "Savings goal", "Goal: " + g.getName(), amount, u.getBalance(), ref()));
        return toDto(g);
    }

    @Transactional
    public GoalDto withdraw(String email, Long id, BigDecimal amount) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        SavingsGoal g = find(u, id);
        if (g.getSavedAmount().compareTo(amount) < 0) throw bad("Not enough saved in this goal");

        g.setSavedAmount(g.getSavedAmount().subtract(amount));
        u.setBalance(u.getBalance().add(amount));
        txs.save(Transaction.simple(u, "SAVINGS_IN", "SAVINGS", "Withdrawn from " + g.getName(),
            "Savings goal", "Goal: " + g.getName(), amount, u.getBalance(), ref()));
        return toDto(g);
    }

    @Transactional
    public void delete(String email, Long id) {
        User u = users.findByEmailForUpdate(email).orElseThrow();
        SavingsGoal g = find(u, id);
        BigDecimal saved = g.getSavedAmount();
        if (saved.signum() > 0) {
            u.setBalance(u.getBalance().add(saved));
            txs.save(Transaction.simple(u, "SAVINGS_IN", "SAVINGS", "Closed goal " + g.getName(),
                "Savings goal", "Goal: " + g.getName(), saved, u.getBalance(), ref()));
        }
        goals.delete(g);
    }

    private SavingsGoal find(User u, Long id) {
        return goals.findByIdAndUser(id, u)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
    }

    private static GoalDto toDto(SavingsGoal g) {
        return new GoalDto(g.getId(), g.getName(), g.getTargetAmount(), g.getSavedAmount(),
            g.getDeadline(), g.getCreatedAt());
    }

    private static String ref() {
        return "SAV-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
'@

W "$b\service\ProfileService.java" @'
package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.entity.User;
import com.arthix.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfileService {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public ProfileService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public ProfileDto get(String email) {
        return toDto(users.findByEmail(email).orElseThrow());
    }

    @Transactional
    public ProfileDto update(String email, ProfileUpdateRequest req) {
        User u = users.findByEmail(email).orElseThrow();
        u.setFullName(req.fullName().trim());
        String phone = req.phone() == null ? "" : req.phone().trim();
        u.setPhone(phone.isEmpty() ? null : phone);
        return toDto(u);
    }

    @Transactional
    public void changePassword(String email, PasswordChangeRequest req) {
        User u = users.findByEmail(email).orElseThrow();
        if (!encoder.matches(req.currentPassword(), u.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (encoder.matches(req.newPassword(), u.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different");
        }
        u.setPassword(encoder.encode(req.newPassword()));
    }

    private static ProfileDto toDto(User u) {
        return new ProfileDto(u.getFullName(), u.getEmail(), u.getPhone(), u.getAccountNumber(), u.getCreatedAt());
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

W "$b\controller\WalletController.java" @'
package com.arthix.backend.controller;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deposits")
public class WalletController {

    private final WalletService wallet;

    public WalletController(WalletService wallet) {
        this.wallet = wallet;
    }

    @PostMapping("/card")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionDto card(Authentication auth, @Valid @RequestBody DepositCardRequest req) {
        return wallet.depositCard(auth.getName(), req);
    }

    @GetMapping("/vouchers")
    public List<VoucherDto> vouchers(Authentication auth) {
        return wallet.vouchers(auth.getName());
    }

    @PostMapping("/vouchers")
    @ResponseStatus(HttpStatus.CREATED)
    public VoucherDto createVoucher(Authentication auth, @Valid @RequestBody VoucherRequest req) {
        return wallet.createVoucher(auth.getName(), req);
    }

    @PostMapping("/vouchers/{code}/redeem")
    public TransactionDto redeem(Authentication auth, @PathVariable String code) {
        return wallet.redeemVoucher(auth.getName(), code);
    }
}
'@

W "$b\controller\GoalController.java" @'
package com.arthix.backend.controller;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.service.GoalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService goals;

    public GoalController(GoalService goals) {
        this.goals = goals;
    }

    @GetMapping
    public List<GoalDto> list(Authentication auth) {
        return goals.list(auth.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GoalDto create(Authentication auth, @Valid @RequestBody GoalRequest req) {
        return goals.create(auth.getName(), req);
    }

    @PostMapping("/{id}/deposit")
    public GoalDto deposit(Authentication auth, @PathVariable Long id, @Valid @RequestBody GoalMoveRequest req) {
        return goals.deposit(auth.getName(), id, req.amount());
    }

    @PostMapping("/{id}/withdraw")
    public GoalDto withdraw(Authentication auth, @PathVariable Long id, @Valid @RequestBody GoalMoveRequest req) {
        return goals.withdraw(auth.getName(), id, req.amount());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication auth, @PathVariable Long id) {
        goals.delete(auth.getName(), id);
    }
}
'@

W "$b\controller\ProfileController.java" @'
package com.arthix.backend.controller;

import com.arthix.backend.dto.BankDtos.*;
import com.arthix.backend.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profile;

    public ProfileController(ProfileService profile) {
        this.profile = profile;
    }

    @GetMapping
    public ProfileDto get(Authentication auth) {
        return profile.get(auth.getName());
    }

    @PutMapping
    public ProfileDto update(Authentication auth, @Valid @RequestBody ProfileUpdateRequest req) {
        return profile.update(auth.getName(), req);
    }

    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void password(Authentication auth, @Valid @RequestBody PasswordChangeRequest req) {
        profile.changePassword(auth.getName(), req);
    }
}
'@

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
} else { Write-Host "  skip ApiExceptionHandler (existe deja)" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "== FRONTEND ==" -ForegroundColor Cyan

W "frontend\src\app\globals.css" @'
@import "tailwindcss";

:root {
  --bg: #02020a;
  --surface: rgba(255, 255, 255, 0.035);
  --surface-hover: rgba(255, 255, 255, 0.065);
  --line: rgba(255, 255, 255, 0.08);
  --text: #ebebf3;
  --muted: #8a8aa2;
  --accent: #7b6cf0;
  --accent-soft: rgba(123, 108, 240, 0.16);
  --ok: #4fd1a5;
  --err: #f0707a;
  --amber: #fbbf24;
  --sky: #38bdf8;
  --teal: #2dd4bf;
  --rose: #fb7185;
}

html { background: var(--bg); }

body {
  background: transparent;
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums;
}

/* planet arc */
body::before {
  content: "";
  position: fixed;
  z-index: -2;
  width: 160vmax;
  height: 160vmax;
  left: calc(96vw - 160vmax);
  top: calc(70vh - 80vmax);
  border-radius: 50%;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 78% 6%, rgba(70, 80, 200, 0.32), transparent 38%),
    radial-gradient(circle at 60% 60%, #03030a 0%, #03030a 55%, #0a0e2c 100%);
  box-shadow:
    inset -2px 2px 0 rgba(110, 120, 235, 0.22),
    inset 0 0 0 14px rgba(18, 22, 74, 0.35),
    inset 0 30px 140px rgba(60, 70, 190, 0.12);
}

/* star dust */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.6;
  background-image:
    radial-gradient(1px 1px at 20px 30px, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(1px 1px at 90px 80px, rgba(255, 255, 255, 0.55), transparent),
    radial-gradient(1.3px 1.3px at 170px 40px, rgba(180, 170, 255, 0.7), transparent);
  background-size: 190px 120px, 310px 170px, 250px 210px;
  -webkit-mask-image: linear-gradient(165deg, #000 0%, transparent 32%);
  mask-image: linear-gradient(165deg, #000 0%, transparent 32%);
}

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  backdrop-filter: blur(6px);
}
.card-hover { transition: background 0.2s, border-color 0.2s, transform 0.25s, box-shadow 0.25s; }
.card-hover:hover {
  background: var(--surface-hover);
  border-color: rgba(255, 255, 255, 0.16);
  transform: translateY(-3px);
  box-shadow: 0 14px 40px -16px var(--c, rgba(123, 108, 240, 0.55));
}

/* hero balance card */
.glow-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(140, 125, 255, 0.28);
  background: linear-gradient(155deg, rgba(123, 108, 240, 0.2), rgba(45, 212, 191, 0.05) 62%, rgba(255, 255, 255, 0.02));
}
.glow-card::before {
  content: "";
  position: absolute;
  width: 360px;
  height: 360px;
  right: -120px;
  top: -170px;
  background: radial-gradient(circle, rgba(123, 108, 240, 0.4), transparent 65%);
  animation: drift 9s ease-in-out infinite alternate;
  pointer-events: none;
}
.glow-card > * { position: relative; }
@keyframes drift { to { transform: translate(-50px, 36px) scale(1.18); } }

.label {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.7rem 0.9rem;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.input::placeholder { color: #5f5f78; }
select.input option { background: #0d0d18; }
input[type="range"] { width: 100%; accent-color: var(--accent); cursor: pointer; }
input[type="date"] { color-scheme: dark; }

.btn {
  border-radius: 10px;
  padding: 0.7rem 1.1rem;
  font-weight: 500;
  font-size: 14px;
  transition: transform 0.15s, background 0.2s, opacity 0.2s, box-shadow 0.2s;
}
.btn:active { transform: scale(0.98); }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: #8d80f5; box-shadow: 0 8px 28px -10px rgba(123, 108, 240, 0.9); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.btn-ghost { border: 1px solid var(--line); color: var(--text); }
.btn-ghost:hover { background: var(--surface-hover); }
.btn-ghost:disabled { opacity: 0.45; cursor: not-allowed; }

.chip {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 12px;
  color: var(--muted);
  transition: all 0.2s;
}
.chip:hover { color: #fff; border-color: rgba(255, 255, 255, 0.2); }
.chip-active { color: #fff; border-color: var(--accent); background: var(--accent-soft); }

.badge {
  display: inline-block;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.logo-glow { filter: drop-shadow(0 0 14px rgba(123, 108, 240, 0.5)); }

/* motion */
@keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.rise { animation: rise 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) both; animation-delay: calc(var(--i, 0) * 70ms); }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
.overlay { animation: fade 0.2s both; }
.fade-in { animation: fade 1.2s 0.4s both; }
@keyframes pop { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.check-circle { stroke-dasharray: 160; stroke-dashoffset: 160; animation: draw 0.6s 0.1s ease forwards; }
.check-mark { stroke-dasharray: 40; stroke-dashoffset: 40; animation: draw 0.4s 0.55s ease forwards; }
.draw-line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.4s 0.2s ease forwards; }
@keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.bar {
  transform-origin: bottom;
  background: linear-gradient(180deg, #8b7cf6, rgba(45, 212, 191, 0.7));
  animation: grow 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  animation-delay: calc(var(--i, 0) * 70ms);
}
@keyframes seg { from { stroke-dasharray: 0 999; } }
.donut-seg { animation: seg 1s cubic-bezier(0.2, 0.7, 0.2, 1) both; animation-delay: calc(var(--i, 0) * 120ms); }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.float { animation: float 6s ease-in-out infinite; }
@keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}
@keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(79, 209, 165, 0.5); } 100% { box-shadow: 0 0 0 14px rgba(79, 209, 165, 0); } }
.pulse-ok { animation: pulse-ring 1.8s ease-out infinite; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* print / save as PDF: receipt only */
@media print {
  body::before, body::after { display: none; }
  body * { visibility: hidden; }
  #receipt, #receipt * { visibility: visible; }
  #receipt {
    position: fixed; inset: 0; margin: 0; padding: 48px;
    background: #fff !important; color: #111 !important;
    border: none !important; border-radius: 0 !important;
  }
  #receipt .label, #receipt .muted { color: #555 !important; }
  .no-print { display: none !important; }
}
'@

W "frontend\src\lib\format.ts" @'
import type { CSSProperties } from "react";

export const money = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

export const plain = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

export const dateOnly = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long" });

export const delay = (i: number) => ({ "--i": i }) as CSSProperties;

const INCOMING = ["TRANSFER_IN", "DEPOSIT", "SAVINGS_IN"];
export const isIncoming = (type: string) => INCOMING.includes(type);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
'@

W "frontend\src\lib\api.ts" @'
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
'@

W "frontend\src\lib\analytics.ts" @'
import type { Transaction } from "./api";

export const isSpend = (t: Transaction) => t.type === "PAYMENT" || t.type === "TRANSFER_OUT";

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  BILLS: { label: "Bills", color: "#fbbf24" },
  SCHOOLS: { label: "Schools", color: "#38bdf8" },
  TRANSFER: { label: "Transfers", color: "#8b7cf6" },
};

export const TYPE_META: Record<string, { color: string; icon: "receipt" | "send" | "plus" | "target" }> = {
  PAYMENT: { color: "#fbbf24", icon: "receipt" },
  TRANSFER_OUT: { color: "#8b7cf6", icon: "send" },
  TRANSFER_IN: { color: "#8b7cf6", icon: "send" },
  DEPOSIT: { color: "#4fd1a5", icon: "plus" },
  SAVINGS_OUT: { color: "#2dd4bf", icon: "target" },
  SAVINGS_IN: { color: "#2dd4bf", icon: "target" },
};

export function byCategory(txs: Transaction[]) {
  const sums: Record<string, number> = {};
  for (const t of txs.filter(isSpend)) sums[t.category] = (sums[t.category] ?? 0) + t.amount;
  return Object.entries(sums)
    .map(([key, value]) => ({
      key,
      value,
      label: CATEGORY_META[key]?.label ?? key,
      color: CATEGORY_META[key]?.color ?? "#8a8aa2",
    }))
    .sort((a, b) => b.value - a.value);
}

export function last7Days(txs: Transaction[]) {
  const days: { key: string; label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toDateString(),
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      value: 0,
    });
  }
  for (const t of txs.filter(isSpend)) {
    const slot = days.find((d) => d.key === new Date(t.createdAt).toDateString());
    if (slot) slot.value += t.amount;
  }
  return days;
}

export function balanceSeries(txs: Transaction[]) {
  return txs
    .slice(0, 20)
    .reverse()
    .map((t) => t.balanceAfter);
}
'@

W "frontend\src\components\Icon.tsx" @'
const paths = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10",
  plus: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8v8M8 12h8",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 12h.01",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  gift: "M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H8a2.5 2.5 0 1 1 0-5c2.5 0 4 5 4 5Zm0 0h4a2.5 2.5 0 1 0 0-5c-2.5 0-4 5-4 5Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  logout: "M9 21H5V3h4M16 17l5-5-5-5M21 12H9",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z",
  card: "M3 6h18v12H3zM3 10h18",
  copy: "M9 9h11v11H9zM5 15V5h10",
  check: "M5 12.5 10 17.5 19 7",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  swap: "M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  arrow: "M5 12h14M13 6l6 6-6 6",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
'@

W "frontend\src\components\Charts.tsx" @'
"use client";

import { useEffect, useId, useState } from "react";
import { delay, money } from "@/lib/format";

export function Sparkline({ values, color = "#8b7cf6" }: { values: number[]; color?: string }) {
  const rawId = useId();
  const id = "sp" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  const w = 300;
  const h = 80;
  const pad = 6;
  const pts = values.length > 1 ? values : [0, 0];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const xy = pts.map((v, i) => [
    (i / (pts.length - 1)) * w,
    h - pad - ((v - min) / span) * (h - pad * 2),
  ]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} className="fade-in" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="draw-line"
      />
    </svg>
  );
}

export function Bars({
  data,
  format = money,
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-44 items-end gap-2 sm:gap-3">
      {data.map((d, i) => (
        <div key={d.label + i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="bar w-full rounded-t-md"
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1.5)}%`, ...delay(i) }}
              title={format(d.value)}
            />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({
  segments,
  size = 160,
  children,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  children?: React.ReactNode;
}) {
  const r = 40;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (s.value / total) * C;
            const el = (
              <circle
                key={i}
                className="donut-seg"
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="10"
                strokeDasharray={`${Math.max(len - 1.5, 0)} ${C}`}
                strokeDashoffset={-acc}
                style={delay(i)}
              />
            );
            acc += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Ring({
  value,
  size = 96,
  stroke = 8,
  color = "#8b7cf6",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const target = Math.min(Math.max(value, 0), 1);
  const [p, setP] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setP(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - p)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2, 0.7, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
'@

W "frontend\src\components\AppShell.tsx" @'
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
'@

W "frontend\src\components\AuthForm.tsx" @'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Brand } from "@/components/AppShell";
import Icon, { type IconName } from "@/components/Icon";
import { delay } from "@/lib/format";

const perks: { icon: IconName; title: string; text: string }[] = [
  { icon: "send", title: "Instant transfers", text: "Send money to any Arthix account in a second, free of charge." },
  { icon: "target", title: "Savings goals", text: "Set a target, track your progress and watch it grow." },
  { icon: "shield", title: "Secure by design", text: "Protected sessions, limits and a receipt for every operation." },
];

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = isSignup
        ? await api.signup(form)
        : await api.login({ email: form.email, password: form.password });
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-center px-16 lg:flex">
        <div className="rise float w-fit">
          <Brand size={84} />
        </div>
        <h2 className="rise mt-10 max-w-md text-4xl font-semibold leading-tight tracking-tight" style={delay(1)}>
          Banking that moves at your speed.
        </h2>
        <ul className="mt-10 space-y-6">
          {perks.map((p, i) => (
            <li key={p.title} className="rise flex max-w-md gap-4" style={delay(i + 2)}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[#a79cff]">
                <Icon name={p.icon} size={18} />
              </span>
              <div>
                <p className="text-sm font-medium">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-center justify-center p-5">
        <form onSubmit={onSubmit} className="rise card w-full max-w-sm space-y-5 p-8">
          <div className="flex justify-center lg:hidden">
            <Brand size={64} stacked />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isSignup ? "Open your account" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isSignup ? "It takes less than a minute." : "Sign in to your Arthix account."}
            </p>
          </div>

          {isSignup && (
            <input
              className="input"
              placeholder="Full name"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          )}
          <input
            className="input"
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div className="relative">
            <input
              className="input pr-16"
              type={show ? "text" : "password"}
              placeholder="Password (min 8 characters)"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-white"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>

          {error && <p className="text-sm text-[var(--err)]">{error}</p>}

          <button disabled={loading} className="btn btn-primary w-full">
            {loading ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
          </button>

          <p className="text-center text-sm text-[var(--muted)]">
            {isSignup ? "Already a client? " : "New here? "}
            <Link className="text-white underline-offset-4 hover:underline" href={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Sign in" : "Open an account"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
'@

W "frontend\src\components\CountUp.tsx" @'
"use client";

import { useEffect, useState } from "react";

export default function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
}
'@

W "frontend\src\components\Receipt.tsx" @'
"use client";

import { useEffect } from "react";
import type { Transaction } from "@/lib/api";
import { dateTime, isIncoming, money } from "@/lib/format";

const META: Record<string, { title: string; kind: string }> = {
  PAYMENT: { title: "Payment confirmed", kind: "Bill / school payment" },
  TRANSFER_OUT: { title: "Transfer sent", kind: "Account transfer" },
  TRANSFER_IN: { title: "Transfer received", kind: "Account transfer" },
  DEPOSIT: { title: "Deposit completed", kind: "Account top-up" },
  SAVINGS_OUT: { title: "Moved to savings", kind: "Savings goal" },
  SAVINGS_IN: { title: "Moved from savings", kind: "Savings goal" },
};

export default function Receipt({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const incoming = isIncoming(tx.type);
  const isTransfer = tx.type.startsWith("TRANSFER");
  const meta = META[tx.type] ?? META.PAYMENT;

  const rows: { k: string; v: string; sub?: string }[] = [
    { k: "Receipt no.", v: tx.receiptNo },
    { k: "Date", v: dateTime(tx.createdAt) },
    { k: "Type", v: meta.kind },
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
          <p className="label mt-4">{meta.title}</p>
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
                {r.sub && (
                  <span className="muted block text-xs font-normal tracking-wide text-[var(--muted)]">{r.sub}</span>
                )}
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
import { TYPE_META } from "@/lib/analytics";
import Icon from "@/components/Icon";
import { dateTime, delay, isIncoming, money } from "@/lib/format";

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
        const incoming = isIncoming(t.type);
        const meta = TYPE_META[t.type] ?? TYPE_META.PAYMENT;
        return (
          <li key={t.id} className="rise" style={delay(Math.min(i, 8))}>
            <button
              onClick={() => onSelect?.(t)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[var(--surface-hover)]"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: meta.color + "22", color: meta.color }}
              >
                <Icon name={meta.icon} size={17} />
              </span>
              <div className="min-w-0 flex-1">
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

W "frontend\src\app\dashboard\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Bars, Donut, Sparkline } from "@/components/Charts";
import CountUp from "@/components/CountUp";
import Icon, { type IconName } from "@/components/Icon";
import Receipt from "@/components/Receipt";
import TransactionList from "@/components/TransactionList";
import { api, Goal, Me, Transaction } from "@/lib/api";
import { balanceSeries, byCategory, isSpend, last7Days } from "@/lib/analytics";
import { delay, money } from "@/lib/format";

const actions: { href: string; label: string; icon: IconName; color: string }[] = [
  { href: "/deposit", label: "Add money", icon: "plus", color: "#4fd1a5" },
  { href: "/transfers", label: "Send money", icon: "send", color: "#8b7cf6" },
  { href: "/payments", label: "Pay a bill", icon: "receipt", color: "#fbbf24" },
  { href: "/goals", label: "Save", icon: "target", color: "#2dd4bf" },
];

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.transactions().then(setTxs).catch(() => {});
    api.goals().then(setGoals).catch(() => {});
  }, []);

  const spent = txs.filter(isSpend).reduce((s, t) => s + t.amount, 0);
  const received = txs
    .filter((t) => t.type === "DEPOSIT" || t.type === "TRANSFER_IN")
    .reduce((s, t) => s + t.amount, 0);
  const saved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const cats = byCategory(txs);
  const days = last7Days(txs);
  const series = balanceSeries(txs);

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

        <section className="glow-card rise p-7" style={delay(1)}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label">Available balance</p>
              <p className="mt-3 text-5xl font-semibold tracking-tight">
                {me ? <CountUp value={me.balance} /> : "0,00"}
                <span className="ml-2 text-lg font-normal text-[var(--muted)]">MAD</span>
              </p>
            </div>
            <div className="w-full max-w-[240px] sm:w-56">
              <p className="label mb-1">Balance trend</p>
              <Sparkline values={series} />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
            <div>
              <p className="label">Account number</p>
              <p className="mt-1 font-medium tracking-wide">{me?.accountNumber ?? "-"}</p>
            </div>
            <button onClick={copy} className="btn btn-ghost flex items-center gap-2 !py-1.5 text-xs">
              <Icon name={copied ? "check" : "copy"} size={14} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map((a, i) => (
            <Link
              key={a.href}
              href={a.href}
              className="rise card card-hover flex flex-col items-start gap-3 p-4"
              style={{ ...delay(i + 2), ["--c" as string]: a.color + "88" }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: a.color + "22", color: a.color }}
              >
                <Icon name={a.icon} size={19} />
              </span>
              <span className="text-sm font-medium">{a.label}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rise card p-5" style={delay(6)}>
            <p className="label">Spent</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--amber)]">{money(spent)}</p>
          </div>
          <div className="rise card p-5" style={delay(7)}>
            <p className="label">Received</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--ok)]">{money(received)}</p>
          </div>
          <div className="rise card p-5" style={delay(8)}>
            <p className="label">In savings goals</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--teal)]">{money(saved)}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <section className="rise card p-6 lg:col-span-3" style={delay(9)}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-medium">Spending, last 7 days</h2>
              <span className="label">MAD</span>
            </div>
            <Bars data={days} />
          </section>

          <section className="rise card p-6 lg:col-span-2" style={delay(10)}>
            <h2 className="mb-5 text-sm font-medium">Where your money goes</h2>
            {cats.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--muted)]">No spending yet.</p>
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
                <Donut segments={cats} size={150}>
                  <span className="label">Total</span>
                  <span className="mt-0.5 text-sm font-semibold">{money(spent)}</span>
                </Donut>
                <ul className="w-full space-y-2.5 text-sm">
                  {cats.map((c) => (
                    <li key={c.key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-[var(--muted)]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                        {c.label}
                      </span>
                      <span className="font-medium">{Math.round((c.value / spent) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
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

W "frontend\src\app\deposit\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import Receipt from "@/components/Receipt";
import { api, Transaction, Voucher } from "@/lib/api";
import { dateTime, delay, money } from "@/lib/format";

const QUICK = [100, 500, 1000, 5000];

const fmtNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})(?=.)/g, "$1 ");
const fmtExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
};

function luhn(d: string) {
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const brandOf = (d: string) => (d.startsWith("4") ? "VISA" : /^(5|2)/.test(d) ? "MASTERCARD" : "CARD");

function CardPreview({ number, holder, expiry }: { number: string; holder: string; expiry: string }) {
  const digits = number.replace(/\D/g, "");
  const shown = digits.padEnd(16, "\u2022").replace(/(.{4})(?=.)/g, "$1 ");
  return (
    <div
      className="float relative aspect-[1.586/1] w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 p-6"
      style={{ background: "linear-gradient(135deg, #3a2f9e 0%, #1b1550 55%, #0e2a3a 100%)" }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(139,124,246,0.55), transparent 65%)" }}
      />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-8 w-auto" />
          <span className="text-xs font-semibold tracking-[0.2em] text-white/80">{brandOf(digits)}</span>
        </div>
        <div>
          <div className="mb-4 h-7 w-10 rounded-md bg-gradient-to-br from-amber-200/90 to-amber-500/70" />
          <p className="text-xl tracking-[0.14em] text-white">{shown}</p>
        </div>
        <div className="flex items-end justify-between text-xs">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-white/50">Card holder</p>
            <p className="mt-0.5 text-sm uppercase tracking-wide text-white">{holder || "YOUR NAME"}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-white/50">Expires</p>
            <p className="mt-0.5 text-sm text-white">{expiry || "MM/YY"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusStyle(s: Voucher["status"]) {
  if (s === "PAID") return { background: "rgba(79,209,165,0.15)", color: "#4fd1a5" };
  if (s === "EXPIRED") return { background: "rgba(255,255,255,0.06)", color: "#8a8aa2" };
  return { background: "rgba(251,191,36,0.15)", color: "#fbbf24" };
}

export default function DepositPage() {
  const [tab, setTab] = useState<"card" | "voucher">("card");
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", cvc: "", amount: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [vAmount, setVAmount] = useState("");
  const [vError, setVError] = useState("");
  const [vLoading, setVLoading] = useState(false);
  const [busyCode, setBusyCode] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const loadVouchers = () => api.vouchers().then(setVouchers).catch(() => {});
  useEffect(() => {
    loadVouchers();
  }, []);

  const digits = card.number.replace(/\D/g, "");
  const cardOk = digits.length >= 13 && luhn(digits);
  const amount = Number(card.amount);
  const canPay = cardOk && /^\d{2}\/\d{2}$/.test(card.expiry) && card.cvc.length >= 3 && card.holder.trim() && amount >= 10;

  async function payCard(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const t = await api.depositCard({
        cardNumber: digits,
        expiry: card.expiry,
        cvc: card.cvc,
        holder: card.holder.trim(),
        amount,
      });
      setReceipt(t);
      setCard({ number: "", holder: "", expiry: "", cvc: "", amount: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function createVoucher(e: React.FormEvent) {
    e.preventDefault();
    setVError("");
    setVLoading(true);
    try {
      await api.createVoucher(Number(vAmount));
      setVAmount("");
      await loadVouchers();
    } catch (err) {
      setVError(err instanceof Error ? err.message : "Error");
    } finally {
      setVLoading(false);
    }
  }

  async function redeem(code: string) {
    setVError("");
    setBusyCode(code);
    try {
      const t = await api.redeemVoucher(code);
      setReceipt(t);
      await loadVouchers();
    } catch (err) {
      setVError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyCode("");
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 1500);
  }

  const hoursLeft = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 36e5));

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Add money</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Top up your account</h1>
      </div>

      <div className="rise mt-6 flex gap-2" style={delay(1)}>
        <button onClick={() => setTab("card")} className={`chip ${tab === "card" ? "chip-active" : ""}`}>
          Bank card
        </button>
        <button onClick={() => setTab("voucher")} className={`chip ${tab === "voucher" ? "chip-active" : ""}`}>
          Cash voucher
        </button>
      </div>

      {tab === "card" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="flex flex-col items-center gap-4 lg:col-span-2">
            <CardPreview number={card.number} holder={card.holder} expiry={card.expiry} />
            <p className="max-w-sm text-center text-xs leading-relaxed text-[var(--muted)]">
              Demo mode: use card <span className="text-white">4242 4242 4242 4242</span>, any future date and any
              3-digit code. The card is only validated, it is never stored.
            </p>
          </div>

          <form onSubmit={payCard} className="rise card space-y-5 p-6 lg:col-span-3" style={delay(2)}>
            <div>
              <label className="label">Card number</label>
              <div className="relative">
                <input
                  className="input mt-2 pr-10 tracking-wide"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: fmtNumber(e.target.value) })}
                />
                {cardOk && (
                  <span className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-[var(--ok)]">
                    <Icon name="check" size={16} />
                  </span>
                )}
              </div>
              {digits.length >= 13 && !cardOk && (
                <p className="mt-2 text-xs text-[var(--err)]">This card number looks invalid.</p>
              )}
            </div>
            <div>
              <label className="label">Name on card</label>
              <input
                className="input mt-2 uppercase"
                placeholder="MOHAMED A."
                maxLength={40}
                value={card.holder}
                onChange={(e) => setCard({ ...card, holder: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Expiry</label>
                <input
                  className="input mt-2"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: fmtExpiry(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Security code</label>
                <input
                  className="input mt-2"
                  inputMode="numeric"
                  type="password"
                  placeholder="CVC"
                  maxLength={4}
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") })}
                />
              </div>
            </div>
            <div>
              <label className="label">Amount (MAD)</label>
              <input
                className="input mt-2"
                type="number"
                min="10"
                max="20000"
                step="0.01"
                placeholder="0.00"
                value={card.amount}
                onChange={(e) => setCard({ ...card, amount: e.target.value })}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button type="button" key={q} onClick={() => setCard({ ...card, amount: String(q) })} className="chip">
                    +{q}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-[var(--err)]">{error}</p>}
            <button disabled={loading || !canPay} className="btn btn-primary w-full">
              {loading ? "Processing..." : amount >= 10 ? `Add ${money(amount)}` : "Add money"}
            </button>
            <p className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
              <Icon name="lock" size={13} /> Limit: 20 000 MAD per deposit, 50 000 MAD per day.
            </p>
          </form>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <form onSubmit={createVoucher} className="rise card h-fit space-y-5 p-6 lg:col-span-2" style={delay(2)}>
            <div>
              <p className="text-sm font-medium">Pay cash at an agency</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                Generate a voucher, give the code and the cash to any partner agency, and your balance is credited
                instantly. Valid for 48 hours.
              </p>
            </div>
            <div>
              <label className="label">Amount (MAD)</label>
              <input
                className="input mt-2"
                type="number"
                min="50"
                max="10000"
                step="0.01"
                placeholder="0.00"
                required
                value={vAmount}
                onChange={(e) => setVAmount(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {[200, 500, 1000, 2000].map((q) => (
                  <button type="button" key={q} onClick={() => setVAmount(String(q))} className="chip">
                    {q}
                  </button>
                ))}
              </div>
            </div>
            {vError && <p className="text-sm text-[var(--err)]">{vError}</p>}
            <button disabled={vLoading || !(Number(vAmount) >= 50)} className="btn btn-primary w-full">
              {vLoading ? "Generating..." : "Generate voucher"}
            </button>
          </form>

          <div className="space-y-3 lg:col-span-3">
            {vouchers.length === 0 && (
              <div className="card p-8 text-center text-sm text-[var(--muted)]">No vouchers yet.</div>
            )}
            {vouchers.map((v, i) => (
              <div key={v.code} className="rise card p-5" style={delay(Math.min(i, 6))}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-lg tracking-[0.18em]">{v.code}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Created {dateTime(v.createdAt)}
                      {v.status === "PENDING" && ` \u00b7 expires in ${hoursLeft(v.expiresAt)}h`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{money(v.amount)}</p>
                    <span className="badge mt-1" style={statusStyle(v.status)}>
                      {v.status}
                    </span>
                  </div>
                </div>
                {v.status === "PENDING" && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                    <button onClick={() => copyCode(v.code)} className="btn btn-ghost flex items-center gap-2 !py-1.5 text-xs">
                      <Icon name={copiedCode === v.code ? "check" : "copy"} size={13} />
                      {copiedCode === v.code ? "Copied" : "Copy code"}
                    </button>
                    <button
                      onClick={() => redeem(v.code)}
                      disabled={busyCode === v.code}
                      className="btn btn-primary !py-1.5 text-xs"
                    >
                      {busyCode === v.code ? "Processing..." : "Simulate agency payment (demo)"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {receipt && <Receipt tx={receipt} onClose={() => setReceipt(null)} />}
    </AppShell>
  );
}
'@

W "frontend\src\app\goals\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Ring } from "@/components/Charts";
import Icon from "@/components/Icon";
import { api, Goal } from "@/lib/api";
import { dateOnly, delay, money } from "@/lib/format";

const COLORS = ["#8b7cf6", "#2dd4bf", "#fbbf24", "#38bdf8", "#fb7185", "#4fd1a5"];

function GoalCard({ g, index, onChanged }: { g: Goal; index: number; onChanged: () => void }) {
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  const color = COLORS[g.id % COLORS.length];
  const pct = g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0;
  const done = pct >= 1;
  const remaining = Math.max(g.targetAmount - g.savedAmount, 0);
  const days = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 864e5) : null;
  const perMonth = days !== null && days > 0 && remaining > 0 ? remaining / Math.max(days / 30, 1) : null;

  async function move(kind: "deposit" | "withdraw") {
    const a = Number(amt);
    if (!(a > 0)) return;
    setErr("");
    setBusy(true);
    try {
      if (kind === "deposit") await api.goalDeposit(g.id, a);
      else await api.goalWithdraw(g.id, a);
      setAmt("");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDel) {
      setConfirmDel(true);
      setTimeout(() => setConfirmDel(false), 3000);
      return;
    }
    try {
      await api.deleteGoal(g.id);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="rise card card-hover p-6" style={{ ...delay(Math.min(index + 1, 6)), ["--c" as string]: color + "77" }}>
      <div className="flex items-center gap-5">
        <Ring value={pct} size={92} stroke={8} color={color}>
          <span className="text-sm font-semibold">{Math.min(Math.round(pct * 100), 100)}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{g.name}</h3>
            {done && (
              <span className="badge pulse-ok" style={{ background: "rgba(79,209,165,0.15)", color: "#4fd1a5" }}>
                Reached
              </span>
            )}
          </div>
          <p className="mt-1 text-sm">
            <span className="font-semibold" style={{ color }}>{money(g.savedAmount)}</span>
            <span className="text-[var(--muted)]"> of {money(g.targetAmount)}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {g.deadline
              ? days !== null && days > 0
                ? `${days} days left (${dateOnly(g.deadline)})`
                : `Deadline passed (${dateOnly(g.deadline)})`
              : "No deadline"}
          </p>
        </div>
      </div>

      {perMonth !== null && (
        <p className="mt-4 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-[var(--muted)]">
          <Icon name="bolt" size={12} /> Save about{" "}
          <span className="font-medium text-white">{money(perMonth)}</span> per month to get there on time.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <input
          className="input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
        />
        <button onClick={() => move("deposit")} disabled={busy || !(Number(amt) > 0)} className="btn btn-primary !px-4">
          Add
        </button>
        <button onClick={() => move("withdraw")} disabled={busy || !(Number(amt) > 0)} className="btn btn-ghost !px-4">
          Take
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-[var(--err)]">{err}</p>}

      <button
        onClick={remove}
        className={`mt-4 flex items-center gap-1.5 text-xs transition ${
          confirmDel ? "text-[var(--err)]" : "text-[var(--muted)] hover:text-white"
        }`}
      >
        <Icon name="trash" size={13} />
        {confirmDel ? "Click again to close (savings return to your balance)" : "Close goal"}
      </button>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [form, setForm] = useState({ name: "", target: "", deadline: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => api.goals().then(setGoals).catch(() => setGoals([]));
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.createGoal({
        name: form.name.trim(),
        targetAmount: Number(form.target),
        deadline: form.deadline || null,
      });
      setForm({ name: "", target: "", deadline: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const total = (goals ?? []).reduce((s, g) => s + g.savedAmount, 0);

  return (
    <AppShell>
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Savings goals</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Put money aside, on purpose</h1>
        </div>
        <div className="text-right">
          <p className="label">Total saved</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--teal)]">{money(total)}</p>
        </div>
      </div>

      <form onSubmit={create} className="rise card mt-8 p-6" style={delay(1)}>
        <p className="mb-4 text-sm font-medium">New goal</p>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="input md:col-span-2"
            placeholder="Laptop, trip, emergency fund..."
            maxLength={40}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            type="number"
            min="1"
            step="0.01"
            placeholder="Target (MAD)"
            required
            value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value })}
          />
          <input
            className="input"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
        </div>
        {error && <p className="mt-3 text-sm text-[var(--err)]">{error}</p>}
        <button disabled={loading} className="btn btn-primary mt-4">
          {loading ? "Creating..." : "Create goal"}
        </button>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {goals === null && (
          <>
            <div className="shimmer h-56 rounded-2xl" />
            <div className="shimmer h-56 rounded-2xl" />
          </>
        )}
        {goals?.length === 0 && (
          <div className="card p-10 text-center text-sm text-[var(--muted)] md:col-span-2">
            No goals yet. Create your first one above.
          </div>
        )}
        {goals?.map((g, i) => (
          <GoalCard key={g.id} g={g} index={i} onChanged={load} />
        ))}
      </div>
    </AppShell>
  );
}
'@

W "frontend\src\app\profile\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import { api, Profile } from "@/lib/api";
import { dateOnly, delay, initials } from "@/lib/format";

const strengthOf = (p: string) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
};
const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["#f0707a", "#f0707a", "#fbbf24", "#38bdf8", "#4fd1a5"];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .profile()
      .then((p) => {
        setProfile(p);
        setForm({ fullName: p.fullName, phone: p.phone ?? "" });
      })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const p = await api.updateProfile({ fullName: form.fullName.trim(), phone: form.phone.trim() });
      setProfile(p);
      setMsg({ ok: true, text: "Profile updated." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: "The two new passwords do not match." });
      return;
    }
    setPwBusy(true);
    try {
      await api.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ ok: true, text: "Password updated." });
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "Error" });
    } finally {
      setPwBusy(false);
    }
  }

  function copy() {
    if (!profile?.accountNumber) return;
    navigator.clipboard.writeText(profile.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const score = strengthOf(pw.next);

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Profile</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Profile & security</h1>
      </div>

      <section className="glow-card rise mt-8 p-7" style={delay(1)}>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#7b6cf0] to-[#2dd4bf] text-2xl font-semibold text-white">
            {profile ? initials(profile.fullName) : ""}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold">{profile?.fullName ?? " "}</p>
            <p className="mt-1 truncate text-sm text-[var(--muted)]">{profile?.email}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {profile ? `Client since ${dateOnly(profile.createdAt)}` : " "}
            </p>
          </div>
          <div className="text-right">
            <p className="label">Account number</p>
            <button onClick={copy} className="mt-1 flex items-center gap-2 text-sm font-medium tracking-wide hover:text-[#a79cff]">
              {profile?.accountNumber ?? "-"}
              <Icon name={copied ? "check" : "copy"} size={14} />
            </button>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form onSubmit={save} className="rise card space-y-5 p-6" style={delay(2)}>
          <p className="text-sm font-medium">Personal information</p>
          <div>
            <label className="label">Full name</label>
            <input
              className="input mt-2"
              required
              maxLength={80}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input mt-2 opacity-60" disabled value={profile?.email ?? ""} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input mt-2"
              placeholder="+212 6 00 00 00 00"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-[var(--ok)]" : "text-[var(--err)]"}`}>{msg.text}</p>}
          <button disabled={saving} className="btn btn-primary">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <form onSubmit={changePw} className="rise card space-y-5 p-6" style={delay(3)}>
          <p className="text-sm font-medium">Change password</p>
          <div>
            <label className="label">Current password</label>
            <input
              className="input mt-2"
              type="password"
              required
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              className="input mt-2"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
            {pw.next && (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((score + 1) / 5) * 100}%`,
                      background: STRENGTH_COLOR[score],
                      transition: "width 0.4s, background 0.4s",
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs" style={{ color: STRENGTH_COLOR[score] }}>
                  {STRENGTH_LABEL[score]}
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              className="input mt-2"
              type="password"
              required
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
          </div>
          {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-[var(--ok)]" : "text-[var(--err)]"}`}>{pwMsg.text}</p>}
          <button disabled={pwBusy} className="btn btn-primary">
            {pwBusy ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>

      <section className="rise card mt-4 p-6" style={delay(4)}>
        <p className="mb-4 text-sm font-medium">Security checklist</p>
        <ul className="grid gap-3 text-sm sm:grid-cols-3">
          {[
            { ok: true, text: "Email on file" },
            { ok: !!profile?.phone, text: "Phone number added" },
            { ok: true, text: "Session protected (token)" },
          ].map((c) => (
            <li key={c.text} className="flex items-center gap-3">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={
                  c.ok
                    ? { background: "rgba(79,209,165,0.15)", color: "#4fd1a5" }
                    : { background: "rgba(251,191,36,0.15)", color: "#fbbf24" }
                }
              >
                <Icon name={c.ok ? "check" : "shield"} size={13} />
              </span>
              <span className={c.ok ? "" : "text-[var(--muted)]"}>{c.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
'@

W "frontend\src\app\offers\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Bars, Donut } from "@/components/Charts";
import Icon, { type IconName } from "@/components/Icon";
import { api, Offer } from "@/lib/api";
import { delay, money, plain } from "@/lib/format";

type Tab = "loan" | "savings" | "exchange";

const STYLES: { icon: IconName; color: string }[] = [
  { icon: "card", color: "#8b7cf6" },
  { icon: "target", color: "#38bdf8" },
  { icon: "shield", color: "#2dd4bf" },
  { icon: "receipt", color: "#fbbf24" },
  { icon: "swap", color: "#fb7185" },
  { icon: "gift", color: "#4fd1a5" },
];

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="text-sm font-medium">{format(value)}</span>
      </div>
      <input
        type="range"
        className="mt-3"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Loan() {
  const [amount, setAmount] = useState(80000);
  const [months, setMonths] = useState(48);
  const [rate, setRate] = useState(5.2);

  const r = rate / 1200;
  const pmt = r === 0 ? amount / months : (amount * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const total = pmt * months;
  const interest = total - amount;

  const remaining: { label: string; value: number }[] = [];
  let bal = amount;
  for (let m = 1; m <= months; m++) {
    bal -= pmt - bal * r;
    if (m % 12 === 0 || m === months) {
      remaining.push({ label: m % 12 === 0 ? `Y${m / 12}` : `M${m}`, value: Math.max(bal, 0) });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">
        <Slider label="Loan amount" value={amount} min={5000} max={300000} step={1000} onChange={setAmount} format={(n) => money(n)} />
        <Slider label="Duration" value={months} min={6} max={84} step={6} onChange={setMonths} format={(n) => `${n} months`} />
        <Slider label="Interest rate" value={rate} min={2} max={12} step={0.1} onChange={setRate} format={(n) => `${n.toFixed(1)} %`} />
      </div>
      <div className="space-y-5 lg:col-span-3">
        <div className="flex flex-wrap items-center gap-6">
          <Donut
            size={140}
            segments={[
              { value: amount, color: "#8b7cf6" },
              { value: Math.max(interest, 0.01), color: "#fbbf24" },
            ]}
          >
            <span className="label">Monthly</span>
            <span className="mt-0.5 text-base font-semibold">{plain(pmt)}</span>
          </Donut>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8b7cf6]" />
              <dt className="w-28 text-[var(--muted)]">Borrowed</dt>
              <dd className="font-medium">{money(amount)}</dd>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
              <dt className="w-28 text-[var(--muted)]">Interest</dt>
              <dd className="font-medium">{money(interest)}</dd>
            </div>
            <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3">
              <span className="h-2.5 w-2.5" />
              <dt className="w-28 text-[var(--muted)]">Total to repay</dt>
              <dd className="font-semibold">{money(total)}</dd>
            </div>
          </dl>
        </div>
        <div>
          <p className="label mb-3">Remaining balance over time</p>
          <Bars data={remaining} />
        </div>
      </div>
    </div>
  );
}

function Savings() {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(1000);
  const [rate, setRate] = useState(3.5);
  const [years, setYears] = useState(5);

  const r = rate / 1200;
  const series: { label: string; value: number }[] = [];
  let bal = initial;
  for (let m = 1; m <= years * 12; m++) {
    bal = bal * (1 + r) + monthly;
    if (m % 12 === 0) series.push({ label: `Y${m / 12}`, value: bal });
  }
  const contributed = initial + monthly * years * 12;
  const gained = bal - contributed;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">
        <Slider label="Starting amount" value={initial} min={0} max={200000} step={1000} onChange={setInitial} format={(n) => money(n)} />
        <Slider label="Monthly deposit" value={monthly} min={0} max={20000} step={100} onChange={setMonthly} format={(n) => money(n)} />
        <Slider label="Yearly rate" value={rate} min={0.5} max={8} step={0.1} onChange={setRate} format={(n) => `${n.toFixed(1)} %`} />
        <Slider label="Duration" value={years} min={1} max={20} step={1} onChange={setYears} format={(n) => `${n} years`} />
      </div>
      <div className="space-y-5 lg:col-span-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="label">Final capital</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ok)]">{money(bal)}</p>
          </div>
          <div className="card p-4">
            <p className="label">You put in</p>
            <p className="mt-2 text-lg font-semibold">{money(contributed)}</p>
          </div>
          <div className="card p-4">
            <p className="label">Interest earned</p>
            <p className="mt-2 text-lg font-semibold text-[var(--amber)]">{money(gained)}</p>
          </div>
        </div>
        <div>
          <p className="label mb-3">Capital growth by year</p>
          <Bars data={series} />
        </div>
      </div>
    </div>
  );
}

const RATES: Record<string, number> = { MAD: 1, EUR: 0.092, USD: 0.1, GBP: 0.079, CHF: 0.088, AED: 0.367 };

function Exchange() {
  const [amount, setAmount] = useState(1000);
  const [from, setFrom] = useState("MAD");
  const [to, setTo] = useState("EUR");

  const convert = (code: string) => (amount / RATES[from]) * RATES[code];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-2">
        <div>
          <label className="label">Amount</label>
          <input
            className="input mt-2"
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label">From</label>
            <select className="input mt-2" value={from} onChange={(e) => setFrom(e.target.value)}>
              {Object.keys(RATES).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            className="btn btn-ghost !px-3"
            aria-label="Swap"
          >
            <Icon name="swap" size={16} />
          </button>
          <div className="flex-1">
            <label className="label">To</label>
            <select className="input mt-2" value={to} onChange={(e) => setTo(e.target.value)}>
              {Object.keys(RATES).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="glow-card p-5">
          <p className="label">You get</p>
          <p className="mt-2 text-3xl font-semibold">
            {convert(to).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
            <span className="ml-2 text-base font-normal text-[var(--muted)]">{to}</span>
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">Indicative demo rates, no real conversion is made.</p>
      </div>
      <div className="lg:col-span-3">
        <p className="label mb-3">
          {plain(amount)} {from} is worth
        </p>
        <ul className="card divide-y divide-[var(--line)]">
          {Object.keys(RATES)
            .filter((c) => c !== from)
            .map((c, i) => (
              <li key={c} className="rise flex items-center justify-between px-5 py-3.5 text-sm" style={delay(i)}>
                <span className="font-medium">{c}</span>
                <span>{convert(c).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tab, setTab] = useState<Tab>("loan");

  useEffect(() => {
    api.offers().then(setOffers).catch(() => {});
  }, []);

  function go(t: Tab) {
    setTab(t);
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <AppShell>
      <div className="rise">
        <p className="label">Arthix Banque</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Offers & tools</h1>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((o, i) => {
          const st = STYLES[i % STYLES.length];
          const t = o.title.toLowerCase();
          const tool: Tab | null = t.includes("credit") ? "loan" : t.includes("epargne") ? "savings" : t.includes("devise") ? "exchange" : null;
          const href = t.includes("paiement") || t.includes("cashback") ? "/payments" : t.includes("carte") ? "/deposit" : null;
          return (
            <div
              key={o.title}
              className="rise card card-hover flex flex-col p-6"
              style={{ ...delay(i + 1), ["--c" as string]: st.color + "88" }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: st.color + "22", color: st.color }}
              >
                <Icon name={st.icon} size={20} />
              </span>
              <h3 className="mt-4 font-medium">{o.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">{o.description}</p>
              {tool && (
                <button onClick={() => go(tool)} className="mt-4 flex items-center gap-2 text-sm transition hover:gap-3" style={{ color: st.color }}>
                  Try the simulator <Icon name="arrow" size={15} />
                </button>
              )}
              {href && (
                <Link href={href} className="mt-4 flex items-center gap-2 text-sm transition hover:gap-3" style={{ color: st.color }}>
                  Get started <Icon name="arrow" size={15} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <section id="tools" className="rise card mt-10 scroll-mt-6 p-6 sm:p-8" style={delay(8)}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Financial tools</h2>
          <div className="flex gap-2">
            {(
              [
                ["loan", "Loan simulator"],
                ["savings", "Savings projector"],
                ["exchange", "Currency exchange"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`chip ${tab === id ? "chip-active" : ""}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {tab === "loan" && <Loan />}
        {tab === "savings" && <Savings />}
        {tab === "exchange" && <Exchange />}
      </section>
    </AppShell>
  );
}
'@

W "frontend\src\app\transactions\page.tsx" @'
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import Receipt from "@/components/Receipt";
import TransactionList from "@/components/TransactionList";
import { api, Transaction } from "@/lib/api";
import { isIncoming } from "@/lib/format";

const filters = [
  { id: "ALL", label: "All" },
  { id: "DEPOSIT", label: "Deposits" },
  { id: "TRANSFER", label: "Transfers" },
  { id: "BILLS", label: "Bills" },
  { id: "SCHOOLS", label: "Schools" },
  { id: "SAVINGS", label: "Savings" },
];

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Transaction | null>(null);

  useEffect(() => {
    api.transactions().then(setTxs).catch(() => {});
  }, []);

  const q = query.trim().toLowerCase();
  const items = txs
    .filter((t) => filter === "ALL" || t.category === filter)
    .filter((t) => !q || (t.label + " " + t.reference + " " + t.receiptNo).toLowerCase().includes(q));

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Receipt", "Date", "Type", "Label", "Reference", "Amount", "Balance after"];
    const rows = items.map((t) =>
      [
        t.receiptNo,
        t.createdAt,
        t.type,
        t.label,
        t.reference,
        (isIncoming(t.type) ? "" : "-") + t.amount.toFixed(2),
        t.balanceAfter.toFixed(2),
      ]
        .map(esc)
        .join(",")
    );
    const blob = new Blob([[head.map(esc).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arthix-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">History</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Transactions</h1>
        </div>
        <button onClick={exportCsv} disabled={items.length === 0} className="btn btn-ghost flex items-center gap-2 text-xs">
          <Icon name="download" size={14} /> Export CSV
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? "chip-active" : ""}`}>
            {f.label}
          </button>
        ))}
        <input
          className="input ml-auto !w-full sm:!w-64"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-5">
        <TransactionList items={items} onSelect={setOpen} />
      </div>
      {open && <Receipt tx={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}
'@

Write-Host ""
Write-Host "Done" -ForegroundColor Green
